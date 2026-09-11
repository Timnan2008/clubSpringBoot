<?php
declare(strict_types=1);namespace MRBS;if(PHP_SAPI!=='cli'){http_response_code(404);exit;}require 'defaultincludes.inc';require_once 'teacher_queue.inc.php';school_queue_install();school_resolve_teachers();echo "Teacher queue checked\n";
