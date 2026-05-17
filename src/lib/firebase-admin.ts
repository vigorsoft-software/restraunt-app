import * as admin from 'firebase-admin';

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) return;

  try {
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountBase64) {
      const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized successfully');
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT not set. Attempting default initialization.');
      // Initialize without args allows it to pick up GOOGLE_APPLICATION_CREDENTIALS or work in emulator
      // Passing projectId prevents "Unable to detect a Project Id" crashes
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      });
    }
  } catch (error) {
    console.warn('Firebase admin initialization error/warning during build or runtime', error);
  }
}

// Call init
initializeFirebaseAdmin();

// Provide getters to avoid build-time crash if initialization failed but isn't used
export const getAdminDb = () => admin.firestore();
export const getAdminAuth = () => admin.auth();
