import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "WhenFree",
  description: "See when your friend group is free.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <Link className="brand" href="/">WhenFree</Link>
          <div className="navlinks">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/schedule">My schedule</Link>
          </div>
        </nav>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
