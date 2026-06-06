import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon, CheckIcon } from "./icons";
import { useAnchorRect, clampLeft } from "./useAnchorRect";

export type SelectOption = { value: string; label: string };

/**
 * Multi-select dropdown with checkboxes and a summary trigger ("2 statuses").
 * Selecting toggles values without closing the menu; an empty selection means
 * "no filter" (shows the placeholder). Keyboard: ↑/↓ move, Space/Enter toggle,
 * Esc closes, Tab/click-away dismiss.
 */
export default function MultiSelect({
  values,
  onChange,
  options,
  ariaLabel,
  placeholder = "All",
  noun = "item",
  nounPlural = "items",
  minWidth = 168,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  options: SelectOption[];
  ariaLabel?: string;
  placeholder?: string;
  noun?: string;
  nounPlural?: string;
  minWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const rect = useAnchorRect(ref, open);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const toggle = (v: string) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);

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
        if (open && options[active]) toggle(options[active].value);
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

  const label =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? options.find((o) => o.value === values[0])?.label ?? `1 ${noun}`
        : `${values.length} ${nounPlural}`;

  const allSelected = values.length === options.length;

  return (
    <div ref={ref} style={{ position: "relative", minWidth }}>
      <button
        type="button"
        className="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: values.length ? "var(--text)" : "var(--muted)" }}>
          {label}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {values.length > 0 && <span className="select-count">{values.length}</span>}
          <span style={{ display: "flex", color: "var(--muted)", transition: "transform 0.15s ease", transform: open ? "rotate(180deg)" : "none" }}>
            <ChevronDownIcon size={16} />
          </span>
        </span>
      </button>

      {open && rect && createPortal(
        <ul
          ref={listRef}
          role="listbox"
          aria-multiselectable="true"
          aria-label={ariaLabel}
          className="select-menu"
          style={{ position: "fixed", top: rect.bottom + 6, left: clampLeft(rect.left), minWidth: rect.width }}
        >
          {options.map((o, i) => {
            const checked = values.includes(o.value);
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={checked}
                className={`select-option ${i === active ? "active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => { e.preventDefault(); toggle(o.value); }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={`select-check ${checked ? "checked" : ""}`}>
                    {checked && <CheckIcon size={12} />}
                  </span>
                  <span style={{ fontWeight: checked ? 600 : 400, color: checked ? "var(--primary-dark)" : "var(--text)" }}>{o.label}</span>
                </span>
              </li>
            );
          })}
          <li className="select-foot">
            <button
              type="button"
              disabled={values.length === 0}
              onMouseDown={(e) => { e.preventDefault(); onChange([]); }}
            >
              Clear
            </button>
            <button
              type="button"
              disabled={allSelected}
              onMouseDown={(e) => { e.preventDefault(); onChange(options.map((o) => o.value)); }}
            >
              Select all
            </button>
          </li>
        </ul>,
        document.body,
      )}
    </div>
  );
}
