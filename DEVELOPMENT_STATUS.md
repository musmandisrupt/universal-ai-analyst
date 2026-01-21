# Development Status & Handoff Document

## Current Phase
**Phase 1: Data Ingestion & Schema Introspection**

## Completed Features
None yet - starting fresh

## In Progress / To Do

### Phase 1 (Cursor) - Data Ingestion
- [ ] FR-01: File Upload
  - CSV file parsing with papaparse
  - File size validation (max 50MB)
  - Component: `/src/components/UploadZone.tsx`
  - API: `/src/app/api/upload/route.ts`

- [ ] FR-02: Schema Introspection
  - Column type detection (date, number, categorical, boolean, string)
  - Statistical analysis (min, max, avg, cardinality)
  - Function: `/src/lib/schema.ts`

- [ ] FR-03: Schema JSON Generation
  - Generate SchemaDefinition per section 4.1 of PRD
  - Output format validation

### Phase 2 (Z.ai) - LLM Intelligence
- [ ] FR-04: Intent Analysis
  - Parse user prompt + schema → IntentAnalysis JSON
  - Function: `/src/lib/llm.ts` → `analyzeIntent()`
  - Use Z.ai API or OpenAI
  - API: `/src/app/api/analyze/route.ts`

- [ ] FR-05: Dynamic Visualization Recommendation
  - Suggest 3-5 relevant charts for vague prompts

- [ ] FR-06: Visualization Config Generation
  - LLM generates VizConfig JSON per section 4.3 of PRD
  - Validation against schema (catch hallucinations)
  - Function: `/src/lib/llm.ts` → `generateVizConfigs()`

- [ ] Data Transformation
  - Transform raw CSV → chart-ready data
  - Use Danfo.js for aggregation
  - API: `/src/app/api/transform/route.ts`

### Phase 3 (Cursor) - Visualization & Rendering
- [ ] FR-09: Chart Rendering (ECharts)
- [ ] FR-10: Interactive Elements (tooltips, export)
- [ ] FR-11: Multi-Chart Dashboard Layout
- [ ] FR-12: Chat Interface
- [ ] FR-13: Dashboard Persistence (PostgreSQL)

---

## Tech Stack
- Frontend: Next.js 14, React, TypeScript, TailwindCSS
- Visualization: Apache ECharts
- Data Processing: Danfo.js
- LLM: Z.ai API or OpenAI
- Database: PostgreSQL

---

## Key Files Structure
```
/src
  /app
    /api
      /upload/route.ts          [CURSOR: Phase 1]
      /analyze/route.ts         [Z.AI: Phase 2]
      /transform/route.ts       [Z.AI: Phase 2]
      /dashboard/save/route.ts  [CURSOR: Phase 3]
    page.tsx                    [CURSOR: Phase 3]
  /components
    UploadZone.tsx              [CURSOR: Phase 1]
    ChatInterface.tsx           [CURSOR: Phase 3]
    ChartGrid.tsx               [CURSOR: Phase 3]
    Chart.tsx                   [CURSOR: Phase 3]
  /lib
    schema.ts                   [CURSOR: Phase 1]
    llm.ts                      [Z.AI: Phase 2]
    transform.ts                [Z.AI: Phase 2]
    types.ts                    [CURSOR: Phase 1]
```

---

## Handoff Instructions

### For Z.ai (when Cursor Phase 1 done):
1. Pull latest: `git pull origin main`
2. Review `/src/lib/schema.ts` and `/src/lib/types.ts`
3. Implement Phase 2: LLM integration (FR-04, FR-05, FR-06)
4. Use PRD section 6.2 for exact LLM prompt templates
5. Commit: `git commit -m "feat: Add LLM intent analysis + config generation (FR-04, FR-05, FR-06)"`
6. Push: `git push origin main`

### For Cursor (when Z.ai Phase 2 done):
1. Pull latest: `git pull origin main`
2. Review `/src/lib/llm.ts` and `/src/app/api/analyze/route.ts`
3. Implement Phase 3: Visualization + UI (FR-09 through FR-13)
4. Use PRD section 8 for UI/UX specs
5. Commit: `git commit -m "feat: Add ECharts visualization + dashboard UI (FR-09 to FR-13)"`
6. Push: `git push origin main`

---

## Reference
- Full PRD: See PRD document
- Section 4: Data Structures & Exact JSON Schemas
- Section 5: Detailed Functional Requirements
- Section 6.2: LLM Prompt Templates
- Section 8: UI/UX Specifications

---

Last Updated: January 21, 2026
Status: Ready for Phase 1 (Cursor)
