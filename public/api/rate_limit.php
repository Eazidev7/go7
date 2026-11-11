<?php
/**
 * GO7 simple IP-based rate limiter for Hostinger API endpoints.
 * File-based sliding window stored in a temp dir (no DB required).
 *
 * Usage (at top of an endpoint, after headers):
 *   require_once __DIR__ . '/rate_limit.php';
 *   go7_rate_limit(60, 60); // max 60 requests per 60s per IP
 */
function go7_rate_limit($maxRequests = 60, $windowSeconds = 60) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $dir = sys_get_temp_dir() . '/go7_rl';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    $key = $dir . '/' . md5($ip);
    $now = time();

    $window = ['start' => $now, 'count' => 0];
    $raw = @file_get_contents($key);
    if ($raw !== false) {
        $parsed = json_decode($raw, true);
        if (is_array($parsed) && isset($parsed['start'], $parsed['count'])) {
            $window = $parsed;
        }
    }

    // Reset window if it has expired
    if (($now - (int)$window['start']) > $windowSeconds) {
        $window = ['start' => $now, 'count' => 0];
    }

    $window['count']++;
    @file_put_contents($key, json_encode($window));

    if ($window['count'] > $maxRequests) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error' => 'Too many requests. Please try again later.',
        ]);
        exit;
    }
}
