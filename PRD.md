# Product Requirements Document (PRD)
## Universal AI Analyst (Code Name: "Insight")
**Version:** 2.0 (MVP - Developer Ready)  
**Date:** January 20, 2026  
**Status:** Ready for Implementation  
**Target:** Cursor AI / Developer Implementation

---

## Table of Contents
1. Executive Summary
2. User Personas & User Stories
3. Core Architecture
4. Data Structures & Schemas
5. Functional Requirements (Detailed)
6. API Contracts
7. Component Architecture
8. UI/UX Specifications
9. Implementation Roadmap
10. Success Metrics & KPIs

---

## 1. Executive Summary

### Vision
Build an intelligent, data-agnostic analytics platform where users can upload any data source (CSV, JSON, Excel) and use natural language to generate instant, interactive multi-chart dashboards. The system intelligently determines both **the number and type of charts** based on user intent.

### Core Value Proposition
- **For Founders:** Turn spreadsheets into investor-ready dashboards in seconds
- **For Growth Teams:** Ask complex questions (funnels, cohorts, attribution) without SQL knowledge
- **For Analysts:** Automate repetitive chart generation; focus on strategy

### Key Innovation: Intent-Driven Dashboard Generation
Unlike static dashboard builders, the system:
1. **Parses user intent** to determine visualization scope (1 chart vs. 10-chart dashboard)
2. **Dynamically introspects schema** to recommend relevant chart types
3. **Never exposes raw data** to the LLM (privacy-first design)
4. **Generates configuration, not code** (deterministic, safe rendering)

### Differentiation
- **Universal data handling:** Works with any CSV/JSON schema without pre-configuration
- **Multi-chart intelligence:** LLM decides scope, not the UI
- **Privacy-first:** Only column metadata → LLM, data processing stays local/secure
- **Fast iteration:** Schema → Config → Render in < 5 seconds

---

## 2. User Personas & User Stories

### Persona 1: The Founder (CEO/CFO)
**Goal:** Quick, shareable insights for business decisions  
**Pain Point:** Drowning in spreadsheets; needs to validate metrics for investors

**User Stories:**
- "As a founder, I want to upload a financial CSV and ask 'Show me our burn rate, MRR, and runway' and get a 3-chart dashboard instantly."
- "As a founder, I want to ask 'How does our revenue compare to last quarter?' and get trend charts without calling my analyst."

### Persona 2: The Growth Hacker (Marketing/Product Lead)
**Goal:** Understand complex user journeys without SQL  
**Pain Point:** Can't write SQL; needs to track AARRR metrics; tired of waiting for analysts

**User Stories:**
- "As a growth lead, I want to ask 'Show me our conversion funnel from signup to activation, broken down by marketing channel' and get a multi-chart dashboard."
- "As a growth lead, I want to analyze cohort retention by asking 'How are our cohorts from the last 6 months performing?' and see a cohort table + retention curves."

### Persona 3: The Data Steward (Analyst/Data Engineer)
**Goal:** Stop building one-off charts; enable self-service analytics  
**Pain Point:** Repetitive dashboard requests; needs to focus on strategy, not grunt work

**User Stories:**
- "As an analyst, I want to provide this tool to stakeholders so they can generate their own standard reports."
- "As an analyst, I want to ask 'Generate all key metrics for product health' and let the AI decide what matters."

---

## 3. Core Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE LAYER                      │
│  (Next.js Frontend: Chat UI, Dashboard Grid, Chart Viewer)   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  ORCHESTRATION LAYER                          │
│  (Next.js API Routes: Intent Parser, Config Generator)      │
│  - Request validation                                         │
│  - LLM prompt engineering                                     │
│  - Error handling & fallbacks                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌──────▼──────┐  ┌─────▼────────┐
│  DATA LAYER  │  │  AI LAYER   │  │ STORAGE LAYER│
│              │  │             │  │              │
│ • CSV Parse  │  │ • Z.ai/GPT  │  │• PostgreSQL  │
│ • Schema     │  │ • Prompt    │  │• User State  │
│   Introspect │  │   Eng.      │  │• Dashboards  │
│ • Danfo.js   │  │ • Config    │  │• Chat History│
│              │  │   Gen.      │  │              │
└──────────────┘  └─────────────┘  └──────────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│               RENDERING ENGINE (Frontend)                     │
│  (Apache ECharts via echarts-for-react + React Grid)        │
│  - Multi-chart layout                                         │
│  - Interactive tooltips & responsive design                  │
│  - Fallback to raw data table                               │
└────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow: From Upload to Dashboard

