import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon, CheckIcon } from "./icons";
import { useAnchorRect, clampLeft } from "./useAnchorRect";

export type SelectOption = { value: string; label: string };

/**
 * Accessible, theme-styled dropdown that replaces the native <select> (whose
 * popup can't be styled). Keyboard: ↑/↓ to move, Enter/Space to choose,
 * Esc to close, Tab/click-away to dismiss.
 */
export default function Select({
  value,
  onChange,
  options,
  ariaLabel,
  minWidth = 168,
  size = "md",
  trigger,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
  minWidth?: number;
  size?: "sm" | "md";
  /** Custom trigger render. When provided, replaces the default boxed button. */
  trigger?: (current: SelectOption | undefined, open: boolean) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const current = options.find((o) => o.value === value);
  const rect = useAnchorRect(ref, open);

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, options, value]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (v: string) => { onChange(v); setOpen(false); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) setOpen(true);
        else setActive((a) => Math.min(options.length - 1, a + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) setOpen(true);
        else setActive((a) => Math.max(0, a - 1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open && options[active]) choose(options[active].value);
        else setOpen(true);
        break;
      case "Escape":
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={ref} style={{ position: "relative", minWidth: trigger ? undefined : minWidth }}>
      <button
        type="button"
        className={trigger ? "select-trigger-bare" : `select-trigger ${size === "sm" ? "select-trigger-sm" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        {trigger ? trigger(current, open) : (
          <>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {current?.label ?? "Select"}
            </span>
            <span style={{ display: "flex", color: "var(--muted)", transition: "transform 0.15s ease", transform: open ? "rotate(180deg)" : "none" }}>
              <ChevronDownIcon size={16} />
            </span>
          </>
        )}
      </button>

      {open && rect && createPortal(
        <ul
          ref={listRef}
          role="listbox"
          className="select-menu"
          aria-label={ariaLabel}
          style={{ 
            position: "fixed", 
            top: rect.bottom + 250 > window.innerHeight ? rect.top - 6 : rect.bottom + 6, 
            transform: rect.bottom + 250 > window.innerHeight ? "translateY(-100%)" : "none",
            left: clampLeft(rect.left), 
            minWidth: rect.width,
            maxHeight: "240px",
            overflowY: "auto"
          }}
        >
          {options.map((o, i) => {
            const selected = o.value === value;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={selected}
                className={`select-option ${i === active ? "active" : ""} ${selected ? "selected" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => { e.preventDefault(); choose(o.value); }}
              >
                <span>{o.label}</span>
                {selected && <span style={{ display: "flex", color: "var(--primary)" }}><CheckIcon size={15} /></span>}
              </li>
            );
          })}
        </ul>,
        document.body,
      )}
    </div>
  );
}
