import Bull from "bull";
import { orchestratorAgent } from "../ai/orchestrator";
import { GenerationProgressTracker } from "../utils/progressEmitter";
import { ProjectAssembler } from "../utils/projectAssembler";
import { storage } from "../storage";

/**
 * Generation Job Queue
 * Uses Bull with Redis to process long-running AI code generation
 * Handles job persistence, retries, progress tracking, and code assembly
 */

function createRedisConfig() {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    const parsedUrl = new URL(redisUrl);

    return {
      host: parsedUrl.hostname,
      port: Number(parsedUrl.port || 6379),
      username: parsedUrl.username || undefined,
      password: parsedUrl.password || undefined,
      db: parsedUrl.pathname ? Number(parsedUrl.pathname.replace("/", "")) || 0 : 0,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  }

  return {
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

export const generateQueue = new Bull("generation", {
  redis: createRedisConfig(),
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Remove completed jobs after 1 hour
    },
  },
});

/**
 * Process generation jobs
 */
generateQueue.process(async (job) => {
  const { projectId, projectName, specification } = job.data;
  let currentProgress = 0;

  console.log(`[Job ${job.id}] Starting generation for project: ${projectId}`);

  // Track progress for this job
  GenerationProgressTracker.startTracking(projectId);
  GenerationProgressTracker.emitProgress(projectId, {
    jobId: job.id,
    status: "processing",
    progress: 0,
    currentAgent: "Initializing",
    message: "Starting code generation...",
  });

  try {
    // Update job progress
    currentProgress = 10;
    job.progress(currentProgress);

    // Call orchestrator with progress callback
    const result = await orchestratorAgent(specification, (progress) => {
      // Update Bull job progress
      currentProgress = Math.min(progress.percentage || 0, 95);
      job.progress(currentProgress);

      // Emit to frontend via EventEmitter
      GenerationProgressTracker.emitProgress(projectId, {
        jobId: job.id,
        ...progress,
      });
    });

    if (!result.success) {
      throw new Error(`Code generation failed: ${result.errors?.join(", ")}`);
    }

    // ASSEMBLY PHASE: Assemble generated code into project files (95% -> 99%)
    console.log(`[Job ${job.id}] Starting project assembly...`);
    GenerationProgressTracker.emitProgress(projectId, {
      jobId: job.id,
      percentage: 96,
      currentAgent: "Assembly",
      message: "Assembling generated code into project structure...",
    });

    const assemblyResult = await ProjectAssembler.assembleProject(
      projectId,
      projectName,
      result.data
    );

    if (!assemblyResult.success) {
      throw new Error(`Project assembly failed: ${assemblyResult.errors.join(", ")}`);
    }

    // Update final progress
    job.progress(100);
    GenerationProgressTracker.emitProgress(projectId, {
      jobId: job.id,
      status: "completed",
      progress: 100,
      currentAgent: "Complete",
      message: "Code generation and assembly finished successfully!",
      projectPath: assemblyResult.projectPath,
      stats: assemblyResult.stats,
    });

    // Update project in database
    await storage.updateProject(projectId, {
      status: "generated",
      generatedCodePath: assemblyResult.projectPath,
      generationMetadata: {
        jobId: job.id,
        completedAt: new Date().toISOString(),
        stats: assemblyResult.stats,
        warnings: assemblyResult.warnings,
      },
    });

    console.log(`[Job ${job.id}] Generation and assembly completed successfully`);
    return {
      success: true,
      projectPath: assemblyResult.projectPath,
      stats: assemblyResult.stats,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Job ${job.id}] Generation failed:`, errorMessage);

    GenerationProgressTracker.emitProgress(projectId, {
      jobId: job.id,
      status: "failed",
      progress: currentProgress,
      message: `Generation failed: ${errorMessage}`,
      error: errorMessage,
    });

    // Update project status to failed
    await storage.updateProject(projectId, {
      status: "failed",
      generationMetadata: {
        jobId: job.id,
        failedAt: new Date().toISOString(),
        error: errorMessage,
      },
    });

    throw error;
  }
});

/**
 * Job event handlers
 */
generateQueue.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed successfully`);
});

generateQueue.on("failed", (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

generateQueue.on("active", (job) => {
  console.log(`⏳ Job ${job.id} started processing`);
});

/**
 * Add a generation job to the queue
 */
export async function queueGenerationJob(
  projectId: string,
  projectName: string,
  specification: any
): Promise<Bull.Job<any>> {
  console.log(`📋 Queuing generation job for project: ${projectId}`);

  const job = await generateQueue.add(
    {
      projectId,
      projectName,
      specification,
    },
    {
      jobId: `generation-${projectId}`,
      priority: 1,
    }
  );

  console.log(`✅ Job queued with ID: ${job.id}`);
  return job;
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<any> {
  const job = await generateQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = (job as any).progress || 0;
  const data = job.data;

  return {
    jobId: job.id,
    state,
    progress,
    data,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
  };
}

/**
 * Close the queue
 */
export async function closeQueue(): Promise<void> {
  await generateQueue.close();
}

export default generateQueue;