```
1. USER UPLOAD
   └─→ CSV file (max 50MB) + Session ID
   
2. DATA INGESTION
   └─→ Parse CSV → Detect schema → Store temp in session
   
3. USER QUERY
   └─→ "Show me [natural language question]"
   
4. INTENT ANALYSIS
   └─→ Schema JSON + User Prompt → LLM
   └─→ Output: { scope: N, questions: [...], chart_types: [...] }
   
5. CONFIG GENERATION
   └─→ For each question:
       ├─ LLM generates { chartType, title, xAxis, yAxis, aggregation, filters }
       ├─ Validate against schema (catch hallucinations)
       └─ Return array of VizConfigs
   
6. DATA TRANSFORMATION
   └─→ Danfo.js processes CSV based on each VizConfig
       ├─ Filter rows
       ├─ Group/aggregate data
       └─ Return processed dataset
   
7. RENDERING
   └─→ For each VizConfig + dataset:
       ├─ Pass to ECharts component
       ├─ Render in responsive grid
       └─ Attach event listeners (drill-down, export)
   
8. PERSISTENCE
   └─→ User clicks "Pin to Dashboard"
       └─→ Save all VizConfigs + session data to PostgreSQL
```

---

## 4. Data Structures & Schemas

### 4.1 Schema Definition (Generated from CSV)

**What gets generated when a file is uploaded:**

```json
{
  "sessionId": "sess_abc123xyz",
  "fileName": "financial_data.csv",
  "uploadedAt": "2025-01-20T10:30:00Z",
  "rowCount": 1250,
  "columns": [
    {
      "name": "date",
      "type": "date",
      "format": "YYYY-MM-DD",
      "isMetric": false,
      "sampleValues": ["2025-01-01", "2025-01-02"]
    },
    {
      "name": "channel",
      "type": "categorical",
      "uniqueValues": ["organic", "paid_search", "social", "direct"],
      "isMetric": false,
      "cardinality": 4
    },
    {
      "name": "signups",
      "type": "number",
      "isMetric": true,
      "min": 0,
      "max": 5000,
      "avg": 250,
      "sampleValues": [120, 450, 220]
    },
    {
      "name": "revenue",
      "type": "number",
      "isMetric": true,
      "min": 0,
      "max": 150000,
      "avg": 12500,
      "sampleValues": [1200, 45000, 22000]
    },
    {
      "name": "retention_rate",
      "type": "number",
      "isMetric": true,
      "min": 0,
      "max": 100,
      "isPercentage": true,
      "sampleValues": [45.2, 67.8, 52.1]
    }
  ]
}
```

**Rules for Type Detection:**
- **Date:** Matches YYYY-MM-DD, MM/DD/YYYY, or ISO 8601
- **Number:** Numeric values (int, float, decimal)
- **Categorical:** Unique values < 100 AND cardinality < 20
- **Boolean:** Only "true"/"false", "yes"/"no", "0"/"1"
- **Percentage:** Number type where max <= 100 AND name contains "rate", "percentage", "%"

### 4.2 Intent Analysis Output

**LLM parses user prompt and returns:**

```json
{
  "intent": "multi_chart_dashboard",
  "scope": 3,
  "confidence": 0.95,
  "reasoning": "User asked for business health overview with specific metrics. This requires multiple charts.",
  "suggestedQuestions": [
    {
      "question": "What is our monthly revenue trend?",
      "expectedChartType": "line",
      "metrics": ["revenue"],
      "dimensions": ["date"],
      "filters": { "date": "last_12_months" }
    },
    {
      "question": "Which channel drives the most signups?",
      "expectedChartType": "bar",
      "metrics": ["signups"],
      "dimensions": ["channel"],
      "aggregation": "SUM"
    },
    {
      "question": "How does revenue compare by channel?",
      "expectedChartType": "bar",
      "metrics": ["revenue"],
      "dimensions": ["channel"],
      "aggregation": "SUM"
    }
  ]
}
```

**Scope Rules:**
- `1` = User asked for a single metric ("Show me revenue")
- `2-3` = Specific multi-metric question ("Show me revenue and signups by channel")
- `4-7` = Dashboard request ("Give me business health overview")
- `> 7` = Too broad; system should ask for clarification

### 4.3 Visualization Configuration Schema

**Single chart config (generated by LLM):**

```json
{
  "id": "viz_001",
  "chartType": "bar",
  "title": "Revenue by Channel (Last 30 Days)",
  "description": "Total revenue generated from each marketing channel",
  "dimensions": {
    "x": {
      "columnName": "channel",
      "type": "categorical",
      "displayAs": "Channel"
    }
  },
  "metrics": [
    {
      "columnName": "revenue",
      "aggregation": "SUM",
      "displayAs": "Total Revenue",
      "format": "currency_usd"
    }
  ],
  "filters": {
    "columnName": "date",
    "operator": "gte",
    "value": "2025-01-01",
    "type": "date"
  },
  "sorting": {
    "by": "revenue",
    "order": "descending"
  },
  "displaySettings": {
    "showLegend": true,
    "showTooltip": true,
    "colors": ["#3B82F6", "#EF4444", "#10B981", "#F59E0B"],
    "responsive": true
  },
  "metadata": {
    "createdAt": "2025-01-20T10:35:00Z",
    "source": "user_prompt",
    "userPrompt": "Show revenue by channel for the last month",
    "llmModel": "gpt-4o"
  }
}
```

