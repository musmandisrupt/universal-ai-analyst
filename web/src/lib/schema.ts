/**
 * Schema Detection & Analysis
 * Implements PRD Section 5.2: Type Detection Logic
 */

import { ColumnMetadata, SchemaDefinition } from './types';

// ============================================================================
// Type Detection
// ============================================================================

/**
 * Detects column type from sample values
 * Returns: 'date' | 'number' | 'categorical' | 'boolean' | 'string'
 * 
 * Rules from PRD Section 5.2:
 * - Date: Matches YYYY-MM-DD, MM/DD/YYYY, or ISO 8601
 * - Boolean: Only "true"/"false", "yes"/"no", "0"/"1"
 * - Number: Numeric values (int, float, decimal)
 * - Categorical: Unique values < 100 AND cardinality < 20
 * - String: Default fallback
 */
export function detectColumnType(sampleValues: (string | number | boolean)[]): string {
  if (sampleValues.length === 0) return 'string';

  // Filter out null/undefined/empty values
  const validValues = sampleValues.filter(
    (v) => v !== null && v !== undefined && v !== ''
  );

  if (validValues.length === 0) return 'string';

  // Convert all to strings for pattern matching
  const stringValues = validValues.map((v) => String(v).trim());

  // 1. Check for Boolean
  const booleanPatterns = [
    /^(true|false)$/i,
    /^(yes|no)$/i,
    /^(0|1)$/,
  ];
  const allBooleans = stringValues.every((v) =>
    booleanPatterns.some((pattern) => pattern.test(v))
  );
  if (allBooleans && stringValues.length > 0) {
    return 'boolean';
  }

  // 2. Check for Date
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO 8601
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/, // ISO 8601 with Z
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/, // ISO 8601 with milliseconds
  ];
  const allDates = stringValues.every((v) =>
    datePatterns.some((pattern) => pattern.test(v))
  );
  if (allDates && stringValues.length > 0) {
    // Determine date format
    if (stringValues[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
      return 'date'; // Will set format in analyzeSchema
    } else if (stringValues[0].match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return 'date'; // Will set format in analyzeSchema
    } else {
      return 'date'; // ISO 8601
    }
  }

  // 3. Check for Number
  const allNumbers = stringValues.every((v) => {
    const num = Number(v);
    return !isNaN(num) && isFinite(num) && v !== '';
  });
  if (allNumbers && stringValues.length > 0) {
    return 'number';
  }

  // 4. Check for Categorical (unique values < 100 AND cardinality < 20)
  const uniqueValues = new Set(stringValues);
  if (uniqueValues.size < 100 && uniqueValues.size < 20 && stringValues.length > 0) {
    return 'categorical';
  }

  // 5. Default to string
  return 'string';
}

// ============================================================================
// Schema Analysis
// ============================================================================

/**
 * Analyzes CSV rows and generates SchemaDefinition
 * Matches PRD Section 4.1 exactly
 */
export function analyzeSchema(
  csvRows: string[][],
  fileName: string,
  sessionId: string
): SchemaDefinition {
  if (csvRows.length === 0) {
    throw new Error('CSV file is empty');
  }

  const headers = csvRows[0];
  const dataRows = csvRows.slice(1);
  const rowCount = dataRows.length;

  const columns: ColumnMetadata[] = headers.map((header, index) => {
    // Extract column values (skip header row)
    const columnValues = dataRows
      .map((row) => row[index])
      .filter((v) => v !== null && v !== undefined && v !== '');

    // Sample first 100 non-null values
    const sampleValues = columnValues.slice(0, 100).map((v) => {
      // Try to parse as number first
      const num = Number(v);
      if (!isNaN(num) && isFinite(num) && String(v).trim() !== '') {
        return num;
      }
      return String(v).trim();
    });

    // Detect type
    const detectedType = detectColumnType(sampleValues);

    // Build column metadata
    const column: ColumnMetadata = {
      name: header.trim(),
      type: detectedType as ColumnMetadata['type'],
      isMetric: detectedType === 'number',
      sampleValues: sampleValues.slice(0, 3), // PRD shows 3 sample values
    };

    // Add type-specific metadata
    if (detectedType === 'date') {
      // Determine date format
      if (sampleValues.length > 0) {
        const firstValue = String(sampleValues[0]);
        if (firstValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          column.format = 'YYYY-MM-DD';
        } else if (firstValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          column.format = 'MM/DD/YYYY';
        } else if (firstValue.match(/^\d{4}-\d{2}-\d{2}T/)) {
          column.format = 'ISO 8601';
        }
      }
    }

    if (detectedType === 'number') {
      const numericValues = sampleValues
        .map((v) => Number(v))
        .filter((n) => !isNaN(n) && isFinite(n));

      if (numericValues.length > 0) {
        column.min = Math.min(...numericValues);
        column.max = Math.max(...numericValues);
        column.avg =
          numericValues.reduce((sum, n) => sum + n, 0) / numericValues.length;

        // Check if percentage (max <= 100 AND name contains "rate", "percentage", "%")
        const nameLower = column.name.toLowerCase();
        if (
          column.max <= 100 &&
          (nameLower.includes('rate') ||
            nameLower.includes('percentage') ||
            nameLower.includes('%'))
        ) {
          column.isPercentage = true;
        }
      }
    }

    if (detectedType === 'categorical') {
      const uniqueValuesSet = new Set(
        columnValues.map((v) => String(v).trim())
      );
      column.uniqueValues = Array.from(uniqueValuesSet).slice(0, 20); // Limit to 20 for JSON size
      column.cardinality = uniqueValuesSet.size;
    }

    return column;
  });

  // Generate SchemaDefinition matching PRD Section 4.1
  const schema: SchemaDefinition = {
    sessionId,
    fileName,
    uploadedAt: new Date().toISOString(),
    rowCount,
    columns,
  };

  return schema;
}
