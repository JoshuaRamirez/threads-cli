/**
 * Firebase Cloud Functions entry point for Threads platform.
 *
 * Exports:
 * - api/* : REST API endpoints for ChatGPT Actions
 * - mcp/* : MCP server endpoints (future)
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export API endpoints
export * from './api';

// Export MCP endpoints (placeholder)
// export * from './mcp';
