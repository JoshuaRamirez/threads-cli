/**
 * Generate and store an API key for ChatGPT Actions integration.
 *
 * Usage:
 *   npx ts-node scripts/generate-api-key.ts <tenantId> [label]
 *
 * Example:
 *   npx ts-node scripts/generate-api-key.ts my-tenant "ChatGPT Threads GPT"
 *
 * Prerequisites:
 *   - Firebase Admin SDK configured (GOOGLE_APPLICATION_CREDENTIALS env var)
 *   - Or running in a Firebase/GCP environment with default credentials
 */

import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

async function main() {
  const tenantId = process.argv[2];
  const label = process.argv[3] || 'API Key';

  if (!tenantId) {
    console.error('Usage: npx ts-node generate-api-key.ts <tenantId> [label]');
    console.error('Example: npx ts-node generate-api-key.ts my-tenant "ChatGPT GPT"');
    process.exit(1);
  }

  // Initialize Firebase Admin
  admin.initializeApp();
  const db = admin.firestore();

  // Generate secure random API key
  const apiKey = crypto.randomBytes(32).toString('hex');
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  // Store in Firestore
  await db.collection('apiKeys').doc(keyHash).set({
    tenantId,
    label,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('\n=== API Key Generated ===\n');
  console.log('Tenant ID:', tenantId);
  console.log('Label:', label);
  console.log('\nAPI Key (keep secret, use in ChatGPT):');
  console.log(apiKey);
  console.log('\nKey Hash (stored in Firestore):');
  console.log(keyHash);
  console.log('\nFirestore document: /apiKeys/' + keyHash);
  console.log('\n=========================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
