'use client';

/**
 * Main Page - Universal AI Analyst
 * Phase 1: Data Ingestion & Schema Introspection
 * Phase 2: LLM Intelligence & Dynamic Visualization Engine
 */

import { useState } from 'react';
import UploadZone from '@/components/UploadZone';
import ChatInterface from '@/components/ChatInterface';
import { UploadResponse } from '@/lib/types';

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [schema, setSchema] = useState<any>(null);
  const [vizConfigs, setVizConfigs] = useState<any[]>([]);
  const [showChat, setShowChat] = useState(false);

  const handleUploadSuccess = (data: UploadResponse) => {
    console.log('Upload successful:', data);
    setSessionId(data.sessionId);
    setSchema(data.schema);
    setShowChat(true); // Show chat interface after upload
  };

  const handleVizConfigsGenerated = (configs: any[]) => {
    console.log('Viz configs generated:', configs);
    setVizConfigs(configs);
  };

  const handleBackToUpload = () => {
    setShowChat(false);
    setVizConfigs([]);
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
        {!showChat ? (
          <div className="space-y-8">
            {/* Chat Interface */}
            <div className="mb-8">
              <button
                onClick={handleBackToUpload}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
              >
                ← Back to Upload
              </button>
            </div>
            
            {sessionId && schema && (
              <ChatInterface
                sessionId={sessionId}
                schema={schema}
                onVizConfigsGenerated={handleVizConfigsGenerated}
              />
            )}
          </div>
        ) : (
          <div className="space-y-8">
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
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Phase 1: Data Ingestion & Schema Introspection
            {' '}
            Phase 2: LLM Intelligence & Dynamic Visualization Engine
          </p>
        </div>
      </footer>
    </div>
  );
}
