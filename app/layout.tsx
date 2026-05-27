import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "New Novels",
  description: "An interactive fair-play detective novella prototype."
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const appEntryPath = requestHeaders.get("x-proxy-base-url") ?? "";

  return (
    <html lang="en">
      <head>
        {appEntryPath ? <meta name="new-novels-entry-path" content={appEntryPath} /> : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
