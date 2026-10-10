"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";

let browserQueryClient: QueryClient | undefined;

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000 },
    },
  });

const getQueryClient = () => {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
};

export const Providers = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={getQueryClient()}>
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </QueryClientProvider>
);
