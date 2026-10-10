import { useEffect, useRef } from "react";

/*
 * USB/Bluetooth scanners act as keyboards: they "type" the code very fast and press Enter.
 * People type far slower, so a burst of keys arriving within MAX_KEY_GAP_MS of each other,
 * at least MIN_CODE_LENGTH long and ending in Enter, is treated as a scan.
 */
const MAX_KEY_GAP_MS = 50;
const MIN_CODE_LENGTH = 4;

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement ||
  (target instanceof HTMLElement && target.isContentEditable);

/**
 * Calls `onScan` with each code from a hardware scanner, anywhere on the page.
 * Keys pressed inside text fields are left alone, so normal typing is never captured.
 * Pass a stable `onScan` (e.g. from useCallback).
 */
export const useHardwareScanner = (onScan: (code: string) => void) => {
  const buffer = useRef("");
  const lastKeyAt = useRef(0);
  // Global key listener: scanners type into whatever has focus, with no React event to use.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) {
        buffer.current = "";
        return;
      }
      const tooSlow = event.timeStamp - lastKeyAt.current > MAX_KEY_GAP_MS;
      lastKeyAt.current = event.timeStamp;

      if (event.key === "Enter") {
        const code = buffer.current;
        buffer.current = "";
        if (!tooSlow && code.length >= MIN_CODE_LENGTH) {
          event.preventDefault();
          onScan(code);
        }
        return;
      }
      if (event.key.length !== 1) return;
      buffer.current = tooSlow ? event.key : buffer.current + event.key;
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onScan]);
};
