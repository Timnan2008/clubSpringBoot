CREATE TABLE IF NOT EXISTS message_key_backup (account VARCHAR(64) NOT NULL PRIMARY KEY,envelope TEXT NOT NULL,version BIGINT DEFAULT 0) ENGINE=InnoDB;
ALTER TABLE tb_suggestions MODIFY context VARCHAR(500);
CREATE INDEX idx_user_email ON `user` (`email`);
CREATE INDEX idx_user_teacher_email ON `user_teacher` (`teacher_email`);
CREATE INDEX idx_user_admin_email ON `user_admin` (`admin_email`);
CREATE INDEX idx_user_club_president_email ON `user_club_president` (`club_president_email`);
