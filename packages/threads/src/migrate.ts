#!/usr/bin/env node
/**
 * Migration script: JSON → Firebase
 *
 * Reads local ~/.threads/threads.json and writes all data to Firestore.
 *
 * Usage:
 *   npx ts-node packages/threads/src/migrate.ts
 *   node packages/threads/dist/migrate.js
 *
 * Requires:
 *   - Firebase config in ~/.threads/config.json
 *   - GOOGLE_APPLICATION_CREDENTIALS env var or default credentials
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadConfig } from './config';

// Types from threads-core (inline to avoid module resolution issues during migration)
interface Thread {
  id: string;
  name: string;
  [key: string]: unknown;
}
interface Container {
  id: string;
  name: string;
  [key: string]: unknown;
}
interface Group {
  id: string;
  name: string;
  [key: string]: unknown;
}
interface ThreadsData {
  threads: Thread[];
  containers: Container[];
  groups: Group[];
  version: string;
}

const DATA_FILE = path.join(os.homedir(), '.threads', 'threads.json');

interface MigrationStats {
  threads: number;
  containers: number;
  groups: number;
  errors: string[];
}

async function loadJsonData(): Promise<ThreadsData> {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`JSON data file not found: ${DATA_FILE}`);
  }
  const content = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(content) as ThreadsData;
}

async function migrate(): Promise<void> {
  console.log('=== Threads Migration: JSON → Firebase ===\n');

  // Load config
  const config = loadConfig();
  if (config.storage !== 'firebase' || !config.firebase) {
    console.error('Error: Firebase not configured in ~/.threads/config.json');
    console.error('Expected config:');
    console.error('  {');
    console.error('    "storage": "firebase",');
    console.error('    "firebase": {');
    console.error('      "tenantId": "your-tenant-id",');
    console.error('      "projectId": "your-project-id"');
    console.error('    }');
    console.error('  }');
    process.exit(1);
  }

  console.log(`Project: ${config.firebase.projectId}`);
  console.log(`Tenant:  ${config.firebase.tenantId}\n`);

  // Load JSON data
  console.log('Loading JSON data...');
  const data = await loadJsonData();
  console.log(`  Threads:    ${data.threads.length}`);
  console.log(`  Containers: ${data.containers.length}`);
  console.log(`  Groups:     ${data.groups.length}\n`);

  // Initialize Firebase
  console.log('Connecting to Firebase...');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
  let firebaseAdmin: any;
  try {
    firebaseAdmin = require('firebase-admin');
  } catch {
    console.error('Error: firebase-admin package not installed.');
    console.error('Install it with: npm install firebase-admin');
    process.exit(1);
  }

  let app: ReturnType<typeof firebaseAdmin.initializeApp>;
  try {
    app = firebaseAdmin.app();
  } catch {
    app = firebaseAdmin.initializeApp({
      projectId: config.firebase.projectId,
    });
  }

  const db = app.firestore();
  const tenantId = config.firebase.tenantId;

  // Validate tenant ID
  if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
    console.error('Error: Invalid tenantId. Use only alphanumeric, dash, underscore.');
    process.exit(1);
  }

  const stats: MigrationStats = {
    threads: 0,
    containers: 0,
    groups: 0,
    errors: [],
  };

  // Migrate in batches (Firestore limit: 500 writes per batch)
  const BATCH_SIZE = 400;

  // Migrate Groups
  console.log('Migrating groups...');
  for (let i = 0; i < data.groups.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = data.groups.slice(i, i + BATCH_SIZE);
    for (const group of chunk) {
      const ref = db.collection(`tenants/${tenantId}/groups`).doc(group.id);
      batch.set(ref, group);
    }
    try {
      await batch.commit();
      stats.groups += chunk.length;
      process.stdout.write(`  ${stats.groups}/${data.groups.length}\r`);
    } catch (err) {
      stats.errors.push(`Groups batch ${i}: ${err}`);
    }
  }
  console.log(`  ${stats.groups}/${data.groups.length} groups migrated`);

  // Migrate Containers
  console.log('Migrating containers...');
  for (let i = 0; i < data.containers.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = data.containers.slice(i, i + BATCH_SIZE);
    for (const container of chunk) {
      const ref = db.collection(`tenants/${tenantId}/containers`).doc(container.id);
      batch.set(ref, container);
    }
    try {
      await batch.commit();
      stats.containers += chunk.length;
      process.stdout.write(`  ${stats.containers}/${data.containers.length}\r`);
    } catch (err) {
      stats.errors.push(`Containers batch ${i}: ${err}`);
    }
  }
  console.log(`  ${stats.containers}/${data.containers.length} containers migrated`);

  // Migrate Threads
  console.log('Migrating threads...');
  for (let i = 0; i < data.threads.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = data.threads.slice(i, i + BATCH_SIZE);
    for (const thread of chunk) {
      const ref = db.collection(`tenants/${tenantId}/threads`).doc(thread.id);
      batch.set(ref, thread);
    }
    try {
      await batch.commit();
      stats.threads += chunk.length;
      process.stdout.write(`  ${stats.threads}/${data.threads.length}\r`);
    } catch (err) {
      stats.errors.push(`Threads batch ${i}: ${err}`);
    }
  }
  console.log(`  ${stats.threads}/${data.threads.length} threads migrated`);

  // Summary
  console.log('\n=== Migration Complete ===');
  console.log(`Groups:     ${stats.groups}`);
  console.log(`Containers: ${stats.containers}`);
  console.log(`Threads:    ${stats.threads}`);

  if (stats.errors.length > 0) {
    console.log(`\nErrors (${stats.errors.length}):`);
    for (const err of stats.errors) {
      console.log(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log('\nTo use Firebase storage, ensure config.json has:');
  console.log('  "storage": "firebase"');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
