/**
 * POST /api/upload
 * Handles CSV file upload, validation, parsing, and schema analysis
 * Implements PRD Section 6.1: API Contract for /api/upload
 */

import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { analyzeSchema } from '@/lib/schema';
import { createSession, getSessionData } from '@/lib/session';
import { UploadResponse, UploadErrorResponse } from '@/lib/types';
import { csvRowsToObjects } from '@/lib/transform';

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      const errorResponse: UploadErrorResponse = {
        success: false,
        error: 'No file provided',
        code: 'FILE_INVALID_TYPE',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate file type (CSV only for MVP)
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv')) {
      const errorResponse: UploadErrorResponse = {
        success: false,
        error: 'Invalid file type. Please upload a CSV file.',
        code: 'FILE_INVALID_TYPE',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate file size (max 50MB)
    if (file.size > MAX_FILE_SIZE) {
      const errorResponse: UploadErrorResponse = {
        success: false,
        error: 'File too large (max 50MB). Please upload a smaller file.',
        code: 'FILE_TOO_LARGE',
      };
      return NextResponse.json(errorResponse, { status: 413 });
    }

    // Read file content
    const fileContent = await file.text();

    // Parse CSV using Papa Parse
    let csvRows: string[][] = [];
    try {
      const parseResult = Papa.parse<string[]>(fileContent, {
        header: false,
        skipEmptyLines: true,
        transformHeader: undefined,
      });

      if (parseResult.errors.length > 0) {
        // Log errors but continue if we have data
        console.warn('CSV parse warnings:', parseResult.errors);
      }

      csvRows = parseResult.data;

      if (csvRows.length === 0) {
        throw new Error('CSV file is empty or has no valid rows');
      }

      // Ensure we have headers
      if (csvRows.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row');
      }
    } catch (parseError) {
      const errorResponse: UploadErrorResponse = {
        success: false,
        error:
          parseError instanceof Error
            ? `Failed to parse CSV: ${parseError.message}`
            : 'Failed to parse CSV. Make sure it has headers in the first row.',
        code: 'FILE_PARSE_ERROR',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Analyze schema
    let schema;
    try {
      schema = analyzeSchema(csvRows, file.name, '');
    } catch (schemaError) {
      const errorResponse: UploadErrorResponse = {
        success: false,
        error:
          schemaError instanceof Error
            ? `Schema analysis failed: ${schemaError.message}`
            : 'Schema analysis failed',
        code: 'FILE_PARSE_ERROR',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Convert CSV rows to objects for storage
    const csvObjects = csvRowsToObjects(csvRows);

    // Create session with schema and CSV data
    const sessionId = createSession(file.name, schema, csvObjects);

    // Generate preview: first 5 rows as objects
    const headers = csvRows[0];
    const previewRows = csvRows.slice(1, 6); // First 5 data rows
    const preview = previewRows.map((row) => {
      const obj: Record<string, string | number | boolean> = {};
      headers.forEach((header, index) => {
        const value = row[index] || '';
        // Try to parse as number
        const num = Number(value);
        if (!isNaN(num) && isFinite(num) && String(value).trim() !== '') {
          obj[header] = num;
        } else {
          obj[header] = String(value);
        }
      });
      return obj;
    });

    // Return success response matching PRD Section 6.1
    const response: UploadResponse = {
      success: true,
      sessionId,
      schema,
      preview,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Upload error:', error);
    const errorResponse: UploadErrorResponse = {
      success: false,
      error:
        error instanceof Error
          ? `Unexpected error: ${error.message}`
          : 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Export function to get session data (for backward compatibility)
// Note: This is now imported from '@/lib/session'
export { getSessionData } from '@/lib/session';
