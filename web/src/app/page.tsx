'use client';

/**
 * Main Page - Universal AI Analyst
 * Phase 1: Data Ingestion & Schema Introspection
 */

import UploadZone from '@/components/UploadZone';
import { UploadResponse } from '@/lib/types';

export default function Home() {
  const handleUploadSuccess = (data: UploadResponse) => {
    console.log('Upload successful:', data);
    // TODO: Phase 2 - Navigate to chat/analysis interface
    // For now, just log the session ID
    alert(`File uploaded! Session ID: ${data.sessionId}\n\nReady for Phase 2: LLM Intelligence`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Universal AI Analyst
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Turn your data into insights with natural language
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Upload Your Data
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Upload a CSV file to get started. We'll analyze the schema and prepare
            it for natural language queries.
          </p>
        </div>

        <UploadZone onUploadSuccess={handleUploadSuccess} />
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Phase 1: Data Ingestion & Schema Introspection
          </p>
        </div>
      </footer>
    </div>
  );
}
