import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/baloo-2";
import "@fontsource/mukta/400.css";
import "@fontsource/mukta/500.css";
import "@fontsource/mukta/600.css";
import "@fontsource/mukta/700.css";
import "./globals.css";
import { PREFS_BOOTSTRAP } from "@/lib/prefs/bootstrap";
import { AppProviders } from "@/components/shell/app-providers";

export const metadata: Metadata = {
  title: { default: "BLOOM", template: "%s | BLOOM" },
  description:
    "Period tracking, a companion called Mochi, and safety tools that still work without internet. Built for women in India.",
  applicationName: "BLOOM",
  appleWebApp: { capable: true, title: "BLOOM", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#1c0c14" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" data-theme="light" data-discreet="false" data-motion="full" data-contrast="normal" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: PREFS_BOOTSTRAP }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
