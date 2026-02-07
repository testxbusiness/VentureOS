import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Business OS",
  description: "CEO console for proposal approval and autonomous iteration"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