**Multiple-chart config (dashboard):**

```json
{
  "dashboardId": "dash_xyz789",
  "dashboardTitle": "Business Health Overview",
  "createdAt": "2025-01-20T10:35:00Z",
  "layout": {
    "gridColumns": 2,
    "gridRows": 2,
    "gutter": 16
  },
  "charts": [
    { ...chart_config_1... },
    { ...chart_config_2... },
    { ...chart_config_3... },
    { ...chart_config_4... }
  ],
  "refreshInterval": null
}
```

### 4.4 Processed Data Output (For Frontend)

**After Danfo.js processes the CSV:**

```json
{
  "vizId": "viz_001",
  "data": [
    {
      "channel": "organic",
      "revenue": 125000,
      "_raw": { "date": "2025-01", "channel": "organic", "revenue": 125000 }
    },
    {
      "channel": "paid_search",
      "revenue": 98500,
      "_raw": { "date": "2025-01", "channel": "paid_search", "revenue": 98500 }
    },
    {
      "channel": "social",
      "revenue": 45000,
      "_raw": { "date": "2025-01", "channel": "social", "revenue": 45000 }
    }
  ],
  "metadata": {
    "rowCount": 3,
    "transformations": ["filter: date >= 2025-01-01", "group: channel", "sum: revenue"],
    "executedAt": "2025-01-20T10:35:00Z"
  }
}
```

---

## 5. Functional Requirements (Detailed)

### 5.1 Data Ingestion & Schema Introspection

#### FR-01: File Upload
**Requirement:** System must accept CSV, JSON, and Excel file uploads (MVP: CSV only).

**Acceptance Criteria:**
- [ ] User can drag-and-drop or click to upload a file
- [ ] System validates file type (CSV only for MVP)
- [ ] System validates file size (max 50MB)
- [ ] System extracts first 10 rows for schema preview
- [ ] System stores raw CSV in browser session (not sent to LLM)
- [ ] Error handling: Show user-friendly error for unsupported formats or oversized files

**Implementation Notes:**
- Use `papaparse` for CSV parsing in the browser
- Store CSV as `string[][]` in React state for row access
- Implement progress bar for large file parsing

#### FR-02: Schema Auto-Detection
**Requirement:** System must infer column types automatically without user input.

**Acceptance Criteria:**
- [ ] System detects `date`, `number`, `categorical`, `boolean`, `string` types
- [ ] System identifies metric columns (numeric, likely for aggregation)
- [ ] System identifies dimension columns (categorical/date, for grouping)
- [ ] System computes sample statistics (min, max, avg, unique count)
- [ ] User sees schema preview before proceeding

**Type Detection Logic:**
```
For each column:
1. Sample first 100 non-null values
2. Check regex patterns:
   - Date: YYYY-MM-DD, MM/DD/YYYY, ISO 8601
   - Boolean: true/false, yes/no, 0/1 (>80% match)
   - Number: Parse as float; if successful, type = number
3. If ambiguous:
   - Cardinality < 20 AND unique < 100 → categorical
   - Otherwise → string
4. Mark as "isMetric" if:
   - type = number
   - AND (name contains "count", "sum", "revenue", "total", "rate", etc.)
```

#### FR-03: Schema JSON Generation
**Requirement:** Generate structured schema definition for LLM ingestion.

**Acceptance Criteria:**
- [ ] Schema includes all column metadata (name, type, sampleValues, cardinality)
- [ ] Schema includes statistical summaries for numeric columns
- [ ] Schema is JSON-serializable and < 10KB
- [ ] Schema never includes actual data rows (privacy-first)

**Output Structure:** (See Section 4.1)

---

### 5.2 The Intelligence Layer (Intent Analysis & Config Generation)

#### FR-04: Intent Analysis
**Requirement:** Parse user prompt and determine visualization scope.

**Input:**
- User Prompt: `string` (e.g., "Show me revenue by channel for the last quarter")
- Schema JSON: `SchemaDefinition` (from FR-03)
- Chat History: `ChatMessage[]` (for context)

**Output:**
- Intent Analysis: `IntentAnalysis` (see Section 4.2)

**Acceptance Criteria:**
- [ ] System identifies 1-chart vs. multi-chart requests
- [ ] System detects temporal filters (last 7 days, Q1, YTD)
- [ ] System extracts metric names and dimension names from prompt
- [ ] System handles ambiguous prompts with clarifying suggestions
- [ ] Confidence score >= 0.8 indicates high-quality intent parsing

**Prompt Engineering Guidelines:**

```
System Prompt (to LLM):
---
You are an analytics intent parser. Your job is to understand what charts 
the user wants to see, based on their natural language query.

Given a CSV schema and a user prompt, determine:
1. How many charts are needed (1, 2-3, or 4+)
2. What each chart should visualize
3. What metric(s) and dimension(s) to use
4. Any time filters or other constraints

IMPORTANT:
- Only suggest charts that are possible given the available columns
- Never hallucinate columns that don't exist in the schema
- Be specific about aggregations (SUM, COUNT, AVG, etc.)
- Suggest time-based filtering when appropriate

Return ONLY a valid JSON object, no markdown, no explanation.
---
```

