import { useEffect, useRef, type ReactNode } from "react";
import { PixelIcon } from "./PixelIcon";

export function Modal({
  open,
  onClose,
  title,
  width = 520,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="anim-fade fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{
        backgroundColor: "rgba(10, 6, 16, 0.55)",
        backgroundImage: "conic-gradient(rgba(10,6,16,.35) 25%, transparent 0 50%, rgba(10,6,16,.35) 0 75%, transparent 0)",
        backgroundSize: "4px 4px",
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="px-panel anim-pop flex max-h-full w-full flex-col outline-none"
        style={{ maxWidth: width }}
      >
        <header
          className="flex items-center justify-between px-4 py-3"
          style={{ background: "var(--panel-2)", boxShadow: "inset 0 -3px 0 0 var(--border)" }}
        >
          <h2 className="font-pixel m-0 text-[11px]" style={{ color: "var(--accent)" }}>
            {title}
          </h2>
          <button className="px-btn-ghost border-0" onClick={onClose} aria-label="Close" title="Close (Esc)">
            <PixelIcon name="close" size={16} />
          </button>
        </header>
        <div className="scrollbar-px min-h-0 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
