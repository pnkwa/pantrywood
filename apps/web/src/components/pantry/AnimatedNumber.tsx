"use client";

import { useRef, useState } from "react";
import { motion, type Transition } from "motion/react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const TWEEN: Transition = { duration: 0.4, ease: "easeOut" };
const TWEEN_VARIABLE = "--tween-value";

const format = (value: number, decimals: number) =>
  value.toFixed(decimals).replace(/\.0+$/, "");

type TweenProps = {
  from: number;
  to: number;
  className: string;
  reducedMotion: boolean;
};

/** Animates a CSS variable from `from` to `to` and writes each step into the text. */
const Tween = ({ from, to, className, reducedMotion }: TweenProps) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const decimals = Number.isInteger(to) ? 0 : 1;
  return (
    <motion.span
      ref={spanRef}
      className={className}
      initial={{ [TWEEN_VARIABLE]: from }}
      animate={{ [TWEEN_VARIABLE]: to }}
      transition={reducedMotion ? { duration: 0 } : TWEEN}
      onUpdate={(latest) => {
        const current = latest[TWEEN_VARIABLE];
        if (typeof current === "number" && spanRef.current) {
          spanRef.current.textContent = format(current, decimals);
        }
      }}
    >
      {format(from, Number.isInteger(from) ? 0 : 1)}
    </motion.span>
  );
};

export const AnimatedNumber = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  const reducedMotion = useReducedMotion();
  const [tween, setTween] = useState({ from: value, to: value });
  if (tween.to !== value) setTween({ from: tween.to, to: value });
  return (
    <Tween
      key={`${tween.from}→${tween.to}`}
      from={tween.from}
      to={tween.to}
      className={`tabular ${className ?? ""}`}
      reducedMotion={reducedMotion}
    />
  );
};
