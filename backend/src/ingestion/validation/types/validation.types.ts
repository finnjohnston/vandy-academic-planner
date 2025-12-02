/**
 * Result of a single validation check
 */
export interface ValidationResult {
  checkName: string;
  passed: number;
  failed: number;
  fixed: number;
  deleted: number;
  warnings: ValidationIssue[];
  errors: ValidationIssue[];
}

/**
 * Individual validation issue found
 */
export interface ValidationIssue {
  id: string;
  message: string;
  action: 'fixed' | 'deleted' | 'unlinked' | 'reported' | 'none';
  details?: Record<string, any>;
}

/**
 * Complete validation report
 */
export interface ValidationReport {
  timestamp: Date;
  environment: string;
  dryRun: boolean;
  results: ValidationResult[];
  summary: ValidationSummary;
}

/**
 * Summary statistics for validation run
 */
export interface ValidationSummary {
  totalChecks: number;
  totalPassed: number;
  totalFailed: number;
  totalFixed: number;
  totalDeleted: number;
  totalWarnings: number;
  totalErrors: number;
}

/**
 * Helper function to create an empty validation result
 */
export function createValidationResult(checkName: string): ValidationResult {
  return {
    checkName,
    passed: 0,
    failed: 0,
    fixed: 0,
    deleted: 0,
    warnings: [],
    errors: [],
  };
}
