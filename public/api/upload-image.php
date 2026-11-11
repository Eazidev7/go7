<?php
/**
 * GO7 Hostinger image upload API.
 * Auth: Firebase ID token (Bearer).
 * Saves under /uploads/{safe-path} and returns https://go7.ng/uploads/...
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = [
  'https://go7.ng',
  'https://www.go7.ng',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];
if (in_array($origin, $allowedOrigins, true)) {
  header("Access-Control-Allow-Origin: $origin");
  header('Access-Control-Allow-Credentials: true');
  header('Access-Control-Allow-Headers: Authorization, Content-Type');
  header('Access-Control-Allow-Methods: POST, OPTIONS');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['success' => false, 'error' => 'Method not allowed']);
  exit;
}

require_once __DIR__ . '/rate_limit.php';
go7_rate_limit(40, 60); // uploads: max 40/min per IP

function fail($code, $message) {
  http_response_code($code);
  echo json_encode(['success' => false, 'error' => $message]);
  exit;
}

$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if (!preg_match('/Bearer\s+(\S+)/i', $authHeader, $m)) {
  fail(401, 'Missing auth token. Sign in and try again.');
}
$idToken = $m[1];

require_once __DIR__ . '/firebase-verify-token.php';
$verified = go7_verify_firebase_id_token($idToken);
if (!$verified || empty($verified['uid'])) {
  fail(401, 'Invalid or expired auth token. Sign out and log in again, then retry upload.');
}
$uid = $verified['uid'];

if (empty($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
  fail(400, 'No image file uploaded.');
}

$file = $_FILES['file'];
if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
  fail(400, 'Upload failed (error ' . (int)$file['error'] . ').');
}

$maxBytes = 5 * 1024 * 1024;
if (($file['size'] ?? 0) > $maxBytes) {
  fail(400, 'Image must be 5MB or smaller.');
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']) ?: '';
$allowed = [
  'image/jpeg' => 'jpg',
  'image/png' => 'png',
  'image/webp' => 'webp',
  'image/gif' => 'gif',
];
if (!isset($allowed[$mime])) {
  fail(400, 'Only JPEG, PNG, WebP, or GIF images are allowed.');
}
$ext = $allowed[$mime];

$requestedPath = trim((string)($_POST['path'] ?? ''), '/');
if ($requestedPath === '' || strpos($requestedPath, '..') !== false) {
  fail(400, 'Invalid upload path.');
}

// Normalize: vendors/{vendorId}/... or package-detection/{uid}/...
$parts = explode('/', $requestedPath);
$root = $parts[0] ?? '';
$ownerId = $parts[1] ?? '';

if (!in_array($root, ['vendors', 'package-detection'], true)) {
  fail(400, 'Upload path not allowed.');
}
if ($ownerId === '' || !preg_match('/^[A-Za-z0-9_-]+$/', $ownerId)) {
  fail(400, 'Invalid owner id in path.');
}
if ($ownerId !== $uid) {
  fail(403, 'You can only upload images for your own account.');
}

// Keep folder structure; replace filename with safe timestamp name.
array_pop($parts); // drop original filename if present
$dirParts = array_values(array_filter($parts, function ($p) {
  return $p !== '' && preg_match('/^[A-Za-z0-9_-]+$/', $p);
}));
if (count($dirParts) < 2) {
  fail(400, 'Upload path too short.');
}

$relativeDir = implode('/', $dirParts);
$fileName = 'img_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;

$uploadsRoot = realpath(__DIR__ . '/..') . DIRECTORY_SEPARATOR . 'uploads';
$targetDir = $uploadsRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativeDir);

if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true)) {
  fail(500, 'Could not create upload directory.');
}

$targetFile = $targetDir . DIRECTORY_SEPARATOR . $fileName;
if (!move_uploaded_file($file['tmp_name'], $targetFile)) {
  fail(500, 'Could not save uploaded file.');
}

@chmod($targetFile, 0644);

$host = $_SERVER['HTTP_HOST'] ?? 'go7.ng';
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'https';
$publicUrl = $scheme . '://' . $host . '/uploads/' . $relativeDir . '/' . $fileName;

echo json_encode([
  'success' => true,
  'url' => $publicUrl,
  'path' => 'uploads/' . $relativeDir . '/' . $fileName,
]);
