import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PwaBootstrap } from "@/components/pwa/pwa-bootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: "POS Platform Back Office",
  description: "Multi-tenant POS back office and IT admin",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SSTiPOS",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" className="m-0 h-full w-full p-0">
      <body className="m-0 h-full w-full overflow-hidden p-0">
        {children}
        <PwaBootstrap />
      </body>
    </html>
  );
}