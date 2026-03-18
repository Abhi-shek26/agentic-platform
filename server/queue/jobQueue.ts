import Bull from "bull";
import { orchestratorAgent } from "../ai/orchestrator";
import { GenerationProgressTracker } from "../utils/progressEmitter";

/**
 * Generation Job Queue
 * Uses Bull with Redis to process long-running AI code generation
 * Handles job persistence, retries, and progress tracking
 */

export const generateQueue = new Bull("generation", {
  redis: {
    host: "localhost",
    port: 6379,
  },
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
  const { projectId, specification } = job.data;

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
    job.progress(10);

    // Call orchestrator with progress callback
    const result = await orchestratorAgent(specification, (progress) => {
      // Update Bull job progress
      const percent = Math.min(progress.percentage || 0, 95);
      job.progress(percent);

      // Emit to frontend via EventEmitter
      GenerationProgressTracker.emitProgress(projectId, {
        jobId: job.id,
        ...progress,
      });
    });

    // Update final progress
    job.progress(100);
    GenerationProgressTracker.emitProgress(projectId, {
      jobId: job.id,
      status: "completed",
      progress: 100,
      currentAgent: "Complete",
      message: "Code generation finished successfully!",
    });

    console.log(`[Job ${job.id}] Generation completed`);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Job ${job.id}] Generation failed:`, errorMessage);

    GenerationProgressTracker.emitProgress(projectId, {
      jobId: job.id,
      status: "failed",
      progress: job.progress(),
      message: `Generation failed: ${errorMessage}`,
      error: errorMessage,
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
  specification: any
): Promise<Bull.Job<any>> {
  console.log(`📋 Queuing generation job for project: ${projectId}`);

  const job = await generateQueue.add(
    {
      projectId,
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
  const progress = job._progress;
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
