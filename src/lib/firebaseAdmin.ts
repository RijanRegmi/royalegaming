import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

if (!admin.apps.length) {
  try {
    // 1. Try loading from service account file in project root
    const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin initialized successfully from firebase-service-account.json');
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (privateKey) {
        console.warn(`Original private key length: ${privateKey.length}`);
        console.warn(`Original starts with: [${privateKey.substring(0, 40)}]`);
        console.warn(`Original ends with: [${privateKey.substring(privateKey.length - 40)}]`);
        
        privateKey = privateKey.trim();
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
          privateKey = privateKey.substring(1, privateKey.length - 1);
        }
        if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
          privateKey = privateKey.substring(1, privateKey.length - 1);
        }
        privateKey = privateKey.replace(/\\n/g, '\n');
        
        console.warn(`Cleaned private key length: ${privateKey.length}`);
        console.warn(`Cleaned starts with: [${privateKey.substring(0, 40)}]`);
        console.warn(`Cleaned ends with: [${privateKey.substring(privateKey.length - 40)}]`);
      }

      if (projectId && clientEmail && privateKey) {
        try {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });
          console.log('Firebase Admin initialized successfully from env vars');
        } catch (initError: any) {
          console.error('Firebase Admin initialization error:', initError);
          console.error(
            `Key details: length=${privateKey.length}, startsWithBegin=${privateKey.startsWith('-----BEGIN PRIVATE KEY-----')}, endsWithEnd=${privateKey.includes('-----END PRIVATE KEY-----')}`
          );
          throw initError;
        }
      } else {
        console.warn(
          'Firebase Admin SDK credentials missing. Push notifications will not be sent.'
        );
      }
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
}

export default admin;
