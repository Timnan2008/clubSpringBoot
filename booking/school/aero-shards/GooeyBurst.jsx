import { useEffect, useRef } from 'react';

const colors = ['#ffffff', '#bdbdbd', '#7d7d7d', '#ececec'];

const noise = (n = 1) => n / 2 - Math.random() * n;

const getXY = (distance, pointIndex, totalPoints) => {
  const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
  return [distance * Math.cos(angle), distance * Math.sin(angle)];
};

const GooeyBurst = ({ x, y, onComplete, particleCount = 12 }) => {
  const ref = useRef(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return undefined;
    const timers = [];
    for (let i = 0; i < particleCount; i += 1) {
      const time = 520 + noise(180);
      const start = getXY(45, particleCount - i, particleCount);
      const end = getXY(7 + noise(5), particleCount - i, particleCount);
      const particle = document.createElement('span');
      const point = document.createElement('span');
      particle.className = 'booking-particle';
      point.className = 'booking-particle-point';
      particle.style.setProperty('--start-x', `${start[0]}px`);
      particle.style.setProperty('--start-y', `${start[1]}px`);
      particle.style.setProperty('--end-x', `${end[0]}px`);
      particle.style.setProperty('--end-y', `${end[1]}px`);
      particle.style.setProperty('--time', `${time}ms`);
      particle.style.setProperty('--scale', `${0.65 + Math.random() * 0.35}`);
      particle.style.setProperty('--color', colors[i % colors.length]);
      particle.style.setProperty('--rotate', `${noise(260)}deg`);
      particle.appendChild(point);
      host.appendChild(particle);
      timers.push(window.setTimeout(() => particle.remove(), time + 100));
    }
    timers.push(window.setTimeout(onComplete, 430));
    return () => timers.forEach(window.clearTimeout);
  }, [onComplete, particleCount]);

  return <span ref={ref} className="booking-gooey-burst" style={{ left: x, top: y }} aria-hidden="true" />;
};

export default GooeyBurst;
