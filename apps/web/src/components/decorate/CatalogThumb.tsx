import type { CSSProperties, ReactNode } from "react";
import type { FloorSurface, WallSurface } from "@/components/scene/types";
import type { CatalogItem } from "@/data/catalog";

// Small isometric sketches from docs/mockups/Thumb.dc.html, colored from each item's own palette.

const Box = ({ top, left, right, children }: { top: string; left: string; right: string; children?: ReactNode }) => (
  <g>
    <polygon points="40,6 58,15 40,24 22,15" fill={top} />
    <polygon points="22,15 40,24 40,58 22,49" fill={left} />
    <polygon points="40,24 58,15 58,49 40,58" fill={right} />
    {children}
  </g>
);

const sketchFor = (item: CatalogItem): ReactNode => {
  switch (item.category) {
    case "storage": {
      const { body, trim, accent } = item.model.palette;
      switch (item.model.kind) {
        case "fridge":
          return (
            <Box top={body} left={trim} right={accent}>
              <path d="M22,26 L40,35 M36,38 V48" stroke="#4A3B2E" strokeOpacity=".25" strokeWidth="1.5" strokeLinecap="round" />
            </Box>
          );
        case "pantryShelf":
          return item.id === "oak-ladder-shelf" ? (
            <g>
              <path d="M28,8 L20,58 M48,8 L56,58" stroke={accent} strokeWidth="3" strokeLinecap="round" />
              <path d="M27,18 H49 M25,31 H51 M22,45 H54" stroke={body} strokeWidth="4" strokeLinecap="round" />
            </g>
          ) : (
            <g>
              <polygon points="40,8 62,19 40,30 18,19" fill={body} />
              <polygon points="18,19 40,30 40,58 18,47" fill={accent} />
              <polygon points="40,30 62,19 62,47 40,58" fill={trim} />
              <path d="M18,28 L40,39 M18,37 L40,48" stroke={body} strokeWidth="2.5" />
              <rect x="22" y="25" width="4" height="6" rx="1" fill="#E9A9A9" />
              <rect x="28" y="28" width="4" height="6" rx="1" fill="#A9C9DA" />
              <rect x="24" y="35" width="5" height="5" rx="1" fill="#F2D27A" />
            </g>
          );
        case "suppliesCabinet":
          return (
            <g>
              <polygon points="40,14 62,25 40,36 18,25" fill={body} />
              <polygon points="18,25 40,36 40,56 18,45" fill={trim} />
              <polygon points="40,36 62,25 62,45 40,56" fill={accent} />
              <path d="M18,35 L40,46" stroke="#4A3B2E" strokeOpacity=".2" strokeWidth="1.5" />
              <circle cx="31" cy="38" r="1.5" fill="#4A3B2E" opacity=".35" />
              <circle cx="31" cy="48" r="1.5" fill="#4A3B2E" opacity=".35" />
            </g>
          );
        case "riceBin":
          return (
            <g>
              <ellipse cx="40" cy="50" rx="16" ry="6" fill={trim} />
              <rect x="24" y="20" width="32" height="30" fill={body} />
              <ellipse cx="40" cy="20" rx="16" ry="6" fill={trim} />
              <rect x="30" y="30" width="20" height="10" rx="2" fill="#FFFBF3" opacity=".85" />
            </g>
          );
        case "basket":
          return (
            <g>
              <path d="M18,30 H62 L57,54 H23 Z" fill={body} />
              <ellipse cx="40" cy="30" rx="22" ry="5" fill={trim} />
              <path d="M21,38 H59 M22,46 H58" stroke="#4A3B2E" strokeOpacity=".2" strokeWidth="1.5" />
            </g>
          );
        default:
          return (
            <g>
              <polygon points="36,20 66,35 44,46 14,31" fill={body} />
              <polygon points="14,31 44,46 44,58 14,43" fill={trim} />
              <polygon points="44,46 66,35 66,47 44,58" fill={accent} />
            </g>
          );
      }
    }
    case "shelfItem": {
      const { color, accent } = item.model;
      return item.id === "trailing-pothos" || item.id === "mini-cactus-pot" ? (
        <g>
          <circle cx="33" cy="24" r="9" fill={item.id === "trailing-pothos" ? color : accent} />
          <circle cx="46" cy="20" r="10" fill={item.id === "trailing-pothos" ? accent : "#7E9A68"} />
          <path d="M30,36 H52 L49,56 H33 Z" fill={item.id === "trailing-pothos" ? "#C8755A" : color} />
        </g>
      ) : (
        <g>
          <path d="M10,52 H70" stroke="#C49770" strokeWidth="4" strokeLinecap="round" />
          {[15, 33, 51].map((x, index) => (
            <g key={x}>
              <rect x={x} y={28 - index * 3} width="14" height={22 + index * 3} rx="4" fill={color} stroke="#E6D8BC" />
              <rect x={x - 1} y={24 - index * 3} width="16" height="6" rx="2" fill={accent} />
            </g>
          ))}
        </g>
      );
    }
    case "decor": {
      const [main, second] = item.model.colors;
      switch (item.model.shape) {
        case "rug":
        case "roundRug":
        case "stripedRug":
        case "ovalRug":
          return (
            <g>
              <ellipse cx="40" cy="40" rx="32" ry="16" fill={main} />
              <ellipse cx="40" cy="40" rx="25" ry="12" fill="none" stroke="#FFFBF3" strokeWidth="1.5" strokeDasharray="3 3" />
              <ellipse cx="40" cy="40" rx="16" ry="8" fill={second} />
            </g>
          );
        case "cat":
        case "maskCat":
        case "plainCat": {
          const shape = item.model.shape;
          const ears = shape === "maskCat" ? second : main;

          return (
            <g>
              <path d="M28,48 Q14,44 16,26 Q18,16 26,18" stroke={main} strokeWidth="5" fill="none" strokeLinecap="round" />
              <circle cx="26" cy="18" r="3" fill={shape === "plainCat" ? main : second} />
              <path d="M30,24 L33,12 L40,20 Z M48,20 L55,12 L56,25 Z" fill={ears} />
              {shape === "cat" && <path d="M30,24 L33,12 L37,17 Z" fill={second} />}
              <path d="M24,56 Q22,22 42,19 Q62,22 60,56 Z" fill={main} />
              {shape === "cat" && <ellipse cx="36" cy="25" rx="6" ry="4" fill={second} />}
              {shape === "maskCat" && <ellipse cx="42" cy="38" rx="14" ry="9" fill={second} opacity=".85" />}
              {shape === "plainCat" ? (
                <g fill="none" stroke={second} strokeWidth="1.8">
                  <circle cx="36" cy="38" r="3.6" />
                  <circle cx="48" cy="38" r="3.6" />
                </g>
              ) : (
                <g fill={shape === "maskCat" ? "#4E9BFF" : "#4A3B2E"}>
                  <circle cx="36" cy="38" r="2.8" />
                  <circle cx="48" cy="38" r="2.8" />
                </g>
              )}
            </g>
          );
        }
        case "ginghamWindow":
          return (
            <g>
              <rect x="22" y="12" width="36" height="36" rx="3" fill={main} />
              <rect x="26" y="16" width="28" height="28" fill={second} />
              <path d="M40,16 V44 M26,30 H54" stroke={main} strokeWidth="2" />
              <rect x="18" y="8" width="44" height="7" rx="2" fill="#A9C4C9" />
              <rect x="18" y="48" width="44" height="4" rx="2" fill="#8C6440" />
            </g>
          );
        case "pictureFrames":
          return (
            <g>
              <rect x="16" y="18" width="24" height="22" rx="2" fill={main} />
              <rect x="20" y="22" width="16" height="14" fill={second} />
              <circle cx="28" cy="29" r="4" fill="#8FA67A" />
              <rect x="44" y="20" width="20" height="20" rx="2" fill={main} />
              <rect x="48" y="24" width="12" height="12" fill={second} />
              <circle cx="54" cy="30" r="3" fill="#C8755A" />
            </g>
          );
        case "veggieBasket":
          return (
            <g>
              <circle cx="33" cy="30" r="7" fill="#C8755A" />
              <circle cx="47" cy="30" r="7" fill="#E2B25C" />
              <circle cx="40" cy="25" r="6" fill="#8FA67A" />
              <path d="M20,32 H60 L55,54 H25 Z" fill={main} />
              <path d="M20,32 H60" stroke={second} strokeWidth="3" strokeLinecap="round" />
            </g>
          );
        case "wallClock":
          return (
            <g>
              <circle cx="40" cy="32" r="20" fill={second} stroke={main} strokeWidth="5" />
              <path d="M40,32 V20 M40,32 H50" stroke="#4A3B2E" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          );
        case "catBed":
          return (
            <g>
              <ellipse cx="40" cy="44" rx="24" ry="10" fill={main} />
              <ellipse cx="40" cy="42" rx="16" ry="6" fill={second} />
              <ellipse cx="38" cy="38" rx="10" ry="6" fill="#D9B183" />
              <circle cx="49" cy="36" r="4.5" fill="#D9B183" />
            </g>
          );
        default:
          return (
            <g>
              <path d="M40,46 V58" stroke={second} strokeWidth="3" />
              <ellipse cx="40" cy="30" rx="17" ry="16" fill={main} />
              <path d="M24,26 Q40,30 56,26 M25,34 Q40,38 55,34" stroke={second} strokeWidth="1.5" fill="none" />
            </g>
          );
      }
    }
    default:
      return null;
  }
};

