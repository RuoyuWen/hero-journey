import type { Metadata } from "next";
import { Literata, DM_Sans } from "next/font/google";
import "./globals.css";

const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hero Journey — Healing Picture Book",
  description:
    "Turn personal stories into a warm, spoken picture book for stroke survivors and loved ones.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${literata.variable} ${dmSans.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
