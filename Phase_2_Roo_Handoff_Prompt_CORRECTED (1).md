# Phase 2 Handoff Prompt for Roo
## LLM Intelligence & Dynamic Visualization Engine

**Status:** Phase 1 (Data Ingestion) Complete ✅  
**Date:** January 29, 2026  
**For:** Roo Coding Assistant  
**Repository:** https://github.com/musmandisrupt/universal-ai-analyst  

---

## Executive Summary

Phase 1 (Cursor) delivered a production-ready CSV data ingestion pipeline with intelligent schema introspection. The system successfully:
- ✅ Parses CSV files (50MB max)
- ✅ Detects column types (date, number, categorical, boolean, string)
- ✅ Generates SchemaDefinition JSON matching PRD spec 4.1
- ✅ Provides sample data preview

**Phase 2 (Roo) focuses on building the LLM Intelligence Layer:**
- Parse natural language user prompts → structured intent
- Recommend 3-5 relevant chart types based on schema
- Generate visualization configurations that are validated against schema
- Transform raw CSV data into chart-ready datasets

---

## Phase 2 Scope: What You're Building

### Functional Requirements (FR-04, FR-05, FR-06)

| Feature | API Endpoint | Function | Status |
|---------|--------------|----------|--------|
| **FR-04: Intent Analysis** | POST `/api/analyze` | Parse user prompt + schema → IntentAnalysis JSON | TODO |
| **FR-05: Visualization Recommendation** | POST `/api/analyze` | Suggest 3-5 chart types for vague prompts | TODO |
| **FR-06: VizConfig Generation** | POST `/api/analyze` | Generate ECharts configs + validate against schema | TODO |
| **Data Transformation** | POST `/api/transform` | Aggregate CSV data for charts (Danfo.js) | TODO |

---

## Phase 1 Code Context (You Have This)

You've already reviewed these key Phase 1 files:

### Type Definitions (`web/src/lib/types.ts`)
```typescript
// Already defined - reference these!
interface SchemaDefinition {
  sessionId: string
  fileName: string
  uploadedAt: string
  rowCount: number
  columns: ColumnDefinition[]
}

interface ColumnDefinition {
  name: string
  type: 'date' | 'number' | 'categorical' | 'boolean' | 'string'
  format?: string
  isMetric: boolean
  sampleValues: any[]
  // + statistical fields for numbers
}
```

### Schema Generation Logic (`web/src/lib/schema.ts`)
The `analyzeColumns()` function already:
- Detects column types with regex patterns
- Identifies metric vs. dimension columns
- Computes min/max/avg for numbers
- Counts unique values for categoricals

**You'll reference this function when building IntentAnalysis** - the schema tells you what columns are available.

### Upload API (`web/src/app/api/upload/route.ts`)
- Accepts CSV file upload
- Calls `analyzeColumns()` from schema.ts
- Returns `{ sessionId, schema, preview }`

Session IDs are created here - you'll use them to access the same CSV in Phase 2.

---

## Data Flow: What Roo Builds in Phase 2

```
User Prompt (text)
    ↓
[Step 1: Intent Analysis - FR-04]
  POST /api/analyze
  Input: { sessionId, userPrompt, schema }
  - LLM parses natural language
  - Extracts intent type (trend, compare, distribution, etc.)
  - Identifies dimensions & metrics from schema
  → Output: IntentAnalysis JSON
    ↓
[Step 2: Visualization Recommendation - FR-05]
  Still in POST /api/analyze
  - Map intent type → recommended chart types
  - Filter by what's possible given schema
  → Output: ChartRecommendation[] array
    ↓
[Step 3: VizConfig Generation - FR-06]
  Still in POST /api/analyze
  - For each recommended chart
  - LLM generates complete ECharts configuration
  - Validate: all columns exist in schema
  → Output: VizConfig[] with error handling
    ↓
[Step 4: Data Transformation]
  POST /api/transform
  Input: { sessionId, vizConfigs[] }
  - Use Danfo.js to transform raw CSV
  - Filter, group, aggregate by VizConfig specs
  → Output: ProcessedData[] ready for ECharts
```

---

## Implementation: Three Files to Create

### 1. `web/src/lib/llm.ts` (New File)

