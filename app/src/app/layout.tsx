import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Hub",
  description: "Control surface for the self-hosted multi-AI workspace hub.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
