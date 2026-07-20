import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PLM Automation Run",
  description: "Fashion editorial PLM operations prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
