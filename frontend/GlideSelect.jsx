import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import "./GlideSelect.css";

export default function GlideSelect({
  options = [],
  value,
  defaultValue = "",
  onChange,
  placeholder = "Select…",
  showTags = true,
  size = "md",
  radius = 12,
  menuWidth = 200,
  placement = "bottom",
  align = "left",
  popDuration = 180,
  glideDuration = 220,
  rememberPosition = true,
  disabled = false,
  ariaLabel = "Select",
  className = "",
  accentColor = "var(--control-accent, #8070cf)",
  surfaceColor = "var(--control-surface, #fff)",
  highlightColor = "var(--control-highlight, #eeeaf6)",
  textColor = "var(--control-ink, #24212b)",
  name,
  menuHeader = null,
}) {
  const items = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const [inner, setInner] = useState(defaultValue),
    [open, setOpen] = useState(false),
    [present, setPresent] = useState(false),
    [active, setActive] = useState(-1),
    [position, setPosition] = useState({ side: placement, shift: 0, height: 320 });
  const current = value !== undefined ? value : inner;
  const selected = items.findIndex((o) => o.value === current);
  const firstEnabled = items.findIndex((item) => !item.disabled);
  const enabledAt = (index, direction = 1) => {
    if (firstEnabled < 0) return -1;
    for (let n = 0; n < items.length; n += 1) {
      const candidate = (index + n * direction + items.length * 2) % items.length;
      if (!items[candidate].disabled) return candidate;
    }
    return -1;
  };
  const root = useRef(null),
    trigger = useRef(null),
    menu = useRef(null),
    id = useId();
  const row = { sm: 30, md: 36, lg: 42 }[size] || 36;
  const optionHeight = (item) => (item?.badge || item?.detail ? 76 : row);
  const optionTop = (index) => {
    let top = 0;
    for (let i = 0; i < index && i < items.length; i += 1) top += optionHeight(items[i]) + 1;
    return top;
  };
  const menuShape = items.map((item) => (item?.badge || item?.detail ? "r" : "s")).join("");
  const reveal = (index) => {
    const list = menu.current;
    if (!list || index < 0) return;
    const top = 4 + optionTop(index),
      bottom = top + optionHeight(items[index]) + 4;
    if (top < list.scrollTop) list.scrollTop = top - 4;
    else if (bottom > list.scrollTop + list.clientHeight)
      list.scrollTop = bottom - list.clientHeight;
  };
  const close = () => {
    setOpen(false);
  };
  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => setPresent(false), (popDuration * 2) / 3);
    return () => clearTimeout(timer);
  }, [open, popDuration]);
  useLayoutEffect(() => {
    if (!open || !menu.current) return;
    const r = trigger.current.getBoundingClientRect();
    const headerExtra = menuHeader ? 72 : 0;
    const need = Math.min(optionTop(items.length) + 8 + headerExtra, 320 + headerExtra);
    const below = innerHeight - r.bottom - 14,
      above = r.top - 14;
    const side =
      placement === "bottom"
        ? below < need && above > below
          ? "top"
          : "bottom"
        : above < need && below > above
          ? "bottom"
          : "top";
    const width = Math.min(Math.max(menuWidth, r.width), innerWidth - 24);
    const left = align === "right" ? r.right - width : r.left;
    setPosition({
      side,
      shift: Math.max(12 - left, Math.min(0, innerWidth - 12 - left - width)),
      height: Math.max(
        60 + headerExtra,
        Math.min(320 + headerExtra, side === "bottom" ? below : above),
      ),
    });
    reveal(selected);
  }, [open, placement, align, menuWidth, items.length, row, menuHeader, menuShape]);
  useEffect(() => {
    if (!open) return;
    const outside = (e) => {
      if (!root.current?.contains(e.target)) close();
    };
    const scroll = (e) => {
      if (!menu.current?.contains(e.target)) close();
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("blur", close);
    };
  }, [open]);
  useEffect(() => {
    if (disabled) close();
  }, [disabled]);
  const pick = (index) => {
    const item = items[index];
    if (!item || item.disabled) return;
    if (item.value !== current) {
      if (root.current) root.current.dataset.swap = "";
      if (value === undefined) setInner(item.value);
      onChange?.(item.value, item);
    }
    close();
    trigger.current?.focus({ preventScroll: true });
  };
  const show = (keyboard) => {
    if (!disabled && firstEnabled >= 0) {
      setPresent(true);
      setActive(
        selected >= 0 && !items[selected].disabled ? selected : keyboard ? firstEnabled : -1,
      );
      setOpen(true);
    }
  };
  const keyDown = (e) => {
    const k = e.key;
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(k)) e.preventDefault();
    if (k === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (k === "Tab") {
      close();
      return;
    }
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(k)) show(true);
      return;
    }
    if (k === "Enter" || k === " ") {
      pick(active);
      return;
    }
    let next = active;
    if (k === "ArrowDown") next = enabledAt(Math.min(items.length - 1, active + 1), 1);
    else if (k === "ArrowUp") next = enabledAt(Math.max(0, active - 1), -1);
    else if (k === "Home") next = firstEnabled;
    else if (k === "End") next = enabledAt(items.length - 1, -1);
    else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      for (let n = 1; n <= items.length; n++) {
        const i = (Math.max(active, 0) + n) % items.length;
        if (
          !items[i].disabled &&
          String(items[i].label ?? items[i].value)
            .toLowerCase()
            .startsWith(k.toLowerCase())
        ) {
          next = i;
          break;
        }
      }
    }
    setActive(next);
    reveal(next);
  };
  return (
    <div
      ref={root}
      className={`glide-select ${className}`}
      onAnimationEnd={(e) => {
        if (e.animationName === "gs-swap" && root.current) delete root.current.dataset.swap;
      }}
      data-size={size}
      onBlur={(e) => {
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) close();
      }}
      style={{
        "--gs-accent": accentColor,
        "--gs-surface": surfaceColor,
        "--gs-highlight": highlightColor,
        "--gs-text": textColor,
        "--gs-radius": `${radius}px`,
        "--gs-row": `${row}px`,
        "--gs-menu-w": `${menuWidth}px`,
        "--gs-pop": `${popDuration}ms`,
        "--gs-glide": `${glideDuration}ms`,
      }}
    >
      {name && <input type="hidden" name={name} value={current} disabled={disabled} />}
      <button
        ref={trigger}
        type="button"
        className="glide-select__trigger"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
        disabled={disabled || firstEnabled < 0}
        onClick={() => (open ? close() : show(false))}
        onKeyDown={keyDown}
      >
        <span className="glide-select__label">
          {selected >= 0 ? items[selected].label : placeholder}
        </span>
        <HugeiconsIcon icon={ArrowDown01Icon} size={16} aria-hidden="true" />
      </button>
      {present && (
        <div
          ref={menu}
          id={`${id}-list`}
          role="listbox"
          aria-label={ariaLabel}
          className="glide-select__menu"
          data-open={open}
          inert={!open}
          aria-hidden={!open}
          data-side={position.side}
          data-align={align}
          style={{ "--gs-shift": `${position.shift}px`, maxHeight: position.height }}
          onPointerLeave={() => {
            if (!rememberPosition) setActive(selected);
          }}
        >
          {menuHeader ? (
            <div
              className="glide-select__header"
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {menuHeader}
            </div>
          ) : null}
          <div className="glide-select__list">
            {active >= 0 && (
              <span
                className="glide-select__pill"
                aria-hidden="true"
                style={{
                  transform: `translateY(${optionTop(active)}px)`,
                  height: optionHeight(items[active]),
                }}
              />
            )}
            {items.map((item, i) => (
              <div
                key={item.value}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === selected}
                aria-disabled={Boolean(item.disabled)}
                data-index={i}
                className="glide-select__option"
                style={{ height: optionHeight(item) }}
                onPointerEnter={(e) => {
                  if (e.pointerType !== "touch" && !item.disabled) setActive(i);
                }}
                onPointerDown={(e) => {
                  if (e.button === 0 && e.pointerType !== "touch" && !item.disabled) {
                    e.preventDefault();
                    setActive(i);
                  }
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  pick(i);
                }}
              >
                <span className="glide-select__copy">
                  <span className="glide-select__name">{item.label}</span>
                  {item.badge ? <span className="glide-select__badge">{item.badge}</span> : null}
                  {item.detail ? <span className="glide-select__detail">{item.detail}</span> : null}
                </span>
                {showTags && item.tag && <small>{item.tag}</small>}
                <HugeiconsIcon
                  icon={Tick02Icon}
                  size={16}
                  aria-hidden="true"
                  style={{ visibility: i === selected ? "visible" : "hidden", color: accentColor }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
