import type { Metadata } from "next";
import { AppToaster } from "./components/AppToaster";
import { GlobalBackground } from "./components/GlobalBackground";
import "./globals.css";
import "./workspace.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: {
    default: "Threadline PLM",
    template: "%s | Threadline PLM",
  },
  description: "Product lifecycle operations for fashion teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <GlobalBackground />
        <a className="workspace-skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
