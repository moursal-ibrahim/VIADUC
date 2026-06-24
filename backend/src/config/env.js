import dotenv from 'dotenv';

dotenv.config();

/** Normalize a PEM private key pasted into hosting env vars (Render, etc.). */
function normalizePrivateKey(raw) {
  if (!raw) return undefined;
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key.replace(/\\n/g, '\n');
}

function resolveFirebaseConfig() {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (jsonRaw) {
    try {
      const json = JSON.parse(jsonRaw.trim());
      return {
        projectId: json.project_id || process.env.FIREBASE_PROJECT_ID,
        clientEmail: json.client_email || process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: normalizePrivateKey(json.private_key),
        serviceAccountPath,
      };
    } catch {
      console.warn('[Viaduc] FIREBASE_SERVICE_ACCOUNT_JSON is set but invalid JSON');
    }
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    serviceAccountPath,
  };
}

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'viaduc-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  firebase: resolveFirebaseConfig(),
};
