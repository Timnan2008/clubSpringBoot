-- Additive migration: run explicitly against the main site's MySQL database.
-- Existing school tables and the legacy MRBS database are not modified.
CREATE TABLE IF NOT EXISTS club_booking_policy (
  id INT PRIMARY KEY,
  revision INT NOT NULL DEFAULT 1,
  settings JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS club_booking_court (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(150) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS club_booking_reservation (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  court_id INT NOT NULL,
  owner_key CHAR(64) NOT NULL,
  owner_email VARCHAR(254) NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  start_time BIGINT NOT NULL COMMENT 'Unix seconds',
  end_time BIGINT NOT NULL COMMENT 'Unix seconds',
  status VARCHAR(16) NOT NULL COMMENT 'pending, confirmed, unavailable, cancelled',
  note TEXT NOT NULL,
  confirm_after BIGINT NULL,
  created_micros BIGINT NOT NULL,
  request_key VARCHAR(64) NOT NULL,
  policy_revision INT NOT NULL,
  legacy_source VARCHAR(40) NULL,
  legacy_id BIGINT NULL,
  CONSTRAINT fk_club_booking_court FOREIGN KEY(court_id) REFERENCES club_booking_court(id),
  UNIQUE KEY uq_club_booking_request(owner_key, request_key),
  UNIQUE KEY uq_club_booking_legacy(legacy_source, legacy_id),
  KEY ix_club_booking_conflict(court_id, status, start_time, end_time),
  KEY ix_club_booking_owner(owner_key, status, start_time),
  KEY ix_club_booking_pending(status, confirm_after, created_micros)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Preserve original MRBS fields in SQL for reconciliation; never sent to ordinary clients.
CREATE TABLE IF NOT EXISTS club_booking_legacy (
  source_table VARCHAR(40) NOT NULL,
  source_id BIGINT NOT NULL,
  owner_key CHAR(64) NULL,
  payload JSON NOT NULL,
  PRIMARY KEY(source_table, source_id),
  KEY ix_club_booking_legacy_owner(owner_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO club_booking_policy(id, revision, settings) VALUES(1, 1,
'{"zone":"Asia/Shanghai","slotMinutes":20,"weeklyLimit":3,"dailyLimit":1,"bookingDays":[1,2,3,4,5],"studentOpenDays":[6,7],"studentOpen":"13:00","studentClose":"19:00","teacherDeadline":"19:00","periods":[{"start":"11:30","end":"12:50"},{"start":"16:30","end":"18:30"}],"rulesVersion":1}');
