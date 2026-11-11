const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function resolveExpectedProjectId() {
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  if (process.env.GCP_PROJECT) return process.env.GCP_PROJECT;
  try {
    const cfg = JSON.parse(process.env.FIREBASE_CONFIG || '{}');
    if (cfg.projectId) return cfg.projectId;
  } catch (_) {
    /* ignore */
  }
  // Production Hostinger / GO7 app project
  return 'go7-app-209e4';
}

function isRunningInCloudFunctions() {
  return Boolean(
    process.env.FUNCTION_TARGET ||
      process.env.FUNCTION_NAME ||
      process.env.K_SERVICE ||
      process.env.K_REVISION ||
      process.env.CLOUD_RUN_JOB
  );
}

function loadServiceAccount() {
  const candidates = [
    path.join(__dirname, 'service-account.json'),
    path.join(__dirname, '..', 'service-account.json'),
  ];

  for (const keyPath of candidates) {
    if (fs.existsSync(keyPath)) {
      return require(keyPath);
    }
  }

  const inlineJson = process.env.SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inlineJson) {
    return JSON.parse(inlineJson);
  }

  return null;
}

if (!admin.apps.length) {
  const expectedProjectId = resolveExpectedProjectId();

  // Cloud Functions already have Application Default Credentials for THIS project.
  // Never mint custom tokens / verify ID tokens with a mismatched local SA
  // (historically go7-delivery) — that breaks WhatsApp OTP login on go7-app-209e4.
  if (isRunningInCloudFunctions()) {
    admin.initializeApp({ projectId: expectedProjectId });
    console.log(
      `ℹ️ Firebase Admin initialized with ADC for ${expectedProjectId} (cloud functions)`
    );
  } else {
    const serviceAccount = loadServiceAccount();
    if (
      serviceAccount?.private_key &&
      serviceAccount.project_id &&
      serviceAccount.project_id === expectedProjectId
    ) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: expectedProjectId,
      });
      console.log(`✅ Firebase Admin initialized with service account for ${expectedProjectId}`);
    } else {
      if (serviceAccount?.project_id && serviceAccount.project_id !== expectedProjectId) {
        console.warn(
          `⚠️ Ignoring service account for "${serviceAccount.project_id}" (expected "${expectedProjectId}"). Using Application Default Credentials.`
        );
      }
      admin.initializeApp({ projectId: expectedProjectId });
      console.log(`ℹ️ Firebase Admin initialized with default credentials for ${expectedProjectId}`);
    }
  }
}

module.exports = admin;
