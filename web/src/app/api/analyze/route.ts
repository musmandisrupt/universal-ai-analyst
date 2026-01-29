/**
 * POST /api/analyze
 * Handles natural language user prompts and generates visualization configurations
 * Implements PRD Section 6.1: API Contract for /api/analyze
 * Implements FR-04 (Intent Analysis), FR-05 (Visualization Recommendation), FR-06 (VizConfig Generation)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeIntent,
  recommendVisualizations,
  generateVizConfigs,
  convertToIntentAnalysis,
} from '@/lib/llm';
import { getSessionData, createSession, updateSession } from '@/lib/session';
import {
  AnalyzeResponse,
  AnalyzeErrorResponse,
  IntentAnalysis,
  LLMIntentAnalysis,
  ChatMessage,
} from '@/lib/types';
import { csvRowsToObjects } from '@/lib/transform';

/**
 * POST /api/analyze
 * Parse user prompt, generate intent analysis, and return visualization configs
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();
    const { sessionId, userPrompt, chatHistory } = body;

    // Validate required fields
    if (!sessionId) {
      const errorResponse: AnalyzeErrorResponse = {
        success: false,
        error: 'sessionId is required',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (!userPrompt) {
      const errorResponse: AnalyzeErrorResponse = {
        success: false,
        error: 'userPrompt is required',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Get session data
    let sessionData;
    try {
      sessionData = await getSessionData(sessionId);
    } catch (error) {
      const errorResponse: AnalyzeErrorResponse = {
        success: false,
        error: 'Session not found or expired',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const { schema, csvData } = sessionData;

    // Convert CSV rows to objects if needed
    const csvObjects = Array.isArray(csvData) && csvData.length > 0 && Array.isArray(csvData[0])
      ? csvRowsToObjects(csvData as string[][])
      : csvData;

    // Step 1: Parse intent using LLM
    let llmIntent: LLMIntentAnalysis;
    try {
      llmIntent = await analyzeIntent(userPrompt, schema);
    } catch (error) {
      console.error('Error in analyzeIntent:', error);
      const errorResponse: AnalyzeErrorResponse = {
        success: false,
        error: `Failed to analyze intent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestions: [
          'Try asking a more specific question',
          'Make sure your question references columns in your data',
          'Check the schema preview for available columns',
        ],
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Step 2: Recommend visualizations based on intent
    const recommendations = recommendVisualizations(llmIntent, schema);

    // Step 3: Generate VizConfigs for each recommended chart type
    let vizConfigs;
    try {
      vizConfigs = await generateVizConfigs(llmIntent, recommendations, schema);
    } catch (error) {
      console.error('Error in generateVizConfigs:', error);
      const errorResponse: AnalyzeErrorResponse = {
        success: false,
        error: `Failed to generate visualization configurations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestions: [
          'Try asking for a simpler visualization',
          'Check if the data type matches your request',
        ],
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Convert LLM intent to IntentAnalysis format (for backward compatibility)
    const intentAnalysis: IntentAnalysis = convertToIntentAnalysis(llmIntent);

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Build response
    const response: AnalyzeResponse = {
      success: true,
      intentAnalysis,
      vizConfigs,
      metadata: {
        processingTime,
        model: process.env.LLM_MODEL || 'gpt-4o-mini',
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in /api/analyze:', error);
    const errorResponse: AnalyzeErrorResponse = {
      success: false,
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
      suggestions: [
        'Please try again',
        'If the problem persists, contact support',
      ],
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
