import { useRef, useEffect, useState } from 'react';
import './GooeyNav.css';

const GooeyNav = ({ items, animationTime = 600, particleCount = 15, particleDistances = [90, 10], particleR = 100, timeVariance = 300, colors = [1, 2, 3, 1, 2, 3, 1, 4], initialActiveIndex = 0 }) => {
  const containerRef = useRef(null);
  const navRef = useRef(null);
  const filterRef = useRef(null);
  const textRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
  const noise = (n = 1) => n / 2 - Math.random() * n;
  const getXY = (distance, pointIndex, totalPoints) => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };
  const createParticle = (i, t, d, r) => {
    const rotate = noise(r / 10);
    return { start: getXY(d[0], particleCount - i, particleCount), end: getXY(d[1] + noise(7), particleCount - i, particleCount), time: t, scale: 1 + noise(0.2), color: colors[Math.floor(Math.random() * colors.length)], rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10 };
  };
  const makeParticles = element => {
    const bubbleTime = animationTime * 2 + timeVariance;
    element.style.setProperty('--time', `${bubbleTime}ms`);
    for (let i = 0; i < particleCount; i += 1) {
      const t = animationTime * 2 + noise(timeVariance * 2);
      const p = createParticle(i, t, particleDistances, particleR);
      const particle = document.createElement('span');
      const point = document.createElement('span');
      particle.className = 'particle';
      point.className = 'point';
      particle.style.cssText = `--start-x:${p.start[0]}px;--start-y:${p.start[1]}px;--end-x:${p.end[0]}px;--end-y:${p.end[1]}px;--time:${p.time}ms;--scale:${p.scale};--color:var(--color-${p.color},white);--rotate:${p.rotate}deg`;
      particle.appendChild(point);
      element.appendChild(particle);
      window.setTimeout(() => particle.remove(), t);
    }
  };
  const updateEffectPosition = element => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const pos = element.getBoundingClientRect();
    const styles = { left: `${pos.x - containerRect.x}px`, top: `${pos.y - containerRect.y}px`, width: `${pos.width}px`, height: `${pos.height}px` };
    Object.assign(filterRef.current.style, styles);
    Object.assign(textRef.current.style, styles);
    textRef.current.innerText = element.innerText;
  };
  const handleClick = (e, index) => {
    if (activeIndex === index) return;
    setActiveIndex(index);
    updateEffectPosition(e.currentTarget);
    filterRef.current?.querySelectorAll('.particle').forEach(p => p.remove());
    if (textRef.current) {
      textRef.current.classList.remove('active');
      void textRef.current.offsetWidth;
      textRef.current.classList.add('active');
    }
    if (filterRef.current) makeParticles(filterRef.current);
  };
  useEffect(() => {
    const activeLi = navRef.current?.querySelectorAll('li')[activeIndex];
    if (activeLi) updateEffectPosition(activeLi);
    const observer = new ResizeObserver(() => {
      const current = navRef.current?.querySelectorAll('li')[activeIndex];
      if (current) updateEffectPosition(current);
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [activeIndex]);
  return <div className="gooey-nav-container" ref={containerRef}><nav><ul ref={navRef}>{items.map((item, index) => <li key={index} className={activeIndex === index ? 'active' : ''}><a href={item.href} onClick={e => handleClick(e, index)}>{item.label}</a></li>)}</ul></nav><span className="effect filter" ref={filterRef} /><span className="effect text" ref={textRef} /></div>;
};

export default GooeyNav;
