import type { Metadata } from "next";
import { Inter, Caveat } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import AppShell from "@/components/layout/AppShell";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// Handwritten accent used sparingly on /about. next/font self-hosts it at
// build time, so this costs one small woff2 and no third-party request.
const caveat = Caveat({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-hand" });

export const metadata: Metadata = {
  title: "SGSITS NotesVault | B.Tech First Year",
  description:
    "Unit-wise notes, official syllabus, class slides and previous year questions for every first-year subject — Semester I & II.",
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  // suppressHydrationWarning on <html>: the inline theme script below sets
  // data-theme / a class before React hydrates, which React would otherwise
  // flag as a server/client attribute mismatch.
  return (
    <html lang="en" className={`${inter.variable} ${caveat.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply a stored dark-mode preference before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-95XSMRGK8C"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-95XSMRGK8C');
          `}
        </Script>
      </head>
      <body className="antialiased pb-16 md:pb-0">
        <Providers>
          <AppShell>{children}</AppShell>
          {modal}
        </Providers>
      </body>
    </html>
  );
}