#### FR-05: Dynamic Visualization Recommendation
**Requirement:** If prompt is vague, proactively suggest 3-5 relevant charts.

**Input:**
- User Prompt: `string` (e.g., "Analyze this data")
- Schema JSON: `SchemaDefinition`

**Output:**
- Array of 3-5 suggested questions with chart types

**Acceptance Criteria:**
- [ ] Suggestions are contextual to the schema (only use real columns)
- [ ] Each suggestion has clear description and expected chart type
- [ ] Suggestions cover common analytics patterns (trends, breakdowns, distributions)
- [ ] User can click a suggestion to execute it

**Suggested Chart Patterns:**
- **Trend:** Time series of a metric (Line chart)
- **Breakdown:** Metric grouped by top dimension (Bar chart)
- **Distribution:** Histogram or pie of categorical column
- **Comparison:** Multiple metrics side-by-side (Combined chart)
- **Correlation:** Two metrics (Scatter chart)

#### FR-06: Visualization Config Generation
**Requirement:** LLM generates configuration JSON for each requested chart (never code).

**Input:**
- Intent Analysis: `IntentAnalysis`
- Schema JSON: `SchemaDefinition`
- Each question from `suggestedQuestions[]`

**Output:**
- Array of `VizConfig` objects (see Section 4.3)

**Acceptance Criteria:**
- [ ] LLM outputs only JSON, no explanations
- [ ] Config includes: `chartType`, `title`, `dimensions`, `metrics`, `filters`, `sorting`
- [ ] All referenced columns exist in schema
- [ ] `chartType` is one of: `bar`, `line`, `area`, `pie`, `scatter`, `combined`
- [ ] Filters are valid (e.g., date >= 2025-01-01)
- [ ] Number format specified for currency/percentage metrics

**Config Validation (Backend):**
```
For each VizConfig:
1. Verify `xAxis` column exists in schema
2. Verify all `metrics[].columnName` exist in schema
3. Verify `chartType` is supported
4. Verify `aggregation` is valid (SUM, COUNT, AVG, MIN, MAX)
5. Verify date filters are valid ISO 8601
6. If any validation fails → Return error + ask user for clarification
```

**Strict Output Schema (Enforce with JSON Schema Validation):**
```json
{
  "type": "object",
  "required": ["chartType", "title", "dimensions", "metrics"],
  "properties": {
    "chartType": {
      "enum": ["bar", "line", "area", "pie", "scatter", "combined"]
    },
    "title": { "type": "string", "maxLength": 100 },
    "dimensions": {
      "type": "object",
      "properties": {
        "x": { "type": "object", "required": ["columnName", "type"] }
      }
    },
    "metrics": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["columnName", "aggregation"]
      }
    },
    "filters": { "type": "object" },
    "sorting": { "type": "object" }
  }
}
```

---

### 5.3 The Data Transformation Layer

#### FR-07: Data Processing & Aggregation
**Requirement:** Transform raw CSV into chart-ready dataset based on VizConfig.

**Input:**
- Raw CSV: `string[][]` (rows × columns)
- Schema JSON: `SchemaDefinition`
- VizConfig: `VizConfig`

**Output:**
- Processed Data: `{ vizId, data: Object[], metadata }`

**Acceptance Criteria:**
- [ ] System filters rows based on VizConfig filters
- [ ] System groups rows by dimension column(s)
- [ ] System aggregates metrics (SUM, COUNT, AVG, MIN, MAX)
- [ ] System applies sorting
- [ ] System handles NULL/missing values gracefully
- [ ] Processing completes in < 2 seconds for 100K rows

**Implementation (Browser-side, using Danfo.js):**

```javascript
// Pseudocode
const df = dfd.read_csv(rawCSV); // Danfo DataFrame

// Filter
if (vizConfig.filters) {
  for (const [col, condition] of Object.entries(vizConfig.filters)) {
    df = df.query(df[col][condition.operator](condition.value));
  }
}

// Group & Aggregate
const grouped = df.groupby([vizConfig.dimensions.x.columnName])
  .agg({
    [vizConfig.metrics[0].columnName]: vizConfig.metrics[0].aggregation
  });

// Sort
grouped = grouped.sort_values([...], ascending=false);

// Output
return grouped.to_json({ orient: "records" });
```

#### FR-08: Error Handling & Fallback
**Requirement:** If data transformation fails, gracefully fall back to raw data table.

**Acceptance Criteria:**
- [ ] System catches errors during aggregation
- [ ] System logs error with stack trace
- [ ] User sees user-friendly error message
- [ ] System offers fallback: raw data table or re-try with different config
- [ ] System suggests asking a different question

---

### 5.4 The Visualization Engine

#### FR-09: Chart Rendering (ECharts)
**Requirement:** Render VizConfig + processed data as interactive charts.

