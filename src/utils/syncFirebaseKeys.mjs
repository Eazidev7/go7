#!/usr/bin/env node
/**
 * Pull API keys from Firebase CLI and write local config files.
 * Run: npm run sync:firebase-keys
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const PROJECT = 'go7-app-209e4';
const ANDROID_APP_ID = '1:64086226844:android:0e9f8f2486c3018e11fa59';
const WEB_APP_ID = '1:64086226844:web:cb8c67344e6241fe11fa59';

function runFirebase(args) {
  return execSync(`firebase ${args} --project ${PROJECT}`, { encoding: 'utf8' });
}

function parseJson(stdout) {
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('No JSON in firebase output');
  return JSON.parse(stdout.slice(start, end + 1));
}

console.log('Fetching Firebase Android SDK config…');
const androidConfig = parseJson(runFirebase(`apps:sdkconfig ANDROID ${ANDROID_APP_ID}`));
const androidKey =
  androidConfig?.client?.find((c) => c.client_info?.android_client_info?.package_name === 'ng.go7.app')
    ?.api_key?.[0]?.current_key || androidConfig?.client?.[0]?.api_key?.[0]?.current_key;

if (!androidKey) {
  console.error('Could not find Android API key');
  process.exit(1);
}

console.log('Fetching Firebase Web SDK config…');
const webConfig = parseJson(runFirebase(`apps:sdkconfig WEB ${WEB_APP_ID}`));

fs.writeFileSync(
  path.join(ROOT, 'android', 'app', 'google-services.json'),
  `${JSON.stringify(androidConfig, null, 2)}\n`
);
fs.writeFileSync(
  path.join(ROOT, 'android', 'secrets.properties'),
  `# Auto-generated from Firebase ${PROJECT}\nMAPS_API_KEY=${androidKey}\n`
);

const envLines = [
  `# Auto-generated from Firebase ${PROJECT}`,
  `VITE_FIREBASE_API_KEY=${webConfig.apiKey}`,
  `VITE_FIREBASE_AUTH_DOMAIN=${webConfig.authDomain}`,
  `VITE_FIREBASE_PROJECT_ID=${webConfig.projectId}`,
  `VITE_FIREBASE_STORAGE_BUCKET=${String(webConfig.storageBucket || '').replace(/\.appspot\.com$/, '.firebasestorage.app') || 'go7-app-209e4.firebasestorage.app'}`,
  `VITE_FIREBASE_MESSAGING_SENDER_ID=${webConfig.messagingSenderId || webConfig.projectNumber}`,
  `VITE_FIREBASE_APP_ID=${webConfig.appId}`,
  `VITE_GOOGLE_MAPS_API_KEY=${process.env.GO7_MAPS_WEB_KEY || 'AIzaSyAl_g5kJ7gts6QtRYGArqEpne277dJ0Bq4'}`,
  `VITE_MAPTILER_API_KEY=nRGZ9lGblbV9lFK2KclL`,
  '',
];
fs.writeFileSync(path.join(ROOT, '.env.local'), envLines.join('\n'));

console.log('Updated android/secrets.properties, google-services.json, .env.local');
