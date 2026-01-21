/**
 * Revoke (delete) an API key from Firestore.
 *
 * Usage:
 *   npx ts-node scripts/revoke-api-key.ts <keyHash>
 *
 * Example:
 *   npx ts-node scripts/revoke-api-key.ts abc123...
 *
 * Note: You need the full key hash, not the truncated version from list-api-keys.
 *       Get the full hash from the generate output or Firestore console.
 */

import * as admin from 'firebase-admin';

async function main() {
  const keyHash = process.argv[2];

  if (!keyHash) {
    console.error('Usage: npx ts-node revoke-api-key.ts <keyHash>');
    console.error('Example: npx ts-node revoke-api-key.ts abc123def456...');
    process.exit(1);
  }

  // Initialize Firebase Admin
  admin.initializeApp();
  const db = admin.firestore();

  const docRef = db.collection('apiKeys').doc(keyHash);
  const doc = await docRef.get();

  if (!doc.exists) {
    console.error('Error: API key not found with hash:', keyHash);
    process.exit(1);
  }

  const data = doc.data();
  console.log('\nRevoking API key:');
  console.log('  Tenant:', data?.tenantId);
  console.log('  Label:', data?.label);
  console.log('  Hash:', keyHash);

  await docRef.delete();

  console.log('\nAPI key revoked successfully.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