Create this file with three functions:

```typescript
import { SchemaDefinition, IntentAnalysis, VizConfig } from './types'

// Function 1: Parse user prompt → IntentAnalysis
export async function analyzeIntent(
  userPrompt: string,
  schema: SchemaDefinition
): Promise<IntentAnalysis> {
  // Call Z.ai/OpenAI LLM with system prompt (see below)
  // Return IntentAnalysis JSON
}

// Function 2: Recommend chart types based on intent
export function recommendVisualizations(
  intent: IntentAnalysis,
  schema: SchemaDefinition
): ChartRecommendation[] {
  // Map intent.intentType → chart types
  // Validate against schema (dimensions, metrics, cardinality)
  // Return top 3-5 recommendations
}

// Function 3: Generate complete VizConfig for each chart
export async function generateVizConfigs(
  intent: IntentAnalysis,
  recommendations: ChartRecommendation[],
  schema: SchemaDefinition
): Promise<VizConfig[]> {
  // For each recommended chart type
  // Call LLM to generate ECharts configuration
  // Validate all column references
  // Return array of VizConfig
}

// Helper: Validate VizConfig against schema
export function validateVizConfig(
  config: VizConfig,
  schema: SchemaDefinition
): { valid: boolean; errors: string[] } {
  // Check xAxis columns exist
  // Check metrics columns exist
  // Check aggregations are valid
  // Return validation result
}
```

**Key Implementation Details:**

**analyzeIntent():**
- Input: `userPrompt: string`, `schema: SchemaDefinition`
- Call LLM with system prompt (template provided below)
- Extract: intentType, dimensions[], metrics[], filters[], confidence
- Must reference ONLY columns that exist in schema
- Throw error if hallucinating column names

**recommendVisualizations():**
- Pure logic function (no LLM call)
- Map intentType → chart types:
  - `'trend'` → `['line', 'area', 'bar']`
  - `'compare'` → `['bar', 'scatter', 'heatmap']`
  - `'distribution'` → `['histogram', 'box', 'pie']`
  - `'composition'` → `['pie', 'bar']`
  - `'correlation'` → `['scatter', 'heatmap']`
  - `'outliers'` → `['box', 'scatter']`
  - `'forecast'` → `['line', 'area']`
- Validate: Can the chart type handle this many dimensions/metrics?
- Return sorted by relevance (0-1 score)

**generateVizConfigs():**
- For each recommendation, call LLM
- LLM generates complete VizConfig JSON (see PRD Section 4.3)
- Post-validation: Call `validateVizConfig()` for each
- If validation fails, return error with suggestion

**validateVizConfig():**
- Check `dimensions.x.columnName` exists in schema
- Check all `metrics[].columnName` exist
- Check `filters.columnName` exists
- Check `chartType` is supported
- Return errors if any validation fails

---

### 2. `web/src/lib/transform.ts` (New File)

Create this file for data aggregation:

```typescript
import { VizConfig, SchemaDefinition } from './types'

// Transform raw CSV data → chart-ready data based on VizConfig
export async function transformDataForViz(
  csvData: any[],        // Array of row objects from CSV
  vizConfig: VizConfig,
  schema: SchemaDefinition
): Promise<any[]> {
  // Use Danfo.js to:
  // 1. Filter rows based on vizConfig.filters
  // 2. Group by dimension column(s)
  // 3. Aggregate metrics (SUM, AVG, COUNT, etc.)
  // 4. Sort by vizConfig.sorting
  // Return aggregated data as array of objects
}
```

**Implementation with Danfo.js:**

```typescript
import * as dfd from 'danfo-js-browser'

export async function transformDataForViz(
  csvData: any[],
  vizConfig: VizConfig,
  schema: SchemaDefinition
): Promise<any[]> {
  // Create Danfo DataFrame
  const df = new dfd.DataFrame(csvData)
  
  // Step 1: Apply filters
  if (vizConfig.filters) {
    const { columnName, operator, value } = vizConfig.filters
    // Apply filter based on operator (gte, lte, eq, etc.)
    // df = df.query(...)
  }
  
  // Step 2: Group and aggregate
  const groupByCol = vizConfig.dimensions.x.columnName
  const metricCol = vizConfig.metrics[0].columnName
  const aggregation = vizConfig.metrics[0].aggregation // SUM, AVG, etc.
  
  const grouped = df.groupby([groupByCol]).agg({
    [metricCol]: aggregation.toLowerCase()
  })
  
  // Step 3: Sort
  if (vizConfig.sorting) {
    // grouped = grouped.sort_values(...)
  }
  
  // Step 4: Convert to array
  return grouped.to_json({ orient: 'records' })
}
```

