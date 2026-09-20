-- Weekend court hours: Saturday and Sunday 13:00-19:00.
-- Students book next week's slots during that same window. Teachers may pending 3 times per week.
-- Apply after deploying the BookingPolicy that allows bookingDays 6 and 7.
UPDATE club_booking_policy
SET revision = revision + 1,
    settings = '{"zone":"Asia/Shanghai","slotMinutes":20,"weeklyLimit":3,"dailyLimit":3,"bookingDays":[6,7],"studentOpenDays":[6,7],"studentOpen":"13:00","studentClose":"19:00","teacherDeadline":"19:00","periods":[{"start":"13:00","end":"19:00"}],"fridayPeriods":[{"start":"13:00","end":"19:00"}],"rulesVersion":3}'
WHERE id = 1;
