<?php
declare(strict_types=1);
namespace MRBS;

function school_current_account() : ?array
{
  static $checked = false;
  static $cached = null;
  if ($checked) return $cached;
  $checked = true;
  $session = (string) ($_COOKIE['JSESSIONID'] ?? '');
  $remember = (string) ($_COOKIE['club_remember'] ?? '');
  $valid_session = preg_match('/\A[A-Za-z0-9._-]{16,128}\z/', $session);
  $valid_remember = preg_match('/\A[a-f0-9]{64}\z/', $remember);
  if (!$valid_session && !$valid_remember) return null;
  $credentials = ($valid_session ? 'JSESSIONID=' . $session . '; ' : '') . ($valid_remember ? 'club_remember=' . $remember : '');
  $api = getenv('CLUB_ACCOUNT_API') ?: 'http://host.docker.internal:8088/booking/account';
  $context = stream_context_create([
    'http' => [
      'method' => 'GET',
      'header' => "Accept: application/json\r\nCookie: " . $credentials . "\r\n",
      'timeout' => 4,
      'ignore_errors' => true
    ]
  ]);
  $raw = @file_get_contents($api, false, $context);
  if ($raw === false)
  {
    return null;
  }

  foreach (($http_response_header ?? []) as $response_header) {
    if (preg_match('/^Set-Cookie: (JSESSIONID|club_remember)=/i', $response_header)) header($response_header, false);
  }
  $response = json_decode($raw, true);
  $data = is_array($response) ? ($response['data'] ?? null) : null;
  if (($response['code'] ?? 0) !== 200 || !is_array($data))
  {
    return null;
  }

  $verified_email = trim((string) ($data['email'] ?? $data['adminEmail'] ?? $data['teacherEmail'] ?? $data['clubPresidentEmail'] ?? ''));
  if (($verified_email === ''))
  {
    return null;
  }

  $display_name = trim((string) ($data['username'] ?? $data['adminName'] ?? $data['teacherName'] ?? $data['clubPresidentName'] ?? ''));
  $english_name = trim((string) ($data['usernameEn'] ?? ''));
  if (($_COOKIE['club_language'] ?? $_GET['lang'] ?? '') === 'en' && $english_name !== '') $display_name = $english_name;
  if ($display_name === '') $display_name = $english_name !== '' ? $english_name : $verified_email;

  return $cached = [
    'email' => $verified_email,
    'display_name' => $display_name,
    'level' => (int) ($data['userRight'] ?? 0)
  ];
}

function school_require_account(bool $json = false) : array
{
  $account = school_current_account();
  if ($account !== null)
  {
    return $account;
  }

  http_response_code(401);
  if ($json)
  {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => '请先登录社团官网账号。'], JSON_UNESCAPED_UNICODE);
  }
  else
  {
    header('Location: ' . (getenv('CLUB_LOGIN_URL') ?: 'http://localhost:8088/page/user/login?next=%2Fpage%2Fbooking'), true, 302);
  }
  exit;
}
