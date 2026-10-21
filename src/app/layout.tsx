import type { Metadata } from "next";
import "lenis/dist/lenis.css";
import "./globals.css";
import Providers from "./providers";
import { chunkRecoveryScript } from '@/lib/chunk-recovery';

export const metadata: Metadata = {
  title: "Component Studio",
  description: "Modern component generator with live reactivity.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head><script dangerouslySetInnerHTML={{ __html: chunkRecoveryScript }}/></head>
      <body className="antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
