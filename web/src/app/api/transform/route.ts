/**
 * POST /api/transform
 * Transforms raw CSV data into chart-ready datasets based on VizConfigs
 * Implements PRD Section 6.1: API Contract for /api/transform
 * Implements FR-07: Data Processing & Aggregation
 */

import { NextRequest, NextResponse } from 'next/server';
import { transformMultipleVizConfigs, csvRowsToObjects } from '@/lib/transform';
import { getSessionData } from '@/lib/session';
import {
  TransformResponse,
  TransformErrorResponse,
  VizConfig,
} from '@/lib/types';

/**
 * POST /api/transform
 * Process CSV + VizConfig → aggregated data for rendering
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { sessionId, vizConfigs } = body;

    // Validate required fields
    if (!sessionId) {
      const errorResponse: TransformErrorResponse = {
        success: false,
        error: 'sessionId is required',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (!vizConfigs || !Array.isArray(vizConfigs) || vizConfigs.length === 0) {
      const errorResponse: TransformErrorResponse = {
        success: false,
        error: 'vizConfigs is required and must be a non-empty array',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate VizConfig structure
    for (const config of vizConfigs) {
      if (!config.id || !config.chartType) {
        const errorResponse: TransformErrorResponse = {
          success: false,
          error: 'Each VizConfig must have id and chartType',
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }
    }

    // Get session data
    let sessionData;
    try {
      sessionData = await getSessionData(sessionId);
    } catch (error) {
      const errorResponse: TransformErrorResponse = {
        success: false,
        error: 'Session not found or expired',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const { csvData, schema } = sessionData;

    // Convert CSV rows to objects if needed
    const csvObjects = Array.isArray(csvData) && csvData.length > 0 && Array.isArray(csvData[0])
      ? csvRowsToObjects(csvData as string[][])
      : csvData;

    // Transform data for each VizConfig
    const processedData = await transformMultipleVizConfigs(
      csvObjects,
      vizConfigs as VizConfig[],
      schema
    );

    // Build response
    const response: TransformResponse = {
      success: true,
      processedData,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in /api/transform:', error);
    const errorResponse: TransformErrorResponse = {
      success: false,
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
