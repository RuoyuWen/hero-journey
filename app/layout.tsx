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
  title: "Luminaria — A book of what you saw",
  description:
    "Turn a Near-Death Experience into a quiet, illustrated picture book — in your own words — to share with family and friends, or to keep for yourself.",
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
