import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI English Coach",
  description: "An AI English coach that calls you at the scheduled time",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
