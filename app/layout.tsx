import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { CallUI } from "@/components/CallUI";
import { THERAKLICK_LOGO_SRC } from "@/components/Logo";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Theraklick - Mental Health Support for Students",
  description: "Fast, anonymous, layered mental health support for students",
  applicationName: "Theraklick",
  appleWebApp: {
    capable: true,
    title: "Theraklick",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: THERAKLICK_LOGO_SRC,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0F4F47" },
    { media: "(prefers-color-scheme: dark)", color: "#0a3d36" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <CallUI />
        </Providers>
      </body>
    </html>
  );
}


