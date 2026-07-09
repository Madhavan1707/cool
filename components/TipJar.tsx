"use client";

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Where the money lands.
//
// UPI is instant and zero-fee for anyone paying from within India, so it's the
// primary jar. The QR below is your GPay screenshot in /public.
//
// GLOBAL_TIP_URL is for visitors outside India who can't scan a UPI code. Paste
// your Ko-fi or Buy Me a Coffee link here once the account exists — until then
// it stays empty and the "from outside India" button simply doesn't render.
// ---------------------------------------------------------------------------
const UPI_ID = "madhvan02-3@oksbi";
const UPI_QR_SRC = "/gpay.jpeg";
const GLOBAL_TIP_URL = "";
const GLOBAL_TIP_LABEL = "Buy me a coffee";

// Matches the focus ring used across the app (see FOCUS_RING in app/home.tsx).
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ring-offset)]";

const COPIED_FEEDBACK_MS = 1600;

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 21s-6.7-4.35-9.33-8.5C.9 9.7 2.2 6 5.5 6c2 0 3.2 1.1 4.5 2.6C11.3 7.1 12.5 6 14.5 6c3.3 0 4.6 3.7 2.83 6.5C18.7 16.65 12 21 12 21z" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export default function TipJar() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on Escape, and move focus to the dialog's close button when it opens.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  async function copyUpi() {
    try {
      await navigator.clipboard.writeText(UPI_ID);
    } catch {
      // Fallback for browsers without the async clipboard API.
      const el = document.createElement("textarea");
      el.value = UPI_ID;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 bg-[color:var(--surface)] backdrop-blur-sm border border-[color:var(--border)] shadow-sm hover:border-[color:var(--ink-faint)] active:scale-95 transition rounded-full px-4 py-2 text-xs font-medium text-[color:var(--ink-soft)] ${FOCUS_RING}`}
      >
        <HeartIcon className="w-3.5 h-3.5" />
        Tip the maker
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Tip the maker"
        >
          <div
            className="relative w-full max-w-sm bg-[color:var(--surface)] backdrop-blur-xl border border-[color:var(--border)] rounded-2xl shadow-xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={closeRef}
              onClick={() => setOpen(false)}
              aria-label="Close"
              className={`absolute top-3 right-3 inline-flex items-center justify-center rounded-full p-2 text-[color:var(--ink-faint)] hover:text-[color:var(--ink-soft)] hover:bg-[color:var(--border)]/40 transition ${FOCUS_RING}`}
            >
              <CloseIcon className="w-4 h-4" />
            </button>

            <h2 className="text-base font-semibold text-[color:var(--ink)]">
              Enjoyed your shape?
            </h2>
            <p className="mt-1.5 text-sm text-[color:var(--ink-soft)] leading-relaxed">
              This is a free, one-person project. If it made you smile, you can
              leave a little something. Completely optional.
            </p>

            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--ink-faint)]">
                Pay in India · UPI
              </p>
              {/* Static screenshot QR of unknown-but-portrait aspect; a plain
                  img avoids next/image forcing a fixed box and distorting it. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={UPI_QR_SRC}
                alt="Scan this UPI QR code to send a tip"
                className="mx-auto mt-3 max-h-64 w-auto rounded-xl border border-[color:var(--border)]"
              />
              <button
                onClick={copyUpi}
                className={`mx-auto mt-3 inline-flex items-center gap-2 bg-[color:var(--surface)] border border-[color:var(--border)] shadow-sm hover:border-[color:var(--ink-faint)] active:scale-95 transition rounded-full px-4 py-2 text-xs font-medium text-[color:var(--ink-soft)] ${FOCUS_RING}`}
              >
                {copied ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5 text-green-600" />
                    UPI ID copied
                  </>
                ) : (
                  <>
                    <CopyIcon className="w-3.5 h-3.5" />
                    {UPI_ID}
                  </>
                )}
              </button>
            </div>

            {GLOBAL_TIP_URL && (
              <div className="mt-5 pt-5 border-t border-[color:var(--border)]">
                <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--ink-faint)]">
                  Paying from outside India
                </p>
                <a
                  href={GLOBAL_TIP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mx-auto mt-3 inline-flex items-center gap-2 bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] active:scale-95 transition text-[color:var(--accent-ink)] rounded-full shadow-sm shadow-black/10 px-5 py-2.5 text-sm font-medium ${FOCUS_RING}`}
                >
                  <HeartIcon className="w-4 h-4" />
                  {GLOBAL_TIP_LABEL}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
