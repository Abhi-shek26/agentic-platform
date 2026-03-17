import { User, InsertUser, Project, InsertProject } from "@shared/schema";

/**
 * Storage interface for database operations
 * Implementations: PostgreSQL via Drizzle, In-memory for testing
 */
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Project operations
  getProject(id: string): Promise<Project | undefined>;
  listProjects(organizationId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Organization operations
  getOrganization(id: string): Promise<any>;
  listUserOrganizations(userId: string): Promise<any[]>;
  createOrganization(org: any): Promise<any>;

  // Generation job tracking
  getGenerationJob(jobId: string): Promise<any>;
  createGenerationJob(job: any): Promise<any>;
  updateGenerationJob(jobId: string, updates: any): Promise<any>;
}

/**
 * In-memory storage implementation for development/testing
 */
export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private projects: Map<string, Project> = new Map();
  private organizations: Map<string, any> = new Map();
  private generationJobs: Map<string, any> = new Map();

  // ====== USER OPERATIONS ======

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) return user;
    }
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return undefined;
  }

  async createUser(userInput: InsertUser): Promise<User> {
    const user: User = {
      ...userInput,
      id: this.generateId(),
      subscriptionTier: "free",
      generationQuota: 5,
      generationUsed: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;

    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");

    const updated = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
  }

  // ====== PROJECT OPERATIONS ======

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async listProjects(organizationId: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      (p) => p.organizationId === organizationId
    );
  }

  async createProject(projectInput: InsertProject): Promise<Project> {
    const project: Project = {
      ...projectInput,
      id: this.generateId(),
      status: "draft",
      deploymentStatus: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Project;

    this.projects.set(project.id, project);
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const project = this.projects.get(id);
    if (!project) throw new Error("Project not found");

    const updated = { ...project, ...updates, updatedAt: new Date() };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    this.projects.delete(id);
  }

  // ====== ORGANIZATION OPERATIONS ======

  async getOrganization(id: string): Promise<any> {
    return this.organizations.get(id);
  }

  async listUserOrganizations(userId: string): Promise<any[]> {
    return Array.from(this.organizations.values()).filter(
      (o) => o.ownerId === userId
    );
  }

  async createOrganization(org: any): Promise<any> {
    const organization = {
      ...org,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.organizations.set(organization.id, organization);
    return organization;
  }

  // ====== GENERATION JOB OPERATIONS ======

  async getGenerationJob(jobId: string): Promise<any> {
    return this.generationJobs.get(jobId);
  }

  async createGenerationJob(job: any): Promise<any> {
    const generationJob = {
      ...job,
      id: this.generateId(),
      status: "queued",
      progressPercentage: 0,
      createdAt: new Date(),
    };

    this.generationJobs.set(generationJob.id, generationJob);
    return generationJob;
  }

  async updateGenerationJob(jobId: string, updates: any): Promise<any> {
    const job = this.generationJobs.get(jobId);
    if (!job) throw new Error("Generation job not found");

    const updated = { ...job, ...updates, updatedAt: new Date() };
    this.generationJobs.set(jobId, updated);
    return updated;
  }

  // ====== HELPER METHODS ======
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Default export with in-memory storage for development
export const storage = new MemStorage();
