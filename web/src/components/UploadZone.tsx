'use client';

/**
 * UploadZone Component
 * Handles CSV file upload with drag-and-drop, validation, preview, and error handling
 * Implements PRD Section 8: UI/UX Specifications
 */

import { useState, useCallback, useRef } from 'react';
import {
  UploadResponse,
  UploadErrorResponse,
  SchemaDefinition,
} from '@/lib/types';

interface UploadZoneProps {
  onUploadSuccess?: (data: UploadResponse) => void;
}

export default function UploadZone({ onUploadSuccess }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    // Reset state
    setError(null);
    setUploadResult(null);
    setSelectedFile(file);

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Invalid file type. Please upload a CSV file.');
      return;
    }

    // Validate file size (50MB max)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError('File too large (max 50MB). Please upload a smaller file.');
      return;
    }

    // Upload file
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as UploadErrorResponse;
        setError(errorData.error || 'Upload failed');
        setSelectedFile(null);
        return;
      }

      const successData = data as UploadResponse;
      setUploadResult(successData);
      setError(null);

      // Call success callback if provided
      if (onUploadSuccess) {
        onUploadSuccess(successData);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Upload failed: ${err.message}`
          : 'An unexpected error occurred'
      );
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  // File input change handler
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  // Click to browse
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get type badge color
  const getTypeBadgeColor = (type: string): string => {
    switch (type) {
      case 'date':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'number':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'categorical':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'boolean':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Upload Zone */}
      {!uploadResult && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
              : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900'
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="text-center">
            {isUploading ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Uploading and analyzing your CSV file...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div>
                  <button
                    onClick={handleClick}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Select CSV file
                  </button>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    or drag and drop
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  CSV files only, max 50MB
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success: Schema Preview */}
      {uploadResult && (
        <div className="space-y-6">
          {/* File Info */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  File Uploaded Successfully
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {uploadResult.schema.fileName} •{' '}
                  {uploadResult.schema.rowCount.toLocaleString()} rows • Session:{' '}
                  {uploadResult.sessionId}
                </p>
              </div>
              <div className="flex-shrink-0">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  ✓ Ready
                </span>
              </div>
            </div>
          </div>

          {/* Schema Preview */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Schema Detected
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploadResult.schema.columns.map((column, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {column.name}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getTypeBadgeColor(
                        column.type
                      )}`}
                    >
                      {column.type}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    {column.type === 'number' && (
                      <>
                        {column.min !== undefined && (
                          <div>Min: {column.min}</div>
                        )}
                        {column.max !== undefined && (
                          <div>Max: {column.max}</div>
                        )}
                        {column.avg !== undefined && (
                          <div>Avg: {column.avg.toFixed(2)}</div>
                        )}
                        {column.isPercentage && (
                          <div className="text-purple-600 dark:text-purple-400">
                            Percentage
                          </div>
                        )}
                      </>
                    )}
                    {column.type === 'categorical' && (
                      <>
                        {column.cardinality !== undefined && (
                          <div>Values: {column.cardinality}</div>
                        )}
                        {column.uniqueValues && column.uniqueValues.length > 0 && (
                          <div className="mt-1">
                            Sample:{' '}
                            {column.uniqueValues.slice(0, 3).join(', ')}
                            {column.uniqueValues.length > 3 && '...'}
                          </div>
                        )}
                      </>
                    )}
                    {column.type === 'date' && column.format && (
                      <div>Format: {column.format}</div>
                    )}
                    {column.sampleValues.length > 0 && (
                      <div className="mt-1 text-gray-500">
                        Sample: {String(column.sampleValues[0])}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Preview */}
          {uploadResult.preview.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Data Preview (First 5 Rows)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {Object.keys(uploadResult.preview[0]).map((key) => (
                        <th
                          key={key}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {uploadResult.preview.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {Object.values(row).map((value, colIndex) => (
                          <td
                            key={colIndex}
                            className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                          >
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Confirm Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (onUploadSuccess) {
                  onUploadSuccess(uploadResult);
                }
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Confirm & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
