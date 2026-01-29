/**
 * Session Management
 * Stores schema and raw CSV data in memory (temporary, expires after 24h)
 * TODO: Replace with Redis or database in Phase 3
 */

import { SchemaDefinition } from './types';

// ============================================================================
// Session Data Types
// ============================================================================

export interface SessionData {
  sessionId: string;
  fileName: string;
  uploadedAt: string;
  schema: SchemaDefinition;
  csvData: any[]; // Array of row objects from CSV
  expiresAt: number; // Unix timestamp (24h from upload)
}

// ============================================================================
// In-Memory Session Store
// ============================================================================

const sessions = new Map<string, SessionData>();

// ============================================================================
// Session Functions
// ============================================================================

/**
 * Create a new session with schema and CSV data
 */
export function createSession(
  fileName: string,
  schema: SchemaDefinition,
  csvData: any[]
): string {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now

  sessions.set(sessionId, {
    sessionId,
    fileName,
    uploadedAt: new Date().toISOString(),
    schema,
    csvData,
    expiresAt,
  });

  // Clean up expired sessions
  cleanupExpiredSessions();

  return sessionId;
}

/**
 * Get session data by session ID
 * @throws Error if session not found or expired
 */
export async function getSessionData(
  sessionId: string
): Promise<SessionData> {
  const session = sessions.get(sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  // Check if session has expired
  if (session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    throw new Error('Session has expired');
  }

  return session;
}

/**
 * Update session data (e.g., after schema modification)
 */
export function updateSession(
  sessionId: string,
  updates: Partial<SessionData>
): void {
  const session = sessions.get(sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  sessions.set(sessionId, { ...session, ...updates });
}

/**
 * Delete a session
 */
export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions(): void {
  const now = Date.now();

  for (const [sessionId, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(sessionId);
    }
  }
}

/**
 * Get all active sessions (for debugging/admin)
 */
export function getAllSessions(): SessionData[] {
  cleanupExpiredSessions();
  return Array.from(sessions.values());
}

/**
 * Get session count (for monitoring)
 */
export function getSessionCount(): number {
  cleanupExpiredSessions();
  return sessions.size;
}