const wallSwatch = ({ pattern, base, line }: WallSurface): CSSProperties => {
  switch (pattern) {
    case "shiplap":
      return { background: `repeating-linear-gradient(0deg, ${base} 0 9px, ${line} 9px 10px)` };
    case "grid":
      return { background: `linear-gradient(${line} 1px, transparent 1px) 0 0 / 10px 10px, linear-gradient(90deg, ${line} 1px, ${base} 1px) 0 0 / 10px 10px` };
    case "dots":
      return { background: `radial-gradient(${line} 1.5px, transparent 2px) 0 0 / 12px 12px, ${base}` };
    case "gingham":
      return { background: `repeating-linear-gradient(0deg, ${line}66 0 6px, transparent 6px 12px), repeating-linear-gradient(90deg, ${line}66 0 6px, ${base} 6px 12px)` };
    case "wainscot":
      return { background: `linear-gradient(${base} 0 55%, #C49770 55% 58%, ${line} 58%)` };
    case "plain":
      return { background: base };
  }
};

const floorSwatch = ({ pattern, base, line }: FloorSurface): CSSProperties => {
  switch (pattern) {
    case "checker":
      return { background: `conic-gradient(${line} 25%, ${base} 0 50%, ${line} 0 75%, ${base} 0) 0 0 / 14px 14px` };
    case "planks":
    case "herringbone":
      return { background: `repeating-linear-gradient(90deg, ${base} 0 14px, ${line} 14px 15px)` };
    case "tatami":
      return { background: `repeating-linear-gradient(90deg, ${base} 0 2px, ${line} 2px 4px)` };
    case "speckle":
      return { background: `radial-gradient(${line} 1px, transparent 1.5px) 0 0 / 6px 6px, ${base}` };
    case "tile":
      return { background: `linear-gradient(${line} 2px, transparent 2px) 0 0 / 12px 12px, linear-gradient(90deg, ${line} 2px, ${base} 2px) 0 0 / 12px 12px` };
  }
};

export const CatalogThumb = ({ item }: { item: CatalogItem }) => (
  <span aria-hidden className="flex h-19 w-full items-center justify-center overflow-hidden rounded-[14px] bg-background">
    {item.category === "wallpaper" || item.category === "floor" ? (
      <span
        style={item.category === "wallpaper" ? wallSwatch(item.material) : floorSwatch(item.material)}
        className="block h-13.5 w-16.5 rounded-[10px] border-[1.5px] border-border"
      />
    ) : (
      <svg width="80" height="64" viewBox="0 0 80 64">
        <ellipse cx="40" cy="58" rx="24" ry="4" fill="#4A3B2E" opacity=".1" />
        {sketchFor(item)}
      </svg>
    )}
  </span>
);
