import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "New Novels",
  description: "An interactive fair-play detective novella prototype."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