**Supported Chart Types (MVP):**
- **Bar Chart:** Categorical × Metric (horizontal/vertical)
- **Line Chart:** Temporal × Metric (trends)
- **Area Chart:** Temporal × Metric (filled trends)
- **Pie Chart:** Categorical × Single Metric (composition)
- **Scatter Chart:** Metric × Metric (correlation)
- **Combined:** Line + Bar on same axes

**Acceptance Criteria:**
- [ ] Charts render within 1 second
- [ ] Charts are fully responsive (mobile, tablet, desktop)
- [ ] Charts include title, legend, axis labels
- [ ] Charts use consistent color palette
- [ ] Charts support zoom/pan for desktop
- [ ] Charts render SVG (not canvas) for better quality

**ECharts Setup:**
```javascript
// Example Bar Chart Config
const echartConfig = {
  title: { text: vizConfig.title },
  xAxis: { type: 'category', data: [...] },
  yAxis: { type: 'value' },
  series: [{
    data: [...],
    type: 'bar'
  }],
  responsive: true,
  // ... additional options
};
```

#### FR-10: Interactive Elements
**Requirement:** Charts must support user interactions.

**Acceptance Criteria:**
- [ ] Tooltips on hover (show value, dimension, metric)
- [ ] Click events for drill-down (future phase)
- [ ] Export chart as PNG/SVG
- [ ] Share chart via URL
- [ ] Zoom/Pan on desktop (Line & Area charts)

#### FR-11: Multi-Chart Dashboard Layout
**Requirement:** Render multiple charts in responsive grid layout.

**Acceptance Criteria:**
- [ ] Grid layout adapts to screen size (2 cols on desktop, 1 on mobile)
- [ ] Charts have consistent sizing/padding
- [ ] User can drag-to-reorder charts (future phase)
- [ ] User can delete individual charts
- [ ] Dashboard persists when user saves

**Grid Configuration:**
```
Desktop (>1024px): 2 columns, max-width 400px per chart
Tablet (768-1024px): 2 columns, max-width 100%
Mobile (<768px): 1 column, full width
Gutter: 16px
```

---

### 5.5 User Interface & Persistence

#### FR-12: Chat Interface
**Requirement:** Persistent chat sidebar for asking questions and viewing history.

**Acceptance Criteria:**
- [ ] Chat bar at bottom (mobile) or right sidebar (desktop)
- [ ] Input field with submit button + loading state
- [ ] Chat history visible (user query + LLM response summary)
- [ ] Follow-up questions maintain context
- [ ] Ability to clear chat history
- [ ] Chat accessible even after dashboard is generated

**Chat Message Structure:**
```json
{
  "id": "msg_123",
  "sessionId": "sess_abc",
  "role": "user" | "assistant",
  "content": "Show me revenue by channel",
  "timestamp": "2025-01-20T10:35:00Z",
  "generatedVizConfigs": ["viz_001", "viz_002"],
  "metadata": {
    "tokensUsed": 150,
    "executionTime": 2.3
  }
}
```

#### FR-13: Dashboard Persistence
**Requirement:** Save generated charts to a persistent dashboard.

**Acceptance Criteria:**
- [ ] User can click "Pin to Dashboard" on any chart
- [ ] Pinned charts saved to PostgreSQL with `userId`, `dashboardId`, `vizConfigs`
- [ ] User can name/rename dashboards
- [ ] User can view saved dashboards from a library
- [ ] Dashboards are private by default (future: share functionality)
- [ ] User can delete dashboards or individual charts

**Database Schema (PostgreSQL):**
```sql
CREATE TABLE dashboards (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(255),
  description TEXT,
  viz_configs JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE chat_history (
  id UUID PRIMARY KEY,
  session_id VARCHAR(255),
  user_id UUID,
  user_message TEXT,
  assistant_response JSONB,
  viz_config_ids TEXT[],
  created_at TIMESTAMP
);
```

#### FR-14: Session Management
**Requirement:** Temporary sessions for uploaded files and generated visualizations.

**Acceptance Criteria:**
- [ ] Session created when file uploaded
- [ ] Raw CSV stored in session (expires after 24 hours or logout)
- [ ] Multiple chat queries within same session reuse CSV data
- [ ] User can start new session (upload new file)
- [ ] Session data never persists beyond logout (unless user saves dashboard)

---

## 6. API Contracts

### 6.1 Backend API Routes (Next.js)

#### POST `/api/upload`
**Purpose:** Upload CSV and generate schema

**Request:**
```json
{
  "file": "File object (multipart/form-data)",
  "sessionId": "string (optional, generate if not provided)"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "sessionId": "sess_abc123xyz",
  "schema": { ...SchemaDefinition... },
  "preview": [
    { "date": "2025-01-01", "channel": "organic", "revenue": 1200 },
    { "date": "2025-01-02", "channel": "paid", "revenue": 2500 }
  ]
}
```

**Response (Error - 400/413):**
```json
{
  "success": false,
  "error": "File too large (max 50MB)",
  "code": "FILE_TOO_LARGE"
}
```

