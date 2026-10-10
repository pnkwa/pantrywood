import { encodeCode128 } from "@/lib/scan/code128";

const MODULE_WIDTH = 2;
const QUIET_ZONE_MODULES = 10;
const BAR_HEIGHT = 56;

type Bar = { x: number; width: number };

/** Widths alternate bar, space, bar…; only the bars are drawn. */
const barsFor = (widths: number[]): Bar[] => {
  const bars: Bar[] = [];
  let cursor = QUIET_ZONE_MODULES;
  widths.forEach((width, index) => {
    if (index % 2 === 0) bars.push({ x: cursor, width });
    cursor += width;
  });
  return bars;
};

/** A Code 128 barcode as crisp SVG bars, sized for printing. */
export const Code128 = ({ value }: { value: string }) => {
  const widths = encodeCode128(value);
  const totalModules =
    widths.reduce((total, width) => total + width, 0) + QUIET_ZONE_MODULES * 2;
  return (
    <svg
      role="img"
      aria-label={`Barcode ${value}`}
      viewBox={`0 0 ${totalModules * MODULE_WIDTH} ${BAR_HEIGHT}`}
      className="h-14 w-full"
      shapeRendering="crispEdges"
    >
      <rect width="100%" height="100%" fill="#FFFFFF" />
      {barsFor(widths).map((bar) => (
        <rect
          key={bar.x}
          x={bar.x * MODULE_WIDTH}
          width={bar.width * MODULE_WIDTH}
          height={BAR_HEIGHT}
          fill="#000000"
        />
      ))}
    </svg>
  );
};
