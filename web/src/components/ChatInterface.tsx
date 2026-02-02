'use client';

/**
 * Chat Interface Component
 * Handles natural language input and displays chat history
 * Implements PRD Section 8: UI/UX Specifications
 */

import { useState, FormEvent } from 'react';
import {
  ChatMessage,
  VizConfig,
  IntentAnalysis,
} from '@/lib/types';

interface ChatInterfaceProps {
  sessionId: string;
  schema: any;
  onVizConfigsGenerated?: (configs: VizConfig[]) => void;
}

export default function ChatInterface({
  sessionId,
  schema,
  onVizConfigsGenerated,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [vizConfigs, setVizConfigs] = useState<VizConfig[]>([]);
  const [intentAnalysis, setIntentAnalysis] = useState<IntentAnalysis | null>(null);

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setInput('');

    try {
      // Add user message to chat
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        sessionId,
        role: 'user',
        content: input,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Call analyze API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          userPrompt: input,
          chatHistory: messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      // Add assistant message with viz configs
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        sessionId,
        role: 'assistant',
        content: data.intentAnalysis.reasoning || 'Here are visualizations for your request:',
        timestamp: new Date().toISOString(),
        vizConfigs: data.vizConfigs,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Update state
      setIntentAnalysis(data.intentAnalysis);
      setVizConfigs(data.vizConfigs);

      // Call parent callback if provided
      if (onVizConfigsGenerated) {
        onVizConfigsGenerated(data.vizConfigs);
      }
    } catch (error) {
      console.error('Error in chat submission:', error);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        sessionId,
        role: 'assistant',
        content: error instanceof Error ? error.message : 'An error occurred',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear chat history
  const handleClearChat = () => {
    setMessages([]);
    setVizConfigs([]);
    setIntentAnalysis(null);
    setInput('');
  };

  // Handle suggested question click
  const handleSuggestedQuestion = async (question: string) => {
    setInput(question);
    // Auto-submit after a short delay
    setTimeout(() => {
      const formEvent = new Event('submit') as any;
      formEvent.preventDefault = () => {};
      handleSubmit(formEvent);
    }, 100);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Chat Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Chat with Your Data
          </h2>
          <button
            onClick={handleClearChat}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Clear Chat
          </button>
        </div>

        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <p className="mb-2">Start a conversation with your data</p>
              <p className="text-sm">
                Try asking questions like:
              </p>
              <ul className="text-sm text-left max-w-md mx-auto mt-4 space-y-1 text-gray-600 dark:text-gray-400">
                <li>• "Show me revenue trends over time"</li>
                <li>• "Which channel drives the most signups?"</li>
                <li>• "Compare revenue across all channels"</li>
                <li>• "What's our retention rate by channel?"</li>
              </ul>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user'
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Suggested Questions */}
        {intentAnalysis?.suggestedQuestions &&
          intentAnalysis.suggestedQuestions.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              Suggested Questions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {intentAnalysis.suggestedQuestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestion(suggestion.question)}
                  className="text-left px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {suggestion.question}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {suggestion.expectedChartType} chart • {suggestion.metrics.join(', ')}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your data..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span>Analyzing...</span>
                </div>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