---

#### POST `/api/analyze`
**Purpose:** Parse user prompt, generate intent analysis, and return visualization configs

**Request:**
```json
{
  "sessionId": "sess_abc123xyz",
  "userPrompt": "Show me revenue by channel for the last quarter",
  "chatHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "intentAnalysis": {
    "intent": "multi_chart_dashboard",
    "scope": 2,
    "confidence": 0.92,
    "reasoning": "..."
  },
  "vizConfigs": [
    { ...VizConfig_1... },
    { ...VizConfig_2... }
  ],
  "metadata": {
    "processingTime": 2.3,
    "model": "gpt-4o",
    "tokensUsed": 342
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "error": "Could not understand your request. Did you mean: [suggestions]?",
  "suggestions": [
    "Show me revenue trends over time",
    "Compare revenue across channels"
  ]
}
```

---

#### POST `/api/transform`
**Purpose:** Process CSV + VizConfig → aggregated data for rendering

**Request:**
```json
{
  "sessionId": "sess_abc123xyz",
  "vizConfigs": [
    { ...VizConfig... }
  ]
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "processedData": [
    {
      "vizId": "viz_001",
      "data": [
        { "channel": "organic", "revenue": 125000 },
        { "channel": "paid", "revenue": 98500 }
      ],
      "metadata": { "rowCount": 2, "transformations": [...] }
    }
  ]
}
```

---

#### POST `/api/dashboard/save`
**Purpose:** Save dashboard with charts to PostgreSQL

**Request:**
```json
{
  "dashboardTitle": "Q1 Business Overview",
  "vizConfigs": [ ...VizConfig[] ... ],
  "sessionId": "sess_abc123xyz"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "dashboardId": "dash_xyz789",
  "url": "/dashboard/dash_xyz789"
}
```

---

### 6.2 LLM Prompt Engineering

#### Intent Analysis Prompt

```
<system>
You are an analytics intent parser. Analyze a user's natural language query
and determine what visualizations they're asking for.

Given:
- A CSV schema with column definitions
- A user's natural language question
- Optional chat history for context

Output:
- A JSON object with { intent, scope, suggestedQuestions[] }

RULES:
1. Only suggest visualizations using columns that actually exist in the schema
2. Never hallucinate columns
3. If unsure, ask for clarification
4. Scope: 1 = single chart, 2-3 = specific multi-chart, 4+ = dashboard
5. Return ONLY valid JSON, no explanation

</system>

<schema>
{
  "columns": [
    { "name": "date", "type": "date" },
    { "name": "channel", "type": "categorical", "uniqueValues": 4 },
    { "name": "signups", "type": "number", "isMetric": true },
    { "name": "revenue", "type": "number", "isMetric": true }
  ]
}
</schema>

<user_query>
Show me our business health. I want to see revenue trends and breakdown by channel.
</user_query>

<response_format>
{
  "intent": "string",
  "scope": "number",
  "confidence": "number (0-1)",
  "reasoning": "string",
  "suggestedQuestions": [
    {
      "question": "string",
      "expectedChartType": "bar|line|pie|scatter|area|combined",
      "metrics": ["string"],
      "dimensions": ["string"],
      "aggregation": "SUM|COUNT|AVG|MIN|MAX"
    }
  ]
}
</response_format>
```

#### Config Generation Prompt

```
<system>
You are a data visualization configuration generator. For each analytics question,
generate an ECharts configuration JSON that can render the data.

IMPORTANT:
- Never generate Python/JavaScript code
- Only output JSON configuration
- All columns must exist in the provided schema
- Never hallucinate columns

Config must include:
- chartType (bar, line, area, pie, scatter, combined)
- title (concise, descriptive)
- dimensions (x-axis, grouping)
- metrics (y-axis, aggregations)
- filters (time ranges, exclusions)
- sorting (order)

</system>

<schema>
{ ...SchemaDefinition... }
</schema>

<question>
What is our monthly revenue trend for the last 12 months?
</question>

<response_format>
{
  "chartType": "line",
  "title": "Monthly Revenue Trend (Last 12 Months)",
  "dimensions": {
    "x": {
      "columnName": "date",
      "type": "date",
      "displayAs": "Month"
    }
  },
  "metrics": [
    {
      "columnName": "revenue",
      "aggregation": "SUM",
      "displayAs": "Total Revenue",
      "format": "currency_usd"
    }
  ],
  "filters": {
    "columnName": "date",
    "operator": "gte",
    "value": "2024-01-20",
    "type": "date"
  },
  "sorting": {
    "by": "date",
    "order": "ascending"
  }
}
</response_format>
```

---

## 7. Component Architecture

### 7.1 Frontend Component Tree (React)

