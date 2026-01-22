/**
 * REST API for ChatGPT Actions (OpenAI custom GPT integration).
 *
 * All endpoints require Bearer token authentication via API key.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FirestoreStore } from '@redjay/threads-firebase-storage';
import { Thread, Importance } from '@redjay/threads-core';
import { v4 as uuidv4 } from 'uuid';

// Validation constants
const VALID_STATUS = ['active', 'paused', 'stopped', 'completed', 'archived'] as const;
const VALID_TEMPERATURE = ['frozen', 'freezing', 'cold', 'tepid', 'warm', 'hot'] as const;
const VALID_SIZE = ['tiny', 'small', 'medium', 'large', 'huge'] as const;
const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_PROGRESS_NOTE_LENGTH = 5000;
const MAX_TAGS_COUNT = 50;
const MAX_FUTURE_OFFSET_HOURS = 24;

interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate thread enum fields.
 */
function validateEnums(data: Partial<CreateThreadRequest | UpdateThreadRequest>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (data.status !== undefined && !VALID_STATUS.includes(data.status as typeof VALID_STATUS[number])) {
    errors.push({
      field: 'status',
      message: `Invalid status. Must be one of: ${VALID_STATUS.join(', ')}`,
    });
  }

  if (data.temperature !== undefined && !VALID_TEMPERATURE.includes(data.temperature as typeof VALID_TEMPERATURE[number])) {
    errors.push({
      field: 'temperature',
      message: `Invalid temperature. Must be one of: ${VALID_TEMPERATURE.join(', ')}`,
    });
  }

  if (data.size !== undefined && !VALID_SIZE.includes(data.size as typeof VALID_SIZE[number])) {
    errors.push({
      field: 'size',
      message: `Invalid size. Must be one of: ${VALID_SIZE.join(', ')}`,
    });
  }

  if (data.importance !== undefined) {
    const imp = data.importance;
    if (typeof imp !== 'number' || !Number.isInteger(imp) || imp < 1 || imp > 5) {
      errors.push({
        field: 'importance',
        message: 'Invalid importance. Must be an integer between 1 and 5',
      });
    }
  }

  return errors;
}

/**
 * Validate string fields for length constraints.
 */
function validateStrings(data: Partial<CreateThreadRequest | UpdateThreadRequest>, requireName: boolean): ValidationError[] {
  const errors: ValidationError[] = [];

  if (requireName) {
    if (typeof data.name !== 'string') {
      errors.push({
        field: 'name',
        message: 'Name is required and must be a string',
      });
    } else if (!data.name.trim()) {
      errors.push({
        field: 'name',
        message: 'Name is required and cannot be empty',
      });
    } else if (data.name.trim().length > MAX_NAME_LENGTH) {
      errors.push({
        field: 'name',
        message: `Name exceeds maximum length of ${MAX_NAME_LENGTH} characters`,
      });
    }
  } else if (data.name !== undefined) {
    if (typeof data.name !== 'string') {
      errors.push({
        field: 'name',
        message: 'Name must be a string',
      });
    } else if (!data.name.trim()) {
      errors.push({
        field: 'name',
        message: 'Name cannot be empty',
      });
    } else if (data.name.trim().length > MAX_NAME_LENGTH) {
      errors.push({
        field: 'name',
        message: `Name exceeds maximum length of ${MAX_NAME_LENGTH} characters`,
      });
    }
  }

  if (data.description !== undefined) {
    if (typeof data.description !== 'string') {
      errors.push({
        field: 'description',
        message: 'Description must be a string',
      });
    } else if (data.description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push({
        field: 'description',
        message: `Description exceeds maximum length of ${MAX_DESCRIPTION_LENGTH} characters`,
      });
    }
  }

  return errors;
}

/**
 * Validate tags array.
 * Returns sanitized tags (filtered to strings only, limited count) and any errors.
 */
function validateTags(tags: unknown): { sanitized: string[]; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (tags === undefined) {
    return { sanitized: [], errors };
  }

  if (!Array.isArray(tags)) {
    errors.push({
      field: 'tags',
      message: 'Tags must be an array',
    });
    return { sanitized: [], errors };
  }

  // Filter to strings only, trim and remove empty
  const stringTags = tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  if (stringTags.length > MAX_TAGS_COUNT) {
    errors.push({
      field: 'tags',
      message: `Tags exceed maximum count of ${MAX_TAGS_COUNT}`,
    });
    return { sanitized: stringTags.slice(0, MAX_TAGS_COUNT), errors };
  }

  return { sanitized: stringTags, errors };
}

/**
 * Validate timestamp format (ISO 8601).
 */
function validateTimestamp(timestamp: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (timestamp === undefined) return errors;

  if (typeof timestamp !== 'string') {
    errors.push({ field: 'timestamp', message: 'Timestamp must be an ISO 8601 string' });
    return errors;
  }

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    errors.push({ field: 'timestamp', message: 'Invalid timestamp format' });
    return errors;
  }

  const maxFuture = new Date(Date.now() + MAX_FUTURE_OFFSET_HOURS * 60 * 60 * 1000);
  if (date > maxFuture) {
    errors.push({
      field: 'timestamp',
      message: `Timestamp cannot be more than ${MAX_FUTURE_OFFSET_HOURS} hours in the future`,
    });
  }
  return errors;
}

/**
 * Validate UUID format for parentId and groupId.
 */
function validateUUIDs(data: { parentId?: string | null; groupId?: string | null }): ValidationError[] {
  const errors: ValidationError[] = [];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (data.parentId !== undefined && data.parentId !== null && !uuidRegex.test(data.parentId)) {
    errors.push({ field: 'parentId', message: 'Invalid parentId format (must be a valid UUID)' });
  }
  if (data.groupId !== undefined && data.groupId !== null && !uuidRegex.test(data.groupId)) {
    errors.push({ field: 'groupId', message: 'Invalid groupId format (must be a valid UUID)' });
  }
  return errors;
}