---

### 3. `web/src/app/api/analyze/route.ts` (New File)

Create this API endpoint:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { analyzeIntent, recommendVisualizations, generateVizConfigs } from '@/lib/llm'
import { getSessionData } from '@/lib/session'  // You'll need this too

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userPrompt, chatHistory } = await request.json()
    
    // Get schema + raw CSV from session
    const { schema, csvData } = await getSessionData(sessionId)
    
    // Step 1: Parse intent
    const intent = await analyzeIntent(userPrompt, schema)
    
    // Step 2: Recommend visualizations
    const recommendations = recommendVisualizations(intent, schema)
    
    // Step 3: Generate VizConfigs
    const vizConfigs = await generateVizConfigs(intent, recommendations, schema)
    
    // Return response
    return NextResponse.json({
      success: true,
      intent,
      recommendations,
      vizConfigs,
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'gpt-4o' // or z.ai
      }
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}
```

### 4. `web/src/app/api/transform/route.ts` (New File)

Create this data transformation endpoint:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { transformDataForViz } from '@/lib/transform'
import { getSessionData } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, vizConfigs } = await request.json()
    
    // Get raw CSV from session
    const { csvData, schema } = await getSessionData(sessionId)
    
    // Transform data for each VizConfig
    const processedData = await Promise.all(
      vizConfigs.map(async (config) => ({
        vizId: config.id,
        data: await transformDataForViz(csvData, config, schema),
        metadata: { rowCount: csvData.length }
      }))
    )
    
    return NextResponse.json({
      success: true,
      processedData
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}
```

---

## LLM Prompt Templates

### Template 1: Intent Analysis Prompt

```
You are an analytics intent parser. Your job is to understand what the user 
wants to analyze based on their natural language question.

CSV Schema (available columns):
${JSON.stringify(schema, null, 2)}

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
}
```

### Template 2: VizConfig Generation Prompt

```
You are an ECharts configuration generator. For each visualization the user 
wants, generate a complete ECharts configuration JSON.

CSV Schema:
${JSON.stringify(schema, null, 2)}

User Intent:
${JSON.stringify(intent, null, 2)}

Recommended Chart Type: ${chartType}

Generate a complete ECharts configuration for a ${chartType} chart that:
1. Visualizes the user's intent
2. Uses ONLY columns from the schema
3. Includes all required fields: chartType, title, dimensions, metrics, filters, sorting

CRITICAL RULES:
- dimensions.x.columnName MUST exist in schema
- metrics[].columnName MUST exist in schema
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
}
```

---

## Session Management

You'll need a simple session store. Add this to `web/src/lib/session.ts`:

```typescript
// In-memory session store (replace with Redis for production)
const sessions: Record<string, any> = {}

export function createSession(schema: any, csvData: any[]) {
  const sessionId = `sess_${Date.now()}`
  sessions[sessionId] = { schema, csvData, createdAt: Date.now() }
  return sessionId
}

export async function getSessionData(sessionId: string) {
  if (!sessions[sessionId]) throw new Error('Session not found')
  return sessions[sessionId]
}
```

---

## Testing Your Work

### Test 1: Intent Analysis
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "sess_test",
    "userPrompt": "Show me revenue trends over time",
    "schema": { /* from Phase 1 */ }
  }'
```

Expected response: IntentAnalysis JSON with intentType=trend, dimensions=[date], metrics=[revenue]

### Test 2: Visualization Recommendation
```bash
# After intent analysis, check that chart types are recommended
# Should return: ['line', 'area', 'bar'] for trend intent
```

### Test 3: Data Transformation
```bash
curl -X POST http://localhost:3000/api/transform \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "sess_test",
    "vizConfigs": [ /* from analyze endpoint */ ]
  }'
