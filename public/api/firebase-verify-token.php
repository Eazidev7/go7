<?php

/**

 * Verify a Firebase ID token against GO7 production auth (go7-app-209e4 only).

 *

 * @return array{uid: string, email: string|null}|null

 */

function go7_verify_firebase_id_token($idToken) {

  if (!$idToken || !is_string($idToken)) {

    return null;

  }



  $keys = [];

  $envKey = getenv('GO7_FIREBASE_WEB_API_KEY');

  if (is_string($envKey) && $envKey !== '') {

    $keys[] = $envKey;

  }



  // Production Firebase project (go7-app-209e4)

  $keys[] = 'AIzaSyAApbZP6QnaeMWP19cfK_XXRLlXlS7cP5s';



  $keys = array_values(array_unique($keys));



  foreach ($keys as $apiKey) {

    $verifyUrl = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' . rawurlencode($apiKey);



    $ch = curl_init($verifyUrl);

    curl_setopt_array($ch, [

      CURLOPT_POST => true,

      CURLOPT_RETURNTRANSFER => true,

      CURLOPT_HTTPHEADER => ['Content-Type: application/json'],

      CURLOPT_POSTFIELDS => json_encode(['idToken' => $idToken]),

      CURLOPT_TIMEOUT => 20,

    ]);

    $verifyRaw = curl_exec($ch);

    $verifyStatus = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

    curl_close($ch);



    if ($verifyStatus < 200 || $verifyStatus >= 300 || !$verifyRaw) {

      continue;

    }



    $verify = json_decode($verifyRaw, true);

    $uid = $verify['users'][0]['localId'] ?? null;

    if (!$uid) {

      continue;

    }



    return [

      'uid' => $uid,

      'email' => $verify['users'][0]['email'] ?? null,

    ];

  }



  return null;

}

