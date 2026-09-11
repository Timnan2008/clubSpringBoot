SET NAMES utf8mb4;

INSERT INTO mrbs_area
  (area_name, sort_key, timezone, resolution, default_duration,
   morningstarts, morningstarts_minutes, eveningends, eveningends_minutes,
   min_create_ahead_enabled, min_create_ahead_secs,
   max_create_ahead_enabled, max_create_ahead_secs,
   min_delete_ahead_enabled, min_delete_ahead_secs,
   max_per_day_enabled, max_per_day,
   max_per_week_enabled, max_per_week,
   max_duration_enabled, max_duration_secs, max_duration_periods,
   approval_enabled, reminders_enabled, enable_periods, periods,
   confirmation_enabled, confirmed_default, times_along_top)
VALUES
  ('青浦世外高中', '01', 'Asia/Shanghai', 1200, 1200,
   11, 30, 18, 10,
   0, 0,
   0, 604800,
   1, 31536000,
   0, 1,
   0, 1,
   1, 1200, 1,
   0, 0, 0, '[]',
   0, 1, 0);

INSERT INTO mrbs_room
  (area_id, room_name, sort_key, description, capacity)
VALUES
  (1, '3楼羽毛球场', '01', '青浦世外高中3楼羽毛球场', 4);
