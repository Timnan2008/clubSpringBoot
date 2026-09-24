// Calendar timestamps without an offset are school-local (Asia/Shanghai).
export function nearestActivity(events, now = Date.now()) {
  const time = (value) =>
    Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : value + "+08:00");
  return (
    events.reduce((best, event) => {
      const start = time(event.start),
        end = time(event.end || event.start);
      if (!Number.isFinite(start)) return best;
      const distance = now >= start && now <= end ? 0 : Math.abs(start - now);
      const bestStart = best ? time(best.start) : 0;
      const bestEnd = best ? time(best.end || best.start) : 0;
      const bestDistance = !best
        ? Infinity
        : now >= bestStart && now <= bestEnd
          ? 0
          : Math.abs(bestStart - now);
      return distance < bestDistance ||
        (distance === bestDistance && start >= now && bestStart < now)
        ? event
        : best;
    }, null) || events[0]
  );
}
