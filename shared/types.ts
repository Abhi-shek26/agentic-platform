// User-facing specification for tournament website generation
export interface TournamentSpecification {
  // Basic Info
  tournamentName: string;
  tournamentDate: string; // ISO date format
  tournamentEndDate?: string;
  location: string;
  description: string;

  // Branding
  logoUrl?: string;
  colorScheme: ColorScheme;
  fontFamily?: string;

  // Pages to generate
  pages: PageConfig[];

  // Registration settings
  hasRegistration: boolean;
  registrationUrl?: string;
  registrationCap?: number;

  // Tournament Details
  sections: TournamentSection[];
  prizes?: Prize[];

  // Integrations
  integrations: IntegrationConfig[];

  // Customizations
  customizations: CustomizationOptions;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface PageConfig {
  name: string;
  type:
    | "home"
    | "info"
    | "schedule"
    | "players"
    | "pairings"
    | "prizes"
    | "venue"
    | "contact"
    | "register"
    | "custom";
  title: string;
  description?: string;
  content?: string;
}

export interface TournamentSection {
  id: string;
  name: string; // e.g., "Open", "Girls K-12"
  ageGroup?: string;
  timeControl?: string;
  startTime?: string;
  endTime?: string;
}

export interface Prize {
  placement: string;
  amount: number;
  description?: string;
}

export interface IntegrationConfig {
  type: "google_sheets" | "chess_register" | "custom_api";
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}

export interface CustomizationOptions {
  customLayout?: boolean;
  customStyling?: boolean;
  additionalFeatures?: string[];
  notes?: string;
}

// Generated project architecture design
export interface ArchitectureDesign {
  projectName: string;
  folderStructure: FolderNode;
  pages: PageDesign[];
  components: ComponentDesign[];
  database: DatabaseDesign;
  apiEndpoints: ApiEndpoint[];
  integrations: IntegrationSetup[];
}

export interface FolderNode {
  name: string;
  type: "folder" | "file";
  children?: FolderNode[];
}

export interface PageDesign {
  path: string;
  componentName: string;
  type: string;
  sections: Section[];
  dataNeeds?: string[];
}

export interface Section {
  id: string;
  name: string;
  type: string;
}

export interface ComponentDesign {
  name: string;
  path: string;
  props: Record<string, any>;
  dependencies: string[];
}

export interface DatabaseDesign {
  tables: TableDesign[];
  relationships: Relationship[];
}

export interface TableDesign {
  name: string;
  fields: Field[];
  indexes?: string[];
}

export interface Field {
  name: string;
  type: string;
  required: boolean;
  unique?: boolean;
}

export interface Relationship {
  from: string;
  to: string;
  type: "one-to-one" | "one-to-many" | "many-to-many";
}

export interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description?: string;
  requestSchema?: Record<string, any>;
  responseSchema?: Record<string, any>;
}

export interface IntegrationSetup {
  type: string;
  config: Record<string, any>;
  requiredEnvVars: string[];
}

// AI Agent types
export interface AgentInput {
  specification: TournamentSpecification;
  architecture?: ArchitectureDesign;
  previousResults?: Record<string, any>;
}

export interface AgentOutput {
  success: boolean;
  data: Record<string, any>;
  errors?: string[];
  warnings?: string[];
}

// Generation job tracking
export interface GenerationProgressUpdate {
  jobId: string;
  agent: string;
  progressPercentage: number;
  status: "processing" | "completed" | "failed";
  message: string;
  logs?: LogEntry[];
}

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  agent: string;
  message: string;
}

// File generation result
export interface GeneratedFile {
  path: string;
  content: string;
  type: "typescript" | "javascript" | "json" | "css" | "text";
}

export interface ProjectGenerationResult {
  success: boolean;
  projectId: string;
  files: GeneratedFile[];
  errors?: string[];
  metadata: {
    generationTime: number;
    agentsUsed: string[];
    timestamp: string;
  };
}
