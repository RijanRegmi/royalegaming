import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Prefer service account JSON file if present
    const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin initialized from firebase-service-account.json');
    } else {
      // Fall back to environment variables
      const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
      let privateKey = FIREBASE_PRIVATE_KEY;

      if (privateKey) {
        privateKey = privateKey.trim();
        if ((privateKey.startsWith('"') && privateKey.endsWith('"')) ||
            (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
          privateKey = privateKey.slice(1, -1);
        }
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            privateKey,
          }),
        });
        console.log('Firebase Admin initialized from environment variables');
      } else {
        console.warn('Firebase credentials missing – push notifications will be disabled');
      }
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
}

export default admin;
