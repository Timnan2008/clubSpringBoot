<?php
declare(strict_types=1);
namespace MRBS;

require 'defaultincludes.inc';
require_once 'school_account.inc.php';

header('Content-Type: application/json; charset=utf-8');
$account = school_require_account(true);

require_once 'teacher_queue.inc.php';school_queue_install();school_resolve_teachers();

$tz = new \DateTimeZone($timezone);
$start = (new \DateTimeImmutable('today', $tz))->modify('next monday')->setTime(0, 0);
$end = $start->modify('+5 days');

$sql = "SELECT E.start_time, E.end_time, E.description, R.room_name
          FROM " . _tbl('entry') . " E
          JOIN " . _tbl('room') . " R ON R.id = E.room_id
         WHERE LOWER(TRIM(E.create_by)) = LOWER(TRIM(:email))
           AND E.start_time >= :start_time
           AND E.start_time < :end_time
      ORDER BY E.start_time";

$rows = db()->query($sql, [
  ':email' => $account['email'],
  ':start_time' => $start->getTimestamp(),
  ':end_time' => $end->getTimestamp()
])->all_rows_keyed();

$weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
$bookings = [];
foreach ($rows as $row)
{
  $booking_start = (new \DateTimeImmutable('@' . $row['start_time']))->setTimezone($tz);
  $booking_end = (new \DateTimeImmutable('@' . $row['end_time']))->setTimezone($tz);
  $bookings[] = [
    'date' => $booking_start->format('Y-m-d'),
    'date_label' => $booking_start->format('n月j日') . ' ' . $weekdays[(int) $booking_start->format('w')],
    'time_label' => $booking_start->format('G:i') . '～' . $booking_end->format('G:i'),
    'room_name' => $row['room_name'],
    'description' => trim((string) $row['description'])
  ];
}

$queued=db()->query("SELECT start_time,end_time,status FROM school_teacher_queue WHERE email=? AND status<>'confirmed' AND start_time>=? AND start_time<? ORDER BY start_time",[$account['email'],$start->getTimestamp(),$end->getTimestamp()])->all_rows_keyed();
foreach($queued as $q){$a=(new \DateTimeImmutable('@'.$q['start_time']))->setTimezone($tz);$b=(new \DateTimeImmutable('@'.$q['end_time']))->setTimezone($tz);$bookings[]=['date'=>$a->format('Y-m-d'),'date_label'=>$a->format('n月j日'),'time_label'=>$a->format('G:i').'～'.$b->format('G:i'),'room_name'=>'3楼羽毛球场','description'=>'','status'=>$q['status']];}

echo json_encode([
  'account' => ['email' => $account['email'], 'display_name' => $account['display_name']],
  'bookings' => $bookings
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
