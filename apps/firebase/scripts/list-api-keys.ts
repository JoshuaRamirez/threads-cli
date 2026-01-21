/**
 * List all API keys stored in Firestore.
 *
 * Usage:
 *   npx ts-node scripts/list-api-keys.ts [tenantId]
 *
 * Example:
 *   npx ts-node scripts/list-api-keys.ts
 *   npx ts-node scripts/list-api-keys.ts my-tenant
 */

import * as admin from 'firebase-admin';

async function main() {
  const tenantIdFilter = process.argv[2];

  // Initialize Firebase Admin
  admin.initializeApp();
  const db = admin.firestore();

  let query: admin.firestore.Query = db.collection('apiKeys');
  if (tenantIdFilter) {
    query = query.where('tenantId', '==', tenantIdFilter);
  }

  const snapshot = await query.get();

  if (snapshot.empty) {
    console.log('No API keys found.');
    process.exit(0);
  }

  console.log('\n=== API Keys ===\n');
  console.log('Hash (doc ID)                                                    | Tenant ID        | Label                    | Created');
  console.log('-'.repeat(120));

  snapshot.forEach((doc) => {
    const data = doc.data();
    const hash = doc.id.substring(0, 16) + '...';
    const tenant = (data.tenantId || '').padEnd(16);
    const label = (data.label || '').padEnd(24);
    const created = data.createdAt?.toDate?.()?.toISOString?.() || 'Unknown';
    console.log(`${hash} | ${tenant} | ${label} | ${created}`);
  });

  console.log('\n================\n');
  console.log(`Total: ${snapshot.size} key(s)`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
