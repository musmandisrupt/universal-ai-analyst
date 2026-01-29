/**
 * TypeScript interfaces matching PRD Section 4: Data Structures & Schemas
 */

// ============================================================================
// Section 4.1: Schema Definition (Generated from CSV)
// ============================================================================

export interface ColumnMetadata {
  name: string;
  type: 'date' | 'number' | 'categorical' | 'boolean' | 'string';
  format?: string; // For dates: "YYYY-MM-DD", "MM/DD/YYYY", etc.
  isMetric: boolean; // true for numbers that can be aggregated
  // For numbers:
  min?: number;
  max?: number;
  avg?: number;
  isPercentage?: boolean; // true if max <= 100 AND name contains "rate", "percentage", "%"
  // For categoricals:
  uniqueValues?: string[];
  cardinality?: number;
  // For all types:
  sampleValues: (string | number | boolean)[];
}

export interface SchemaDefinition {
  sessionId: string;
  fileName: string;
  uploadedAt: string; // ISO 8601 timestamp
  rowCount: number;
  columns: ColumnMetadata[];
}

// ============================================================================
// Section 4.2: Intent Analysis Output
// ============================================================================

export interface SuggestedQuestion {
  question: string;
  expectedChartType: 'line' | 'bar' | 'pie' | 'scatter' | 'funnel' | 'table';
  metrics: string[];
  dimensions: string[];
  filters?: Record<string, string>;
  aggregation?: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
}

export interface IntentAnalysis {
  intent: 'single_chart' | 'multi_chart_dashboard';
  scope: number; // 1 = single chart, 2-7 = multi-chart dashboard
  confidence: number; // 0.0 to 1.0
  reasoning: string;
  suggestedQuestions: SuggestedQuestion[];
}

// ============================================================================
// Section 4.3: Visualization Configuration Schema
// ============================================================================

export interface VizConfig {
  id: string; // e.g., "viz_001"
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'funnel' | 'table' | 'metric_card';
  title: string;
  description?: string;
  xAxis?: {
    column: string;
    label?: string;
  };
  yAxis?: {
    column: string;
    label?: string;
    aggregation?: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
  };
  series?: {
    column: string;
    label?: string;
    aggregation?: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
  }[];
  filters?: Record<string, string | number | boolean>;
  groupBy?: string[]; // For multi-series charts
  sortBy?: {
    column: string;
    order: 'asc' | 'desc';
  };
  limit?: number; // For top N results
}

// ============================================================================
// Session & Chat Types
// ============================================================================

export interface SessionData {
  sessionId: string;
  fileName: string;
  uploadedAt: string;
  schema: SchemaDefinition;
  rawData: string[][]; // CSV rows as 2D array
  expiresAt: string; // ISO 8601 timestamp (24h from upload)
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO 8601 timestamp
  vizConfigs?: VizConfig[]; // If assistant message includes charts
}

// ============================================================================
// API Response Types
// ============================================================================

export interface UploadResponse {
  success: true;
  sessionId: string;
  schema: SchemaDefinition;
  preview: Record<string, string | number | boolean>[]; // First 5 rows as objects
}

export interface UploadErrorResponse {
  success: false;
  error: string;
  code: 'FILE_INVALID_TYPE' | 'FILE_TOO_LARGE' | 'FILE_PARSE_ERROR' | 'UNKNOWN_ERROR';
}