```
App
├── Layout
│   ├── Header
│   │   ├── Logo
│   │   └── UserMenu
│   ├── Main Content
│   │   ├── UploadZone (for initial file upload)
│   │   │   └── FileInput
│   │   ├── Dashboard
│   │   │   └── ChartGrid
│   │   │       └── Chart (×N)
│   │   │           ├── ChartTitle
│   │   │           ├── ChartContainer (ECharts)
│   │   │           ├── ChartToolbar
│   │   │           │   ├── ExportBtn
│   │   │           │   ├── PinBtn
│   │   │           │   └── DeleteBtn
│   │   │           └── ChartMetadata
│   │   └── ErrorBoundary
│   │       └── FallbackUI (Raw Data Table)
│   └── ChatInterface
│       ├── ChatHistory
│       │   └── ChatMessage (×N)
│       ├── ChatInput
│       └── LoadingIndicator
└── Modal (Dialogs)
    ├── SchemaPreview
    ├── SaveDashboard
    └── ErrorDialog
```

### 7.2 Key React Components

#### Component: `UploadZone`
```typescript
// Accepts file upload
// Triggers file parsing + schema generation
// Shows preview + confirmation

props: {
  onUploadSuccess: (sessionId: string, schema: SchemaDefinition) => void
  onError: (error: Error) => void
}

state: {
  file: File | null
  loading: boolean
  preview: Object[] | null
}
```

#### Component: `ChartGrid`
```typescript
// Renders multiple charts in responsive grid
// Manages chart deletion, pinning, export

props: {
  charts: VizConfig[]
  data: ProcessedData[]
  onDelete: (vizId: string) => void
  onPin: (vizId: string) => void
  onExport: (vizId: string) => void
}

state: {
  layout: "grid_2col" | "grid_1col"
}
```

#### Component: `Chart`
```typescript
// Renders single ECharts visualization
// Includes toolbar for export/pin/delete

props: {
  vizConfig: VizConfig
  data: Object[]
  onDelete: () => void
  onPin: () => void
  onExport: () => void
}

state: {
  isLoading: boolean
  error: Error | null
}
```

#### Component: `ChatInterface`
```typescript
// Persistent chat sidebar
// Accepts user prompts + displays history

props: {
  sessionId: string
  onSubmit: (prompt: string) => void
  chatHistory: ChatMessage[]
  loading: boolean
}

state: {
  input: string
  loading: boolean
}
```

---

## 8. UI/UX Specifications

### 8.1 User Flow

```
1. LANDING / FILE UPLOAD
   - User drags CSV file into upload zone
   - System shows progress bar + preview
   - User confirms schema (can edit column types if needed)
   
2. CHAT PROMPT
   - User types question in chat bar: "Show me revenue by channel"
   - System shows loading indicator
   - System returns multi-chart dashboard
   
3. VIEW & INTERACT
   - User sees 2-3 charts rendered
   - User can hover for tooltips, zoom, pan
   - User can export individual charts
   
4. SAVE (OPTIONAL)
   - User clicks "Save Dashboard"
   - System saves to PostgreSQL
   - User gets sharable link (future)
   
5. FOLLOW-UP
   - User asks another question in chat
   - System adds new charts or replaces existing ones
   - Chat history visible for context
```

### 8.2 Responsive Design Breakpoints

| Breakpoint | Screen Size | Layout | Charts per Row |
| --- | --- | --- | --- |
| Mobile | < 640px | Stacked | 1 |
| Tablet | 640px - 1024px | 2-column | 1-2 |
| Desktop | > 1024px | 2-column | 2 |

### 8.3 Color Palette & Theme

**Primary Colors:**
- Blue: #3B82F6 (actions, lines)
- Red: #EF4444 (alerts, declines)
- Green: #10B981 (positive metrics)
- Yellow: #F59E0B (warnings)
- Gray: #6B7280 (neutral, text)

**Chart Colors (Cycling):**
```javascript
const chartColors = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B",
  "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"
];
```

### 8.4 Typography

- **Headings (H1-H3):** Inter Bold, 24px / 20px / 16px
- **Body Text:** Inter Regular, 14px, line-height 1.5
- **Chart Labels:** Inter Regular, 12px
- **Metric Numbers:** Inter Bold, 18px

---

## 9. Implementation Roadmap

### Phase 1: MVP (Target: 4 weeks)
- [ ] File upload (CSV only)
- [ ] Schema introspection (type detection)
- [ ] Intent analysis (1-chart vs. multi-chart)
- [ ] Config generation (Bar, Line, Pie charts)
- [ ] Data transformation (Danfo.js)
- [ ] Basic ECharts rendering
- [ ] Chat interface (stateless)
- [ ] Error handling & fallback UI

**Out of Scope:**
- Database persistence
- User accounts
- BigQuery integration
- Advanced chart types

### Phase 2: Persistence & Polish (Target: 2-3 weeks)
- [ ] PostgreSQL + Supabase setup
- [ ] Dashboard saving
- [ ] User authentication
- [ ] Dashboard library
- [ ] Advanced charts (Scatter, Combined)
- [ ] Chat history persistence
- [ ] Export functionality (PNG/CSV)

