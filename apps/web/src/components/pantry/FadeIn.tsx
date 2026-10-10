"use client";

import { motion } from "motion/react";
import { PANEL_SPRING } from "@/lib/motion";

const STAGGER_SECONDS = 0.04;

type FadeInProps = {
  order?: number;
  className?: string;
  onEntered?: () => void;
  children: React.ReactNode;
};

/** Panel sections fade in one after another while the panel slides and the item icon flies. */
export const FadeIn = ({
  order = 0,
  className,
  onEntered,
  children,
}: FadeInProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { ...PANEL_SPRING, delay: order * STAGGER_SECONDS },
      }}
      onAnimationComplete={onEntered}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const fadeInDelay = (order: number) => order * STAGGER_SECONDS;
