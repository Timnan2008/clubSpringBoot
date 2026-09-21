-- Today only: students may book 18:00-24:00. Afterwards the weekend window applies.
UPDATE club_booking_policy
SET revision = revision + 1,
    settings = '{"zone":"Asia/Shanghai","slotMinutes":20,"weeklyLimit":3,"dailyLimit":1,"bookingDays":[1,2,3,4,5],"studentOpenDays":[6,7],"studentOpen":"13:00","studentClose":"19:00","teacherDeadline":"19:00","periods":[{"start":"11:30","end":"12:50"},{"start":"16:30","end":"18:30"}],"fridayPeriods":[{"start":"11:30","end":"12:50"}],"studentForceOpenOn":"2026-09-15","studentForceOpen":"18:00","studentForceClose":"23:59:59","rulesVersion":2}'
WHERE id = 1;
