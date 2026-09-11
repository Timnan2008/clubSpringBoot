<?php
declare(strict_types=1);
namespace MRBS;

require_once 'school_account.inc.php';

header('Content-Type: application/json; charset=utf-8');
$account = school_require_account(!isset($_GET['login']));
echo json_encode([
  'email' => $account['email'],
  'display_name' => $account['display_name'],
  'level' => $account['level']
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
