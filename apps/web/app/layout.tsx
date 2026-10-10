import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Sans_Thai } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin", "latin-ext"],
});

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Pantrywood",
  description: "A cozy storage room for your Grocy pantry.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${dmSans.variable} ${plexThai.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
