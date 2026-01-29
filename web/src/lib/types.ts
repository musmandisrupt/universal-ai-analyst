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

// New IntentAnalysis structure for LLM (from Phase 2)
export interface IntentDimension {
  name: string;
  column: string;
  granularity?: 'day' | 'month' | 'year' | 'week'; // for dates only
}

export interface IntentMetric {
  name: string;
  column: string;
  aggregation: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
}

export interface IntentFilter {
  column: string;
  operator: '=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in';
  value: string | number | boolean;
}

export interface LLMIntentAnalysis {
  intentType: 'trend' | 'compare' | 'distribution' | 'correlation' | 'composition' | 'outliers' | 'forecast';
  dimensions: IntentDimension[];
  metrics: IntentMetric[];
  filters: IntentFilter[];
  confidence: number; // 0.0 to 1.0
  explanation: string;
}

// ============================================================================
// Section 4.3: Visualization Configuration Schema
// ============================================================================

export interface VizConfig {
  id: string; // e.g., "viz_001"
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'funnel' | 'table' | 'metric_card' | 'area' | 'combined';
  title: string;
  description?: string;
  dimensions: {
    x: {
      columnName: string;
      type: 'date' | 'categorical' | 'value';
      displayAs: string;
    };
  };
  metrics: {
    columnName: string;
    aggregation: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
    displayAs: string;
    format?: 'currency_usd' | 'percentage' | 'integer';
  }[];
  filters?: {
    columnName: string;
    operator: 'gte' | 'lte' | 'eq' | 'in' | 'not_in' | 'gt' | 'lt';
    value: string | number | boolean;
    type?: 'date' | 'number' | 'string' | 'categorical';
  };
  sorting?: {
    by: string;
    order: 'ascending' | 'descending';
  };
  limit?: number; // For top N results
  displaySettings?: {
    showLegend: boolean;
    showTooltip: boolean;
    responsive: boolean;
    colors?: string[];
  };
  metadata?: {
    createdAt: string;
    source: string;
    userPrompt: string;
    llmModel: string;
  };
}

// Chart Recommendation Type
export interface ChartRecommendation {
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'combined';
  relevanceScore: number; // 0.0 to 1.0
  reason: string;
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

export interface AnalyzeResponse {
  success: true;
  intentAnalysis: IntentAnalysis;
  vizConfigs: VizConfig[];
  metadata: {
    processingTime: number;
    model: string;
    tokensUsed?: number;
  };
}

export interface AnalyzeErrorResponse {
  success: false;
  error: string;
  suggestions?: string[];
}

export interface TransformResponse {
  success: true;
  processedData: {
    vizId: string;
    data: Record<string, any>[];
    metadata: {
      rowCount: number;
      transformations: string[];
      executedAt: string;
    };
  }[];
}

export interface TransformErrorResponse {
  success: false;
  error: string;
}
