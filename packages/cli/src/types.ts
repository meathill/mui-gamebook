export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: IssueSeverity;
  sceneId?: string;
  code: string;
  message: string;
}

export interface ValidationStats {
  scenesCount: number;
  endingsCount: number;
  variablesCount: number;
  choicesCount: number;
  maxBranchDepth: number;
}

export interface ValidationReport {
  valid: boolean;
  filePath: string;
  gameTitle?: string;
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  stats: ValidationStats;
}

export interface CliConfig {
  apiKey?: string;
  endpoint?: string;
}
