// Keep native horizontal trackpad momentum. A vertical wheel can also browse cards.
export function wheelDistance(event, viewport) {
  if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return 0;
  return event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport : 1);
}
export function installClubScroll(container) {
  const wheel = event => {
    const delta = wheelDistance(event,container.clientWidth);
    const max = container.scrollWidth-container.clientWidth;
    if (!delta || (delta<0 && container.scrollLeft<=0) || (delta>0 && container.scrollLeft>=max-1)) return;
    event.preventDefault(); container.scrollLeft += delta;
  };
  const key = event => {
    if (event.target !== container || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const left = event.key==='Home'?0:event.key==='End'?container.scrollWidth:container.scrollLeft+(event.key==='ArrowRight'?1:-1)*container.clientWidth*.75;
    container.scrollTo({left,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  };
  container.addEventListener('wheel',wheel,{passive:false}); container.addEventListener('keydown',key);
  return () => {container.removeEventListener('wheel',wheel);container.removeEventListener('keydown',key);};
}
