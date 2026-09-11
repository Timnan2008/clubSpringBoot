import { tr } from "./language";
import { useEffect, useRef, useState, useId, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import OptionWheel from './OptionWheel';
export default function CategoryPicker({
  options,
  value,
  onChange,
  label
}) {
  const labels = useMemo(() => options.map(o => o[1]), [options]);
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(value),
    [up, setUp] = useState(false),
    root = useRef(),
    trigger = useRef(),
    panel = useRef(),
    id = useId(),
    reduce = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    setDraft(value);
    panel.current?.querySelector('[role=listbox]')?.focus({
      preventScroll: true
    });
    const outside = e => {
      if (!root.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const close = () => {
    setOpen(false);
    trigger.current?.focus({
      preventScroll: true
    });
  };
  return <div className="category-picker" ref={root} onKeyDown={e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  }} onBlur={e => {
    if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setOpen(false);
  }}><button ref={trigger} type="button" className="category-trigger" aria-label={`${label}：${options.find(o => o[0] === value)?.[1] || tr("全部")}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => {
      const r = trigger.current.getBoundingClientRect();
      setUp(innerHeight - r.bottom < 330 && r.top > innerHeight - r.bottom);
      setOpen(v => !v);
    }}><span>{options.find(o => o[0] === value)?.[1] || tr("全部")}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></button><AnimatePresence>{open && <motion.div ref={panel} className={"category-popup " + (up ? "opens-up" : "")} id={id} initial={{
        opacity: 0,
        y: -6,
        scale: .97
      }} animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }} exit={{
        opacity: 0,
        y: -4,
        scale: .98
      }} transition={{
        duration: reduce ? 0 : .2
      }}><header>{label}</header><OptionWheel loop items={labels} defaultSelected={Math.max(0, options.findIndex(o => o[0] === value))} label={label} onChange={index => setDraft(options[index][0])} /><footer><small>{tr("滚动、拖动或方向键选择")}</small><button type="button" onClick={() => {
            onChange(draft);
            close();
          }}>{tr("确定")}</button></footer></motion.div>}</AnimatePresence></div>;
}
