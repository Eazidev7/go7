<?php
/**
 * GO7 Rider APK download proxy.
 * Hostinger blocks direct .apk downloads, so this PHP endpoint streams
 * the file with the correct Android package MIME type.
 */
$path = __DIR__ . '/../downloads/go7-rider.apk';

if (!file_exists($path) || !is_readable($path)) {
  http_response_code(404);
  header('Content-Type: text/plain; charset=utf-8');
  echo 'Rider APK not found.';
  exit;
}

$size = filesize($path);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = [
  'https://go7.ng',
  'https://www.go7.ng',
  'http://localhost:3000',
  'http://localhost:5173',
];
if (in_array($origin, $allowedOrigins, true)) {
  header("Access-Control-Allow-Origin: $origin");
}

header('Content-Type: application/vnd.android.package-archive');
header('Content-Disposition: attachment; filename="go7-rider.apk"');
header('Content-Length: ' . $size);
header('Cache-Control: public, max-age=86400');
header('Accept-Ranges: bytes');

readfile($path);
exit;
