<?php
declare(strict_types=1);
namespace MRBS;

$configured_base = getenv('MRBS_URL_BASE');
if ($configured_base) $url_base = rtrim($configured_base, '/');

$timezone = $_ENV['MRBS_TIMEZONE'] ?? 'Asia/Shanghai';
$dbsys = $_ENV['MRBS_DB_SYSTEM'] ?? 'mysql';
$db_host = $_ENV['MRBS_DB_HOST'] ?? 'db';
$db_database = $_ENV['MRBS_DB_DATABASE'] ?? 'mrbs';
$db_login = $_ENV['MRBS_DB_USER'] ?? 'mrbs';
$db_password = $_ENV['MRBS_DB_PASSWORD'] ?? '';
$db_tbl_prefix = 'mrbs_';
$db_persist = false;

// School identity and locale.  These override MRBS defaults without changing its pages.
$mrbs_company = '青浦世外高中羽毛球场预约系统';
$mrbs_company_more_info = '试运行阶段仅开放午休和晚间休息时段：11:30–12:50 / 16:30–18:30';
$default_language_tokens = 'zh-hans';
$disable_automatic_language_changing = true;
$override_locale = 'zh-CN';
$vocab_override['zh-hans']['mrbs'] = '羽毛球场预约系统';
$vocab_override['zh-hans']['select_room'] = '选择场地';
$vocab_override['zh-hans']['no_rooms_for_area'] = '这个区域还没有定义场地';
$vocab_override['zh-hans']['namebooker'] = '真实姓名';
$vocab_override['zh-hans']['must_set_description'] = '请填写真实姓名';
$vocab_override['zh-hans']['entry.name.placeholder'] = '请输入真实姓名';
$weekstarts = 1;
$hidden_days = [0, 6];
$default_view = 'week';
$custom_css_url = 'css/school-modern.css?v=20260910-18';
$custom_js_url = 'js/school-modern.js?v=20260910-18';
$prevent_booking_on_weekends = true;

// MRBS internal scheduling uses its IP session; website authentication is required below.
$auth['type'] = 'none';
$auth['session'] = 'ip';
$auth['only_admin_can_book_repeat'] = true;
$auth['only_admin_can_book_multiday'] = true;
$auth['only_admin_can_select_multiroom'] = true;
$auth['users_can_register_others'] = false;
$auth['users_can_delete_others_registrations'] = false;

// Booking policy defaults and overrides for the single school court.
$resolution = 20 * 60;
$force_resolution = true;
$default_duration = 20 * 60;
$max_duration_enabled = true;
$max_duration_secs = 20 * 60;
$max_create_ahead_enabled = false;
$max_per_interval_area_enabled['day'] = false;
$max_per_interval_area_enabled['week'] = false;

// The student form has one booking category; the UI therefore does not ask for a type.
unset($booking_types);
$default_type = 'E';

// Trial slots: 11:30–12:50 and 16:30–18:30; the gap is closed.
$morningstarts = 11;
$morningstarts_minutes = 30;
$eveningends = 18;
$eveningends_minutes = 10;

// Protect all PHP pages, including direct calendar/form URLs. CLI maintenance remains available.
if (PHP_SAPI !== 'cli') {
  header('Cache-Control: no-store, private');
  header('Pragma: no-cache');
  require_once __DIR__ . '/school_account.inc.php';
  $is_json = in_array(basename($_SERVER['SCRIPT_NAME'] ?? ''), ['account.php', 'my_bookings.php'], true)
    || ($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET';
  school_require_account($is_json);
}
