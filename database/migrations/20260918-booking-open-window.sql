-- Saturday/Sunday 13:00-19:00 is the student booking WINDOW, not court hours.
-- Courts stay next-week Mon-Thu lunch/evening and Friday lunch. Teachers pending 3/week.
UPDATE club_booking_policy
SET revision = revision + 1,
    settings = '{"zone":"Asia/Shanghai","slotMinutes":20,"weeklyLimit":3,"dailyLimit":1,"bookingDays":[1,2,3,4,5],"studentOpenDays":[6,7],"studentOpen":"13:00","studentClose":"19:00","teacherDeadline":"19:00","periods":[{"start":"11:30","end":"12:50"},{"start":"16:30","end":"18:30"}],"fridayPeriods":[{"start":"11:30","end":"12:50"}],"rulesVersion":4}'
WHERE id = 1;