### Phase 3: Data Source Expansion (Target: 2-3 weeks)
- [ ] BigQuery integration
- [ ] JSON file support
- [ ] Excel file support
- [ ] API connector framework

### Phase 4: Intelligence & UX Polish (Target: 2-3 weeks)
- [ ] Improved prompt suggestions
- [ ] Drill-down interactions
- [ ] Cohort analysis templates
- [ ] SQL export (show user the query)

---

## 10. Success Metrics & KPIs

### Primary Metrics

| Metric | Target | Rationale |
| --- | --- | --- |
| **Time to Insight (TTI)** | < 30 seconds (upload → first chart) | User doesn't wait |
| **Chart Generation Success Rate** | > 90% (valid charts from prompts) | System reliability |
| **Avg Prompt Clarity** | 85%+ unambiguous | Users can ask simple questions |
| **Mobile Responsiveness** | 4.5/5 (user rating) | Works on all devices |

### Secondary Metrics

| Metric | Target | Rationale |
| --- | --- | --- |
| **Avg Charts per Dashboard** | 3-5 | Indicates multi-chart generation is working |
| **Repeat Visit Rate (7-day)** | > 30% | Users find value |
| **Export Rate** | > 20% of charts | Users sharing insights |
| **Error Rate** | < 5% (bad configs) | System stability |
| **LLM Hallucination Rate** | < 2% (invalid columns) | Config validation working |

### Technical Metrics

| Metric | Target | Rationale |
| --- | --- | --- |
| **Backend Response Time** | < 3 seconds | Fast UX |
| **Frontend Render Time** | < 1 second | Smooth interactions |
| **CSV Parse Time (1MB file)** | < 500ms | Local processing efficient |
| **Session Memory Usage** | < 50MB | Large files manageable |

---

## 11. Risk Mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **LLM Hallucination** | High | Strict config validation, catch invalid columns |
| **Large File Performance** | Medium | Implement row limits (100K rows MVP), async processing |
| **Schema Detection Errors** | Medium | Allow user to manually correct types in preview |
| **User Ambiguity** | Medium | Provide suggested questions when unclear |
| **Browser Memory Limits** | Low | Implement server-side processing for future phases |

---

## 12. Success Criteria for MVP Launch

- [ ] User can upload CSV in < 10 seconds
- [ ] System generates accurate schema for 95%+ of datasets
- [ ] User can ask natural language questions and get 2-5 relevant charts
- [ ] All charts render responsively on mobile/tablet/desktop
- [ ] No crashes or unhandled errors during normal usage
- [ ] LLM config validation catches 100% of invalid columns
- [ ] System completes full flow (upload → ask → render) in < 30 seconds

---

## Appendix A: Example User Journeys

### Journey 1: Founder Asks for Burn Rate
```
1. Founder uploads financial.csv (date, expense, revenue, headcount)
2. System infers schema: ✓ 4 columns, 2 metrics (expense, revenue)
3. Founder asks: "What's our monthly burn rate and runway?"
4. System generates 2-chart config:
   - Chart 1: Line chart (date × burn_rate)
   - Chart 2: Single metric card (runway_months)
5. Founder sees dashboards and exports as PNG for board meeting
```

### Journey 2: Growth Lead Analyzes Funnel
```
1. Growth lead uploads events.csv (date, user_id, event, channel)
2. System infers schema: ✓ Date, categorical (event, channel)
3. Growth lead asks: "Show me our signup-to-activation funnel by channel"
4. System generates 2-chart config:
   - Chart 1: Funnel chart (signup → activation → upgrade)
   - Chart 2: Bar chart (funnel drop-off % by channel)
5. Growth lead sees organic has lowest drop-off; decides to optimize paid
```

---

## Appendix B: Example Error Scenarios & Handling

### Error 1: LLM Hallucination
```
User Prompt: "Show me our LTV by channel"
CSV Schema: { date, channel, signups, revenue } ← NO "ltv" column

LLM Response (WRONG): { xAxis: "channel", yAxis: "ltv" }

System Catch:
1. Validation fails (ltv not in schema)
2. Backend returns error: "Column 'ltv' not found"
3. Frontend shows: "I couldn't find an 'LTV' column in your data.
   Did you mean: 'revenue'? Try asking: 'Show me revenue per signup by channel'"
```

### Error 2: Ambiguous Prompt
```
User Prompt: "Analyze this"
CSV Schema: { date, channel, signups, revenue, retention_rate }

System Response:
"I'm not sure what you'd like to see. Did you mean one of these?
- Revenue trends over time
- Signups by marketing channel
- Retention rate distribution
- Revenue vs signups comparison"

User clicks → "Revenue trends" → 1 Line chart rendered
```

### Error 3: File Too Large
```
User uploads: sales_data.csv (100MB)

System Response (413):
"File too large (max 50MB). You can:
- Use a filtered export (e.g., last 90 days)
- Upload a subset of columns
- Contact support for enterprise upload"
```

---

**End of PRD**

**Document Version:** 2.0  
**Last Updated:** January 20, 2026  
**Status:** Ready for Development
