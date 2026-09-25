-- Encrypted private-message archive. Body is AES-256-CBC hex; the key never leaves the host.
CREATE TABLE IF NOT EXISTS chat_archive (
  id VARCHAR(80) NOT NULL,
  sender VARCHAR(64) NOT NULL,
  recipient VARCHAR(64) NOT NULL,
  created_at VARCHAR(64) NOT NULL,
  readable TINYINT(1) NOT NULL,
  recalled TINYINT(1) NOT NULL,
  archived_at VARCHAR(64) NOT NULL,
  iv VARCHAR(32) NOT NULL,
  body TEXT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_chat_archive_created (created_at),
  KEY idx_chat_archive_sender (sender),
  KEY idx_chat_archive_recipient (recipient)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
