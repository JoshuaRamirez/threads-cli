/**
 * REST API for ChatGPT Actions (OpenAI custom GPT integration).
 *
 * All endpoints require Bearer token authentication via API key.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FirestoreStore } from '@joshua2048/threads-firebase-storage';
import { Thread, Importance } from '@joshua2048/threads-core';
import { v4 as uuidv4 } from 'uuid';

// Types for request validation
interface CreateThreadRequest {
  name: string;
  description?: string;
  status?: Thread['status'];
  temperature?: Thread['temperature'];
  size?: Thread['size'];
  importance?: Importance;
  tags?: string[];
  parentId?: string | null;
  groupId?: string | null;
}

interface UpdateThreadRequest {
  name?: string;
  description?: string;
  status?: Thread['status'];
  temperature?: Thread['temperature'];
  size?: Thread['size'];
  importance?: Importance;
  tags?: string[];
  parentId?: string | null;
  groupId?: string | null;
}

interface AddProgressRequest {
  note: string;
  timestamp?: string;
}

/**
 * Validate API key and extract tenant ID.
 * API keys are stored in Firestore: /apiKeys/{keyHash} -> { tenantId, createdAt }
 */
async function validateApiKey(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const apiKey = authHeader.substring(7);
  const db = admin.firestore();

  // Hash the API key for lookup (simple SHA256)
  const crypto = await import('crypto');
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const keyDoc = await db.collection('apiKeys').doc(keyHash).get();
  if (!keyDoc.exists) {
    return null;
  }

  const data = keyDoc.data();
  return data?.tenantId ?? null;
}

/**
 * Create a store instance for the authenticated tenant.
 */
function getStore(tenantId: string): FirestoreStore {
  return new FirestoreStore({
    firestore: admin.firestore(),
    tenantId,
  });
}

/**
 * Threads API - HTTPS callable function.
 *
 * Routes:
 * - GET    /threads          List all threads
 * - POST   /threads          Create thread
 * - GET    /threads/:id      Get thread by ID
 * - PUT    /threads/:id      Update thread
 * - DELETE /threads/:id      Delete thread
 * - POST   /threads/:id/progress  Add progress note
 */
export const threads = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Authenticate
  const tenantId = await validateApiKey(req.headers.authorization);
  if (!tenantId) {
    res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
    return;
  }

  const store = getStore(tenantId);
  const pathParts = req.path.split('/').filter(Boolean);

  try {
    // GET /threads - List all threads
    if (req.method === 'GET' && pathParts.length === 0) {
      const threads = await store.getAllThreads();
      res.json({ threads });
      return;
    }

    // POST /threads - Create thread
    if (req.method === 'POST' && pathParts.length === 0) {
      const body = req.body as CreateThreadRequest;
      if (!body.name) {
        res.status(400).json({ error: 'Missing required field: name' });
        return;
      }

      const now = new Date().toISOString();
      const thread: Thread = {
        type: 'thread',
        id: uuidv4(),
        name: body.name,
        description: body.description ?? '',
        status: body.status ?? 'active',
        temperature: body.temperature ?? 'warm',
        size: body.size ?? 'medium',
        importance: body.importance ?? 3,
        tags: body.tags ?? [],
        parentId: body.parentId ?? null,
        groupId: body.groupId ?? null,
        dependencies: [],
        progress: [],
        details: [],
        createdAt: now,
        updatedAt: now,
      };

      await store.addThread(thread);
      res.status(201).json({ thread });
      return;
    }

    // Routes with thread ID
    const threadId = pathParts[0];

    // GET /threads/:id - Get thread
    if (req.method === 'GET' && pathParts.length === 1) {
      const thread = await store.getThreadById(threadId);
      if (!thread) {
        res.status(404).json({ error: 'Thread not found' });
        return;
      }
      res.json({ thread });
      return;
    }

    // PUT /threads/:id - Update thread
    if (req.method === 'PUT' && pathParts.length === 1) {
      const body = req.body as UpdateThreadRequest;
      const success = await store.updateThread(threadId, body);
      if (!success) {
        res.status(404).json({ error: 'Thread not found' });
        return;
      }
      const thread = await store.getThreadById(threadId);
      res.json({ thread });
      return;
    }

    // DELETE /threads/:id - Delete thread
    if (req.method === 'DELETE' && pathParts.length === 1) {
      const success = await store.deleteThread(threadId);
      if (!success) {
        res.status(404).json({ error: 'Thread not found' });
        return;
      }
      res.json({ success: true });
      return;
    }

    // POST /threads/:id/progress - Add progress
    if (req.method === 'POST' && pathParts.length === 2 && pathParts[1] === 'progress') {
      const body = req.body as AddProgressRequest;
      if (!body.note) {
        res.status(400).json({ error: 'Missing required field: note' });
        return;
      }

      const thread = await store.getThreadById(threadId);
      if (!thread) {
        res.status(404).json({ error: 'Thread not found' });
        return;
      }

      const progressEntry = {
        id: uuidv4(),
        note: body.note,
        timestamp: body.timestamp ?? new Date().toISOString(),
      };

      const progress = [...(thread.progress ?? []), progressEntry];
      await store.updateThread(threadId, { progress });

      res.status(201).json({ progress: progressEntry });
      return;
    }

    // Unknown route
    res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
