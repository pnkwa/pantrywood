import { useCallback, useState } from "react";
import type { ReaderOptions } from "zxing-wasm/reader";

export type CameraStatus =
  | "idle"
  | "starting"
  | "scanning"
  | "denied"
  | "unavailable";

export type ScanEngine = "native" | "zxing";

const NATIVE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"];
const ZXING_FORMATS: ReaderOptions["formats"] = [
  "EAN13",
  "EAN8",
  "UPCA",
  "UPCE",
  "Code128",
  "Code39",
  "QRCode",
];
const SCAN_INTERVAL_MS = 180;
const ZXING_WASM_PATH = "/zxing/zxing_reader.wasm";

type ReadFrame = (video: HTMLVideoElement) => Promise<string | null>;

const nativeReader = async (): Promise<ReadFrame | null> => {
  if (typeof BarcodeDetector === "undefined") return null;
  const supported = await BarcodeDetector.getSupportedFormats();
  const formats = NATIVE_FORMATS.filter((format) => supported.includes(format));
  if (formats.length === 0) return null;
  const detector = new BarcodeDetector({ formats });
  return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
};

/** zxing-wasm, served from /public so scanning never depends on a CDN. */
const zxingReader = async (): Promise<ReadFrame> => {
  const { prepareZXingModule, readBarcodes } = await import("zxing-wasm/reader");
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith(".wasm") ? ZXING_WASM_PATH : prefix + path,
    },
  });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  return async (video) => {
    if (!context || video.videoWidth === 0) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    const results = await readBarcodes(frame, {
      formats: ZXING_FORMATS,
      maxNumberOfSymbols: 1,
    });
    return results[0]?.text || null;
  };
};

type CameraScannerOptions = {
  enabled: boolean;
  /** Keep this stable (e.g. useCallback); a new function restarts the camera. */
  onDetect: (code: string) => void;
};

/**
 * Camera barcode scanning. Attach `videoRef` to a <video>; the camera starts when it mounts
 * and stops when it unmounts or `enabled` turns off. Uses the browser's BarcodeDetector
 * when it can, zxing-wasm otherwise.
 */
export const useCameraScanner = ({ enabled, onDetect }: CameraScannerOptions) => {
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [engine, setEngine] = useState<ScanEngine | null>(null);
  const [mirrored, setMirrored] = useState(false);

  // A ref callback with cleanup starts and stops the camera with the <video> element itself.
  const videoRef = useCallback(
    (video: HTMLVideoElement | null) => {
      if (!video || !enabled) return;
      let stopped = false;
      let stream: MediaStream | null = null;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const start = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
          setStatus("unavailable");
          return;
        }
        setStatus("starting");
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
          });
        } catch (error) {
          const denied = error instanceof DOMException && error.name === "NotAllowedError";
          setStatus(denied ? "denied" : "unavailable");
          return;
        }
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        // Front cameras and webcams feel natural mirrored; a rear camera shows the label as it is.
        const facingMode = stream.getVideoTracks()[0]?.getSettings().facingMode;
        setMirrored(facingMode !== "environment");
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        const native = await nativeReader();
        const readFrame = native ?? (await zxingReader());
        setEngine(native ? "native" : "zxing");
        setStatus("scanning");

        const scanNextFrame = async () => {
          if (stopped) return;
          const code = await readFrame(video).catch(() => null);
          if (code && !stopped) onDetect(code);
          timer = setTimeout(scanNextFrame, SCAN_INTERVAL_MS);
        };
        scanNextFrame();
      };

      start();
      return () => {
        stopped = true;
        clearTimeout(timer);
        stream?.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
        setStatus("idle");
      };
    },
    [enabled, onDetect],
  );

  return { videoRef, status, engine, mirrored };
};
