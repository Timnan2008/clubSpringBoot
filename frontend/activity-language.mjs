// Localize system-generated schedule content; keep custom activity text intact.
const scheduleLines = new Map([
  ['2026学年第一学期社团安排 / 2026 S1 CAS Club Schedule', '2026 S1 CAS Club Schedule'],
  ['调休按当天实际课表安排活动；节假日及临时变动以学校通知为准。 Compensatory school days follow the actual class timetable; holidays and changes follow school notices.', 'Compensatory school days follow the actual class timetable; holidays and changes follow school notices.'],
  ['放学后活动可按年级课表于 16:40 提前开始，18:00 前结束并清理场地。 After-school activities may start at 16:40; finish and clean up by 18:00.', 'After-school activities may start at 16:40; finish and clean up by 18:00.'],
  ['参与人数尚未确定。 Attendance to be confirmed.', 'Attendance to be confirmed.']
]);
export function localizeActivity(activity, club, english) {
  if (!english) return activity;
  const clubNameEn = club?.nameEn || activity.clubNameEn;
  const generated = /^(?:.+\s*[·・]\s*)?社团活动$/.test(activity.title || '');
  return {...activity,
    title: activity.titleEn || (generated ? (clubNameEn ? clubNameEn + ' · ' : '') + 'Club activity' : activity.title),
    clubName: clubNameEn || activity.clubName,
    location: activity.location === 'STEAM 教室' ? 'STEAM classroom' : activity.location,
    description: activity.description?.split('\n').map(line => scheduleLines.get(line) || line).join('\n')
  };
}
export function localizeCalendar(data, english) {
  return {...data, events: data.events.map(event => event.kind === 'club' ? localizeActivity(event, null, english) : event)};
}
export function localizeTerm(name, english) {
  if (!english) return name;
  const match = /^(\d{4}(?:\s*[-—–]\s*\d{4})?)\s*学年第([一二12])学期$/.exec(name || '');
  return match ? `${match[1]} · Semester ${['一', '1'].includes(match[2]) ? 1 : 2}` : name;
}
