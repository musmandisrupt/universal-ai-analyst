/**
 * Data Transformation Layer
 * Transforms raw CSV data into chart-ready datasets using Danfo.js
 * Implements FR-07: Data Processing & Aggregation
 */

import * as dfd from 'danfojs';
import { VizConfig, SchemaDefinition } from './types';

// ============================================================================
// Data Transformation Functions
// ============================================================================

/**
 * Transform raw CSV data → chart-ready data based on VizConfig
 * @param csvData - Array of row objects from CSV
 * @param vizConfig - Visualization configuration
 * @param schema - Schema definition for column types
 * @returns Aggregated data as array of objects
 */
export async function transformDataForViz(
  csvData: any[],
  vizConfig: VizConfig,
  schema: SchemaDefinition
): Promise<any[]> {
  try {
    // Create Danfo DataFrame
    const df = new dfd.DataFrame(csvData);

    // Step 1: Apply filters
    let filteredDf = df;
    if (vizConfig.filters) {
      filteredDf = applyFilters(df, vizConfig.filters, schema);
    }

    // Step 2: Group and aggregate
    let aggregatedDf = filteredDf;
    if (vizConfig.dimensions?.x?.columnName && vizConfig.metrics?.length > 0) {
      aggregatedDf = applyGroupingAndAggregation(
        filteredDf,
        vizConfig,
        schema
      );
    }

    // Step 3: Apply sorting
    let sortedDf = aggregatedDf;
    if (vizConfig.sorting) {
      sortedDf = applySorting(aggregatedDf, vizConfig.sorting);
    }

    // Step 4: Apply limit
    let finalDf = sortedDf;
    if (vizConfig.limit) {
      finalDf = sortedDf.head(vizConfig.limit);
    }

    // Convert to array of objects
    return finalDf.to_json({ orient: 'records' });
  } catch (error) {
    console.error('Error in transformDataForViz:', error);
    throw new Error(
      `Failed to transform data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Apply filters to DataFrame
 */
function applyFilters(
  df: dfd.DataFrame,
  filters: {
    columnName: string;
    operator: string;
    value: string | number | boolean;
    type?: string;
  },
  schema: SchemaDefinition
): dfd.DataFrame {
  const { columnName, operator, value } = filters;

  // Get column type from schema
  const column = schema.columns.find((col) => col.name === columnName);
  if (!column) {
    throw new Error(`Column "${columnName}" not found in schema`);
  }

  // Convert value based on column type
  let filterValue: any = value;
  if (column.type === 'number' && typeof value === 'string') {
    filterValue = parseFloat(value);
  } else if (column.type === 'boolean') {
    filterValue = value === 'true' || value === true || value === 1;
  }

  // Apply filter based on operator
  switch (operator) {
    case '=':
    case 'eq':
      return df.query(df[columnName].eq(filterValue));

    case '>':
    case 'gt':
      return df.query(df[columnName].gt(filterValue));

    case '<':
    case 'lt':
      return df.query(df[columnName].lt(filterValue));

    case '>=':
    case 'gte':
      return df.query(df[columnName].ge(filterValue));

    case '<=':
    case 'lte':
      return df.query(df[columnName].le(filterValue));

    case 'in':
      if (Array.isArray(filterValue)) {
        return df.query(df[columnName].isin(filterValue));
      }
      // Single value, treat as equality
      return df.query(df[columnName].eq(filterValue));

    case 'not_in':
      if (Array.isArray(filterValue)) {
        return df.query(df[columnName].isin(filterValue).not());
      }
      // Single value, treat as inequality
      return df.query(df[columnName].neq(filterValue));

    default:
      throw new Error(`Unsupported filter operator: ${operator}`);
  }
}

/**
 * Apply grouping and aggregation
 */
function applyGroupingAndAggregation(
  df: dfd.DataFrame,
  vizConfig: VizConfig,
  schema: SchemaDefinition
): dfd.DataFrame {
  const groupByCol = vizConfig.dimensions?.x?.columnName;
  const metrics = vizConfig.metrics || [];

  if (!groupByCol || metrics.length === 0) {
    // No grouping needed, return as is
    return df;
  }

  // Build aggregation config
  const aggConfig: Record<string, string> = {};
  for (const metric of metrics) {
    aggConfig[metric.columnName] = metric.aggregation.toLowerCase();
  }

  try {
    // Group by dimension column
    const grouped = df.groupby([groupByCol]);

    // Apply aggregation
    const aggregated = grouped.agg(aggConfig);

    // Reset index to make groupByCol a regular column
    return aggregated.reset_index();
  } catch (error) {
    console.error('Error in grouping/aggregation:', error);
    throw new Error(
      `Failed to group/aggregate: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Apply sorting to DataFrame
 */
function applySorting(
  df: dfd.DataFrame,
  sorting: {
    by: string;
    order: 'ascending' | 'descending';
  }
): dfd.DataFrame {
  const { by, order } = sorting;

  try {
    if (order === 'ascending') {
      return df.sort_values(by, { ascending: true });
    } else {
      return df.sort_values(by, { ascending: false });
    }
  } catch (error) {
    console.error('Error in sorting:', error);
    throw new Error(
      `Failed to sort: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Transform multiple VizConfigs at once
 * @param csvData - Array of row objects from CSV
 * @param vizConfigs - Array of visualization configurations
 * @param schema - Schema definition
 * @returns Array of processed data with metadata
 */
export async function transformMultipleVizConfigs(
  csvData: any[],
  vizConfigs: VizConfig[],
  schema: SchemaDefinition
): Promise<
  Array<{
    vizId: string;
    data: any[];
    metadata: {
      rowCount: number;
      transformations: string[];
      executedAt: string;
    };
  }>
> {
  const results = [];

  for (const config of vizConfigs) {
    try {
      const startTime = Date.now();
      const data = await transformDataForViz(csvData, config, schema);
      const processingTime = Date.now() - startTime;

      // Build transformation description
      const transformations: string[] = [];
      if (config.filters) {
        transformations.push(
          `filter: ${config.filters.columnName} ${config.filters.operator} ${config.filters.value}`
        );
      }
      if (config.dimensions?.x?.columnName) {
        transformations.push(`group: ${config.dimensions.x.columnName}`);
        if (config.metrics?.length > 0) {
          transformations.push(
            `aggregate: ${config.metrics.map((m) => `${m.aggregation}(${m.columnName})`).join(', ')}`
          );
        }
      }
      if (config.sorting) {
        transformations.push(
          `sort: ${config.sorting.by} ${config.sorting.order}`
        );
      }
      if (config.limit) {
        transformations.push(`limit: ${config.limit}`);
      }

      results.push({
        vizId: config.id,
        data,
        metadata: {
          rowCount: data.length,
          transformations,
          executedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(`Error transforming viz config ${config.id}:`, error);
      // Continue with next config, but log error
      results.push({
        vizId: config.id,
        data: [],
        metadata: {
          rowCount: 0,
          transformations: [],
          executedAt: new Date().toISOString(),
        },
      });
    }
  }

  return results;
}

/**
 * Convert raw CSV string[][] to array of objects
 * @param csvRows - 2D array of CSV rows (first row is headers)
 * @returns Array of row objects
 */
export function csvRowsToObjects(csvRows: string[][]): any[] {
  if (csvRows.length === 0) {
    return [];
  }

  const headers = csvRows[0];
  const dataRows = csvRows.slice(1);

  return dataRows.map((row) => {
    const obj: Record<string, any> = {};
    headers.forEach((header, index) => {
      const value = row[index] || '';
      // Try to parse as number
      const num = Number(value);
      if (!isNaN(num) && isFinite(num) && String(value).trim() !== '') {
        obj[header] = num;
      } else if (value.toLowerCase() === 'true' || value === '1') {
        obj[header] = true;
      } else if (value.toLowerCase() === 'false' || value === '0') {
        obj[header] = false;
      } else {
        obj[header] = String(value).trim();
      }
    });
    return obj;
  });
}
