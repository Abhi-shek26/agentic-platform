import { EventEmitter } from "events";

/**
 * Generation Progress Tracker
 * Tracks and emits progress events for generation jobs
 * Allows real-time updates to frontend via polling or WebSockets
 */

class GenerationProgressTracker {
  private static emitters = new Map<string, EventEmitter>();
  private static latestProgress = new Map<string, any>();

  /**
   * Start tracking progress for a generation job
   */
  static startTracking(jobId: string): void {
    if (!this.emitters.has(jobId)) {
      this.emitters.set(jobId, new EventEmitter());
      this.latestProgress.set(jobId, {
        status: "queued",
        progress: 0,
        message: "Waiting to start...",
      });
    }
  }

  /**
   * Emit progress update
   */
  static emitProgress(jobId: string, progress: any): void {
    if (!this.emitters.has(jobId)) {
      this.startTracking(jobId);
    }

    // Store latest progress for polling
    this.latestProgress.set(jobId, {
      ...this.latestProgress.get(jobId),
      ...progress,
      updatedAt: new Date().toISOString(),
    });

    // Emit event for WebSocket listeners
    const emitter = this.emitters.get(jobId)!;
    emitter.emit("progress", this.latestProgress.get(jobId));
  }

  /**
   * Get latest progress (for polling)
   */
  static getProgress(jobId: string): any {
    return this.latestProgress.get(jobId) || {
      status: "unknown",
      progress: 0,
      message: "No progress data",
    };
  }

  /**
   * Listen to progress events (for WebSocket)
   */
  static onProgress(jobId: string, callback: (progress: any) => void): () => void {
    if (!this.emitters.has(jobId)) {
      this.startTracking(jobId);
    }

    const emitter = this.emitters.get(jobId)!;
    emitter.on("progress", callback);

    // Return unsubscribe function
    return () => {
      emitter.removeListener("progress", callback);
    };
  }

  /**
   * Stop tracking a job
   */
  static stopTracking(jobId: string): void {
    const emitter = this.emitters.get(jobId);
    if (emitter) {
      emitter.removeAllListeners();
      this.emitters.delete(jobId);
    }
    this.latestProgress.delete(jobId);
  }

  /**
   * Get all tracked jobs
   */
  static getTrackedJobs(): string[] {
    return Array.from(this.emitters.keys());
  }
}

export { GenerationProgressTracker };