/**
 * Validate progress note.
 */
function validateProgressNote(note: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!note || typeof note !== 'string' || !note.trim()) {
    errors.push({
      field: 'note',
      message: 'Note is required and cannot be empty',
    });
    return errors;
  }

  if (note.length > MAX_PROGRESS_NOTE_LENGTH) {
    errors.push({
      field: 'note',
      message: `Note exceeds maximum length of ${MAX_PROGRESS_NOTE_LENGTH} characters`,
    });
  }

  return errors;
}

/**
 * Validate a create thread request. Returns errors and sanitized tags.
 */
function validateCreateRequest(body: CreateThreadRequest): { errors: ValidationError[]; sanitizedTags: string[] } {
  const enumErrors = validateEnums(body);
  const stringErrors = validateStrings(body, true);
  const { sanitized: sanitizedTags, errors: tagErrors } = validateTags(body.tags);
  const uuidErrors = validateUUIDs(body);

  return {
    errors: [...enumErrors, ...stringErrors, ...tagErrors, ...uuidErrors],
    sanitizedTags,
  };
}

/**
 * Validate an update thread request. Returns errors and sanitized tags if provided.
 */
function validateUpdateRequest(body: UpdateThreadRequest): { errors: ValidationError[]; sanitizedTags?: string[] } {
  const enumErrors = validateEnums(body);
  const stringErrors = validateStrings(body, false);
  const { sanitized: sanitizedTags, errors: tagErrors } = body.tags !== undefined
    ? validateTags(body.tags)
    : { sanitized: undefined as string[] | undefined, errors: [] };
  const uuidErrors = validateUUIDs(body);

  return {
    errors: [...enumErrors, ...stringErrors, ...tagErrors, ...uuidErrors],
    sanitizedTags,
  };
}

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
  // CORS headers - restrict to ChatGPT domains only
  const allowedOrigins = [
    'https://chat.openai.com',
    'https://chatgpt.com',
    'https://platform.openai.com'
  ];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }
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

      const { errors, sanitizedTags } = validateCreateRequest(body);
      if (errors.length > 0) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
        return;
      }

      const now = new Date().toISOString();
      const thread: Thread = {
        type: 'thread',
        id: uuidv4(),
        name: body.name.trim(),
        description: body.description ?? '',
        status: body.status ?? 'active',
        temperature: body.temperature ?? 'warm',
        size: body.size ?? 'medium',
        importance: body.importance ?? 3,
        tags: sanitizedTags,
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
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (threadId && !uuidRegex.test(threadId)) {
      res.status(400).json({ error: 'Invalid thread ID format' });
      return;
    }

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

      const { errors, sanitizedTags } = validateUpdateRequest(body);
      if (errors.length > 0) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
        return;
      }

      // Build update payload with sanitized values
      const updatePayload: Partial<Thread> = { ...body };
      if (body.name !== undefined) {
        updatePayload.name = body.name.trim();
      }
      if (sanitizedTags !== undefined) {
        updatePayload.tags = sanitizedTags;
      }

      // Use Firestore transaction to atomically update and return
      const db = admin.firestore();
      const threadRef = db.collection(`tenants/${tenantId}/threads`).doc(threadId);

      try {
        const updatedThread = await db.runTransaction(async (transaction) => {
          const threadDoc = await transaction.get(threadRef);
          if (!threadDoc.exists) {
            throw new Error('Thread not found');
          }

          const currentData = threadDoc.data() as Thread;
          const newData = {
            ...currentData,
            ...updatePayload,
            updatedAt: new Date().toISOString(),
          };

          transaction.set(threadRef, newData);
          return newData;
        });

        res.json({ thread: updatedThread });
      } catch (error) {
        if (error instanceof Error && error.message === 'Thread not found') {
          res.status(404).json({ error: 'Thread not found' });
        } else {
          console.error('Transaction failed:', error);
          res.status(500).json({ error: 'Failed to update thread' });
        }
      }
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

      const noteErrors = validateProgressNote(body.note);
      const timestampErrors = validateTimestamp(body.timestamp);
      const allErrors = [...noteErrors, ...timestampErrors];
      if (allErrors.length > 0) {
        res.status(400).json({
          error: 'Validation failed',
          details: allErrors,
        });
        return;
      }

      const progressEntry = {
        id: uuidv4(),
        note: body.note.trim(),
        timestamp: body.timestamp ?? new Date().toISOString(),
      };

      // Use Firestore transaction to safely append progress
      const db = admin.firestore();
      const threadRef = db.collection(`tenants/${tenantId}/threads`).doc(threadId);

      try {
        await db.runTransaction(async (transaction) => {
          const threadDoc = await transaction.get(threadRef);
          if (!threadDoc.exists) {
            throw new Error('Thread not found');
          }

          const threadData = threadDoc.data() as Thread;
          // Ensure progress is an array before spreading
          const existingProgress = Array.isArray(threadData.progress) ? threadData.progress : [];
          const updatedProgress = [...existingProgress, progressEntry];

          transaction.update(threadRef, {
            progress: updatedProgress,
            updatedAt: new Date().toISOString(),
          });
        });

        res.status(201).json({ progress: progressEntry });
      } catch (error) {
        if (error instanceof Error && error.message === 'Thread not found') {
          res.status(404).json({ error: 'Thread not found' });
        } else {
          console.error('Transaction failed:', error);
          res.status(500).json({ error: 'Failed to add progress' });
        }
      }
      return;
    }

    // Unknown route
    res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
