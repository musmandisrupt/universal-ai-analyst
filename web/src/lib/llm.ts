/**
 * LLM Intelligence Layer
 * Handles intent analysis, visualization recommendations, and config generation
 * Uses OpenAI API (can be swapped for Z.ai)
 */

import OpenAI from 'openai';
import {
  SchemaDefinition,
  LLMIntentAnalysis,
  ChartRecommendation,
  VizConfig,
  IntentAnalysis,
  SuggestedQuestion,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai';

// Initialize OpenAI client
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

/**
 * Helper function to ensure OpenAI client is initialized
 */
function ensureOpenAI(): OpenAI {
  if (!openai) {
    throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
  }
  return openai;
}

// ============================================================================
// Intent Analysis (FR-04)
// ============================================================================

/**
 * Parse user prompt and generate IntentAnalysis using LLM
 * @param userPrompt - Natural language question from user
 * @param schema - SchemaDefinition from uploaded CSV
 * @returns IntentAnalysis with intent type, dimensions, metrics, filters, confidence
 */
export async function analyzeIntent(
  userPrompt: string,
  schema: SchemaDefinition
): Promise<LLMIntentAnalysis> {
  const client = ensureOpenAI();

  // Build system prompt
  const systemPrompt = buildIntentAnalysisPrompt(schema, userPrompt);

  try {
    const response = await client.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more deterministic output
      response_format: { type: 'json_object' }, // Force JSON output
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('LLM returned empty response');
    }

    // Parse JSON response
    const intentAnalysis = JSON.parse(content) as LLMIntentAnalysis;

    // Validate that all referenced columns exist in schema
    validateIntentColumns(intentAnalysis, schema);

    return intentAnalysis;
  } catch (error) {
    console.error('Error in analyzeIntent:', error);
    throw new Error(
      `Failed to analyze intent: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Build the system prompt for intent analysis
 */
function buildIntentAnalysisPrompt(
  schema: SchemaDefinition,
  userPrompt: string
): string {
  const schemaJson = JSON.stringify(schema, null, 2);

  return `You are an analytics intent parser. Your job is to understand what the user wants to analyze based on their natural language question.

CSV Schema (available columns):
${schemaJson}

User Question:
"${userPrompt}"

Analyze the user's question and determine:
1. What type of analysis they want (intent: trend, compare, distribution, correlation, composition, outliers, forecast)
2. Which columns they want to GROUP BY (dimensions)
3. Which columns they want to AGGREGATE (metrics)
4. What filters they might have implied

CRITICAL RULES:
- ONLY reference columns that exist in the schema above
- NEVER invent columns
- Be specific about aggregations (SUM, AVG, COUNT, MIN, MAX)
- Suggest time-based filtering when appropriate
- If you're uncertain, include a lower confidence score

Return ONLY valid JSON, no explanation or markdown:

{
  "intentType": "trend|compare|distribution|correlation|composition|outliers|forecast",
  "dimensions": [
    {
      "name": "column_name_from_schema",
      "column": "exact_column_name",
      "granularity": "day|month|year|week (for dates only)"
    }
  ],
  "metrics": [
    {
      "name": "metric_name",
      "column": "exact_column_name",
      "aggregation": "SUM|AVG|COUNT|MIN|MAX"
    }
  ],
  "filters": [
    {
      "column": "exact_column_name",
      "operator": "=|>|<|>=|<=|in|not_in",
      "value": "filter_value"
    }
  ],
  "confidence": 0.0 to 1.0,
  "explanation": "Brief explanation of what you understood"
}`;
}

/**
 * Validate that all columns in intent analysis exist in schema
 */
function validateIntentColumns(
  intent: LLMIntentAnalysis,
  schema: SchemaDefinition
): void {
  const schemaColumns = new Set(schema.columns.map((col) => col.name));
  const errors: string[] = [];

  // Check dimensions
  for (const dim of intent.dimensions) {
    if (!schemaColumns.has(dim.column)) {
      errors.push(`Dimension column "${dim.column}" not found in schema`);
    }
  }

  // Check metrics
  for (const metric of intent.metrics) {
    if (!schemaColumns.has(metric.column)) {
      errors.push(`Metric column "${metric.column}" not found in schema`);
    }
  }

  // Check filters
  for (const filter of intent.filters) {
    if (!schemaColumns.has(filter.column)) {
      errors.push(`Filter column "${filter.column}" not found in schema`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`LLM hallucinated columns: ${errors.join(', ')}`);
  }
}

// ============================================================================
// Visualization Recommendation (FR-05)
// ============================================================================

/**
 * Recommend chart types based on intent analysis
 * @param intent - LLMIntentAnalysis from analyzeIntent
 * @param schema - SchemaDefinition from uploaded CSV
 * @returns Array of ChartRecommendation with relevance scores
 */
export function recommendVisualizations(
  intent: LLMIntentAnalysis,
  schema: SchemaDefinition
): ChartRecommendation[] {
  const recommendations: ChartRecommendation[] = [];

  // Map intent type to recommended chart types
  const chartTypeMap: Record<string, string[]> = {
    trend: ['line', 'area', 'bar'],
    compare: ['bar', 'scatter', 'heatmap'],
    distribution: ['histogram', 'box', 'pie'],
    composition: ['pie', 'bar'],
    correlation: ['scatter', 'heatmap'],
    outliers: ['box', 'scatter'],
    forecast: ['line', 'area'],
  };

  const possibleTypes = chartTypeMap[intent.intentType] || ['bar'];

  // For each chart type, validate against schema and score relevance
  for (const chartType of possibleTypes) {
    const relevance = calculateRelevance(chartType, intent, schema);
    if (relevance > 0) {
      recommendations.push({
        chartType: chartType as any,
        relevanceScore: relevance,
        reason: getRecommendationReason(chartType, intent),
      });
    }
  }

  // Sort by relevance score (highest first)
  recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Return top 5 recommendations
  return recommendations.slice(0, 5);
}

/**
 * Calculate relevance score for a chart type
 * Returns 0.0 to 1.0
 */
function calculateRelevance(
  chartType: string,
  intent: LLMIntentAnalysis,
  schema: SchemaDefinition
): number {
  let score = 0.5; // Base score

  // Check if chart type is compatible with data
  const hasDateColumn = schema.columns.some((col) => col.type === 'date');
  const hasMetricColumn = schema.columns.some((col) => col.isMetric);
  const hasCategoricalColumn = schema.columns.some((col) => col.type === 'categorical');

  // Line/Area charts work best with time series
  if ((chartType === 'line' || chartType === 'area') && hasDateColumn) {
    score += 0.3;
  }

  // Bar charts work well with categorical data
  if (chartType === 'bar' && hasCategoricalColumn) {
    score += 0.2;
  }

  // Pie charts work best with low cardinality categorical
  if (chartType === 'pie' && hasCategoricalColumn) {
    const lowCardinalityCols = schema.columns.filter(
      (col) => col.type === 'categorical' && (col.cardinality || 0) <= 10
    );
    if (lowCardinalityCols.length > 0) {
      score += 0.2;
    }
  }

  // Scatter charts need at least 2 numeric columns
  if (chartType === 'scatter') {
    const numericCols = schema.columns.filter((col) => col.type === 'number');
    if (numericCols.length >= 2) {
      score += 0.3;
    }
  }

  // Adjust based on confidence
  score *= intent.confidence;

  // Ensure score is between 0 and 1
  return Math.min(Math.max(score, 0), 1);
}

/**
 * Get human-readable reason for recommendation
 */
function getRecommendationReason(
  chartType: string,
  intent: LLMIntentAnalysis
): string {
  const reasons: Record<string, string> = {
    line: 'Best for showing trends over time',
    area: 'Good for showing volume trends with emphasis',
    bar: 'Ideal for comparing values across categories',
    pie: 'Great for showing composition/part-to-whole',
    scatter: 'Useful for showing correlation between metrics',
    histogram: 'Shows distribution of a single metric',
    box: 'Good for showing outliers and distribution',
    heatmap: 'Useful for comparing two dimensions',
  };

  return reasons[chartType] || 'Recommended based on your data';
}

// ============================================================================
// VizConfig Generation (FR-06)
// ============================================================================

/**
 * Generate complete VizConfig for each recommended chart
 * @param intent - LLMIntentAnalysis from analyzeIntent
 * @param recommendations - ChartRecommendation[] from recommendVisualizations
 * @param schema - SchemaDefinition from uploaded CSV
 * @returns Array of VizConfig with validation
 */
export async function generateVizConfigs(
  intent: LLMIntentAnalysis,
  recommendations: ChartRecommendation[],
  schema: SchemaDefinition
): Promise<VizConfig[]> {
  const client = ensureOpenAI();

  const vizConfigs: VizConfig[] = [];

  for (const recommendation of recommendations) {
    try {
      const config = await generateSingleVizConfig(
        intent,
        recommendation.chartType,
        schema
      );

      // Validate the generated config
      const validation = validateVizConfig(config, schema);
      if (!validation.valid) {
        console.warn(`Invalid VizConfig generated: ${validation.errors.join(', ')}`);
        continue; // Skip invalid configs
      }

      vizConfigs.push(config);
    } catch (error) {
      console.error(`Error generating VizConfig for ${recommendation.chartType}:`, error);
      // Continue with next recommendation
    }
  }

  return vizConfigs;
}

/**
 * Generate a single VizConfig using LLM
 */
async function generateSingleVizConfig(
  intent: LLMIntentAnalysis,
  chartType: string,
  schema: SchemaDefinition
): Promise<VizConfig> {
  const client = ensureOpenAI();

  const systemPrompt = buildVizConfigPrompt(intent, chartType, schema);

  const response = await client.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
    ],
    temperature: 0.2, // Lower temperature for consistent config
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('LLM returned empty response');
  }

  const config = JSON.parse(content) as VizConfig;

  // Add metadata
  config.metadata = {
    createdAt: new Date().toISOString(),
    source: 'llm_generated',
    userPrompt: intent.explanation,
    llmModel: LLM_MODEL,
  };

  return config;
}

/**
 * Build the system prompt for VizConfig generation
 */
function buildVizConfigPrompt(
  intent: LLMIntentAnalysis,
  chartType: string,
  schema: SchemaDefinition
): string {
  const schemaJson = JSON.stringify(schema, null, 2);
  const intentJson = JSON.stringify(intent, null, 2);

  return `You are an ECharts configuration generator. For each visualization the user wants, generate a complete ECharts configuration JSON.

CSV Schema:
${schemaJson}

User Intent:
${intentJson}

Recommended Chart Type: ${chartType}

Generate a complete ECharts configuration for a ${chartType} chart that:
1. Visualizes the user's intent
2. Uses ONLY columns from the schema
3. Includes all required fields: chartType, title, dimensions, metrics, filters, sorting

CRITICAL RULES:
- dimensions.x.columnName MUST exist in the schema
- metrics[].columnName MUST exist in the schema
- Do NOT invent columns
- Do NOT generate code - only JSON configuration
- Format numbers appropriately (currency, percentage, etc.)

Return ONLY valid JSON matching this schema:

{
  "id": "viz_XXX",
  "chartType": "${chartType}",
  "title": "Descriptive title",
  "description": "What this chart shows",
  "dimensions": {
    "x": {
      "columnName": "exact_column_from_schema",
      "type": "date|categorical|value",
      "displayAs": "Human readable name"
    }
  },
  "metrics": [
    {
      "columnName": "exact_column_from_schema",
      "aggregation": "SUM|AVG|COUNT|MIN|MAX",
      "displayAs": "Human readable name",
      "format": "currency_usd|percentage|integer"
    }
  ],
  "filters": {
    "columnName": "column_name",
    "operator": "gte|lte|eq|in|not_in",
    "value": "filter_value",
    "type": "date|number|string|categorical"
  },
  "sorting": {
    "by": "column_name",
    "order": "ascending|descending"
  },
  "displaySettings": {
    "showLegend": true,
    "showTooltip": true,
    "responsive": true
  }
}`;
}

/**
 * Validate VizConfig against schema
 * @returns { valid: boolean, errors: string[] }
 */
export function validateVizConfig(
  config: VizConfig,
  schema: SchemaDefinition
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const schemaColumns = new Set(schema.columns.map((col) => col.name));

  // Check chart type
  const validChartTypes = [
    'bar',
    'line',
    'pie',
    'scatter',
    'funnel',
    'table',
    'metric_card',
    'area',
    'combined',
  ];
  if (!validChartTypes.includes(config.chartType)) {
    errors.push(`Invalid chart type: ${config.chartType}`);
  }

  // Check dimensions
  if (config.dimensions?.x?.columnName) {
    if (!schemaColumns.has(config.dimensions.x.columnName)) {
      errors.push(`Dimension column "${config.dimensions.x.columnName}" not found in schema`);
    }
  }

  // Check metrics
  if (config.metrics && config.metrics.length > 0) {
    for (const metric of config.metrics) {
      if (!schemaColumns.has(metric.columnName)) {
        errors.push(`Metric column "${metric.columnName}" not found in schema`);
      }

      // Check aggregation
      const validAggregations = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'];
      if (!validAggregations.includes(metric.aggregation)) {
        errors.push(`Invalid aggregation: ${metric.aggregation}`);
      }
    }
  }

  // Check filters
  if (config.filters?.columnName) {
    if (!schemaColumns.has(config.filters.columnName)) {
      errors.push(`Filter column "${config.filters.columnName}" not found in schema`);
    }
  }

  // Check sorting
  if (config.sorting?.by) {
    if (!schemaColumns.has(config.sorting.by)) {
      errors.push(`Sort column "${config.sorting.by}" not found in schema`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Helper: Convert LLMIntentAnalysis to IntentAnalysis (for backward compatibility)
// ============================================================================

/**
 * Convert LLMIntentAnalysis to IntentAnalysis format
 * This maintains compatibility with existing code
 */
export function convertToIntentAnalysis(
  llmIntent: LLMIntentAnalysis
): IntentAnalysis {
  // Determine intent type
  let intent: 'single_chart' | 'multi_chart_dashboard';
  if (llmIntent.metrics.length > 1 || llmIntent.dimensions.length > 1) {
    intent = 'multi_chart_dashboard';
  } else {
    intent = 'single_chart';
  }

  // Determine scope
  const scope = Math.max(1, Math.min(llmIntent.metrics.length, 7));

  // Convert to suggested questions
  const suggestedQuestions: SuggestedQuestion[] = [];
  for (const metric of llmIntent.metrics) {
    for (const dimension of llmIntent.dimensions) {
      suggestedQuestions.push({
        question: `Show ${metric.name} by ${dimension.name}`,
        expectedChartType: 'bar', // Default, will be refined
        metrics: [metric.column],
        dimensions: [dimension.column],
        aggregation: metric.aggregation,
      });
    }
  }

  return {
    intent,
    scope,
    confidence: llmIntent.confidence,
    reasoning: llmIntent.explanation,
    suggestedQuestions,
  };
}
