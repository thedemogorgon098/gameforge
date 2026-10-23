import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { Background } from "@/components/background";
import { MotionProvider } from "@/components/motion";

import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const code = JetBrains_Mono({ subsets: ["latin"], variable: "--font-code", display: "swap" });

export const metadata: Metadata = {
  title: { default: "GameForge AI — prompt to playable game", template: "%s · GameForge AI" },
  description: "Pick a template, describe a theme, and get a playable, shareable browser game in seconds.",
};

export const viewport: Viewport = {
  themeColor: "#05060f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${display.variable} ${code.variable}`}>
      <body className="font-sans">
        <Background />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
