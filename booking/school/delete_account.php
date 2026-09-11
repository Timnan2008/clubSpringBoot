<?php
declare(strict_types=1);namespace MRBS;
require 'defaultincludes.inc';require_once 'teacher_queue.inc.php';
header('Content-Type: application/json');header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {http_response_code(405);exit;}
$session=(string)($_COOKIE['JSESSIONID']??'');$proof=(string)($_SERVER['HTTP_X_ACCOUNT_DELETION_PROOF']??'');
if(!preg_match('/\A[A-Za-z0-9._-]{16,128}\z/',$session)||!preg_match('/\A[a-f0-9-]{36}\z/',$proof)){http_response_code(403);exit;}
$api=getenv('CLUB_ACCOUNT_API')?:'http://host.docker.internal:8088/booking/account';
$api=preg_replace('~/booking/account$~','/booking/deletion-authorization',$api);
$ctx=stream_context_create(['http'=>['method'=>'GET','header'=>"Accept: application/json\r\nCookie: JSESSIONID=$session\r\nX-Account-Deletion-Proof: $proof\r\n",'timeout'=>8,'ignore_errors'=>true]]);
$raw=@file_get_contents($api,false,$ctx);$authorization=json_decode($raw?:'{}',true);
if(!preg_match('~^HTTP/\S+ 200~',$http_response_header[0]??'')||empty($authorization['email'])){http_response_code(403);exit;}
$email=$authorization['email'];school_booking_lock();school_queue_install();db()->begin();
try{db()->command('DELETE FROM '._tbl('entry').' WHERE LOWER(TRIM(create_by))=LOWER(TRIM(?))',[$email]);db()->command('DELETE FROM '._tbl('repeat').' WHERE LOWER(TRIM(create_by))=LOWER(TRIM(?))',[$email]);db()->command('DELETE FROM school_teacher_queue WHERE LOWER(TRIM(email))=LOWER(TRIM(?))',[$email]);db()->command('UPDATE '._tbl('entry')." SET modified_by='' WHERE LOWER(TRIM(modified_by))=LOWER(TRIM(?))",[$email]);db()->commit();echo json_encode(['deleted'=>true]);}catch(\Throwable $e){db()->rollback();http_response_code(503);echo json_encode(['error'=>'Booking cleanup unavailable']);}
