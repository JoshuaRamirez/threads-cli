# @redjay/threads-firebase-storage

Firebase Firestore storage adapter for the Threads platform. Enables cloud-based storage with real-time sync capabilities.

## Installation

```bash
npm install @redjay/threads-firebase-storage firebase-admin
```

Note: `firebase-admin` is a peer dependency and must be installed separately.

## Usage

```typescript
import { FirebaseStorageAdapter } from '@redjay/threads-firebase-storage';
import * as admin from 'firebase-admin';

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const storage = new FirebaseStorageAdapter({
  firestore: admin.firestore()
});

// Use storage adapter
const threads = await storage.getAllThreads();
```

## Features

- Cloud-based Firestore storage
- Real-time sync across devices
- Scalable for large datasets
- Firebase security rules support

## Configuration

Requires Firebase Admin SDK initialization with appropriate credentials. See [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup) for details.

## License

MIT
