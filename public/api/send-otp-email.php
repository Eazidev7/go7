<?php
/**
 * GO7 Hostinger email OTP API (bypasses WhatsApp / Cloud Functions).
 * Auth: Firebase ID token (Bearer). Code is emailed only to the verified account email.
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
go7_rate_limit(30, 60); // OTP emails: max 30/min per IP

function fail($code, $message) {
  http_response_code($code);
  echo json_encode(['success' => false, 'error' => $message]);
  exit;
}

/** Hostinger / CGI often strips Authorization — recover from common fallbacks */
function go7_bearer_token() {
  $candidates = [
    $_SERVER['HTTP_AUTHORIZATION'] ?? '',
    $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '',
    $_SERVER['Authorization'] ?? '',
  ];
  if (function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    if (is_array($headers)) {
      foreach ($headers as $k => $v) {
        if (strcasecmp($k, 'Authorization') === 0) {
          $candidates[] = $v;
        }
      }
    }
  }
  foreach ($candidates as $authHeader) {
    if (is_string($authHeader) && preg_match('/Bearer\s+(\S+)/i', $authHeader, $m)) {
      return $m[1];
    }
  }
  return '';
}

function go7_resend_api_key() {
  $key = getenv('GO7_RESEND_API_KEY') ?: getenv('RESEND_API_KEY') ?: '';
  if (is_string($key) && $key !== '') {
    return $key;
  }
  // Hostinger panel env vars are often unset — load local secrets file
  $secretsFile = __DIR__ . '/go7-secrets.php';
  if (is_readable($secretsFile)) {
    $secrets = include $secretsFile;
    if (is_array($secrets) && !empty($secrets['resend_api_key'])) {
      return (string) $secrets['resend_api_key'];
    }
  }
  return '';
}

$idToken = go7_bearer_token();
if ($idToken === '') {
  fail(401, 'Missing auth token. Sign in and try again.');
}

require_once __DIR__ . '/firebase-verify-token.php';
$verified = go7_verify_firebase_id_token($idToken);
if (!$verified || empty($verified['uid'])) {
  fail(401, 'Invalid or expired auth token.');
}
$uid = $verified['uid'];
$accountEmail = strtolower(trim((string)($verified['email'] ?? '')));
if ($accountEmail === '' || strpos($accountEmail, '@') === false) {
  fail(401, 'Could not verify user email.');
}

$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '{}', true);
if (!is_array($body)) {
  $body = $_POST;
}

$code = preg_replace('/\D/', '', (string)($body['code'] ?? ''));
if (strlen($code) !== 6) {
  fail(400, 'Invalid OTP code.');
}

$purpose = trim((string)($body['purpose'] ?? 'verification'));
if (strlen($purpose) > 80) {
  $purpose = 'verification';
}

$resendKey = go7_resend_api_key();
if ($resendKey === '') {
  fail(503, 'Email OTP is not configured on the server (missing Resend API key).');
}

$subject = 'Your GO7 verification code';
$html = '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">'
  . '<h2 style="color:#E30613;margin:0 0 12px">GO7 verification</h2>'
  . '<p style="color:#333;font-size:15px;line-height:1.5">Your verification code is:</p>'
  . '<p style="font-size:32px;letter-spacing:8px;font-weight:700;color:#111;margin:16px 0">' . htmlspecialchars($code) . '</p>'
  . '<p style="color:#666;font-size:13px">This code expires in 30 minutes. If you did not request this, ignore this email.</p>'
  . '</div>';

$payload = json_encode([
  'from' => 'Go7 <notifications@go7.ng>',
  'to' => [$accountEmail],
  'subject' => $subject,
  'html' => $html,
]);

$ch = curl_init('https://api.resend.com/emails');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer ' . $resendKey,
    'Content-Type: application/json',
  ],
  CURLOPT_POSTFIELDS => $payload,
  CURLOPT_TIMEOUT => 25,
]);
$sendRaw = curl_exec($ch);
$sendStatus = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

$send = json_decode($sendRaw ?: '{}', true);
if ($sendStatus < 200 || $sendStatus >= 300) {
  $err = $send['message'] ?? ($curlErr ?: ('Email send failed (' . $sendStatus . ')'));
  fail(502, $err);
}

echo json_encode([
  'success' => true,
  'email' => $accountEmail,
  'uid' => $uid,
  'purpose' => $purpose,
  'id' => $send['id'] ?? null,
]);
