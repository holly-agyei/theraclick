import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { CallUI } from "@/components/CallUI";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Theraklick - Mental Health Support for Students",
  description: "Fast, anonymous, layered mental health support for students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          {children}
          <CallUI />
        </Providers>
      </body>
    </html>
  );
}