```

Expected: Aggregated data ready for ECharts rendering

---

## Dependencies (Already Installed)

- `danfo-js-browser` for data transformation
- `openai` or Z.ai client for LLM calls
- Next.js API routes (no external dependencies needed)

**Install if missing:**
```bash
npm install danfo-js-browser openai
```

**Add to package.json if using Z.ai:**
```json
{
  "dependencies": {
    "z.ai": "^1.0.0"
  }
}
```

---

## Environment Variables

Create `.env.local` in `/web`:

```env
# LLM Provider
LLM_PROVIDER=openai  # or "z.ai"
OPENAI_API_KEY=your_key
Z_AI_API_KEY=your_key

# Session Management
SESSION_STORE=memory  # or "redis" later
REDIS_URL=redis://localhost:6379
```

---

## PRD References (Corrected)

For complete specifications, refer to:

- **Section 4.2:** IntentAnalysis JSON Schema (lines 224-258)
- **Section 4.3:** VizConfig JSON Schema (lines 266-336)
- **FR-04 Intent Analysis** (Section 5.2, lines 433-473)
- **FR-05 Dynamic Visualization Recommendation** (Section 5.2, lines 475-496)
- **FR-06 Visualization Config Generation** (Section 5.2, lines 498-555)
- **FR-07 Data Processing & Aggregation** (Section 5.3, lines 561-604)
- **FR-08 Error Handling & Fallback** (Section 5.3, lines 606-614)
- **Appendix B: Error Scenarios** (lines 1333-1374)

**LLM Prompt Engineering:**
- Section 6.2: Intent Analysis Prompt (lines 908-964)
- Section 6.2: Config Generation Prompt (lines 966-1028)

---

## Handoff Checklist

Before committing to GitHub:

- [ ] `analyzeIntent()` parses natural language → IntentAnalysis JSON
- [ ] `recommendVisualizations()` suggests chart types with validation
- [ ] `generateVizConfigs()` produces valid ECharts configs
- [ ] All column references in configs are validated against schema
- [ ] `/api/analyze` endpoint works end-to-end (intent → recommendations → configs)
- [ ] `/api/transform` endpoint aggregates data correctly using Danfo.js
- [ ] Error handling catches schema hallucinations with user-friendly messages
- [ ] Test cases cover happy path + edge cases (vague prompts, missing columns)
- [ ] Code uses strong TypeScript types
- [ ] Comments explain LLM prompt engineering decisions
- [ ] env.local configured with LLM API keys

**Commit Message:**
```
feat: Implement LLM intent analysis + dynamic visualization config generation

- Add analyzeIntent() for natural language understanding
- Add recommendVisualizations() for intelligent chart type recommendation
- Add generateVizConfigs() with strict schema validation
- Implement /api/analyze endpoint (intent → recommendations → configs)
- Implement /api/transform endpoint (CSV aggregation with Danfo.js)
- Add comprehensive error handling for LLM hallucinations
- Include LLM prompt templates (intent analysis + config generation)

Closes FR-04, FR-05, FR-06
```

---

## What's Next After Phase 2?

Once this is complete and pushed to `main`:
1. Cursor will pull latest code
2. Implement Phase 3: ECharts visualization rendering + dashboard UI
3. Connect frontend to your `/api/analyze` and `/api/transform` endpoints
4. Build responsive multi-chart dashboard with chat interface
5. Add dashboard persistence to PostgreSQL

---

## Success Criteria

Phase 2 is complete when:

✅ User uploads CSV → generates schema  
✅ User asks: "Show me revenue by channel"  
✅ System returns IntentAnalysis + 3-5 chart recommendations  
✅ System generates valid VizConfig JSON for each chart  
✅ System transforms CSV data for each chart  
✅ All configs reference ONLY existing schema columns  
✅ No LLM hallucinations get through validation  

---

**You've got this!** 🚀

The Phase 1 foundation is solid. Phase 2 is the intelligence layer that makes this platform special.

Questions? Check the PRD sections referenced above or ask for clarification.

**Last Updated:** January 29, 2026  
**Status:** Ready for Roo implementation  
**Estimated Timeline:** 2-3 days for full Phase 2
