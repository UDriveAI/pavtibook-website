import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

/**
 * Singleton Initialization for Firebase Admin SDK
 * Configures connection to Firestore database using modern modular APIs.
 * Required Env Variables:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_PRIVATE_KEY
 */

let firestoreDb: Firestore | null = null;

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("Firebase Server Credentials Missing: Form submissions will not be saved to Firestore until config is set.");
  } else {
    try {
      // Support double-encoded newline characters in private key strings
      if (privateKey.includes("\\n")) {
        privateKey = privateKey.replace(/\\n/g, "\n");
      }

      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log("Firebase Admin SDK modular singleton initialized successfully.");
    } catch (error) {
      console.error("Firebase Admin SDK initialization failed:", error);
    }
  }
}

if (getApps().length) {
  firestoreDb = getFirestore();
}

export const db = firestoreDb;
