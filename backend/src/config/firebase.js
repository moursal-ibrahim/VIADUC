import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db = null;
let auth = null;

/** Resolve a Firebase service account from inline env vars or a JSON key file. */
function resolveServiceAccount() {
  const { projectId, clientEmail, privateKey, serviceAccountPath } = env.firebase;

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  const candidatePath = serviceAccountPath
    ? path.resolve(process.cwd(), serviceAccountPath)
    : path.resolve(__dirname, '../../serviceAccountKey.json');

  if (fs.existsSync(candidatePath)) {
    try {
      const json = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
      return {
        projectId: json.project_id,
        clientEmail: json.client_email,
        privateKey: json.private_key,
      };
    } catch (err) {
      console.error('[Viaduc] Failed to read Firebase service account JSON:', err.message);
    }
  }

  return null;
}

export function initFirebase() {
  if (admin.apps.length > 0) {
    db = admin.firestore();
    auth = admin.auth();
    return { db, auth };
  }

  const serviceAccount = resolveServiceAccount();

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log(`[Viaduc] Firebase connected — project: ${serviceAccount.projectId}`);
  } else {
    console.warn(
      '[Viaduc] Firebase credentials missing — using mock in-memory store for development.'
    );
    return { db: null, auth: null };
  }

  db = admin.firestore();
  auth = admin.auth();
  return { db, auth };
}

export function getDb() {
  if (!db && admin.apps.length > 0) {
    db = admin.firestore();
  }
  return db;
}

export function getAuth() {
  if (!auth && admin.apps.length > 0) {
    auth = admin.auth();
  }
  return auth;
}

export { admin };
