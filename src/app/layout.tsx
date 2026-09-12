import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "Trade Schedule";

export const metadata: Metadata = {
  title: COMPANY_NAME,
  applicationName: "Eagle TPP",
  description: "Shared trade capacity scheduling for project managers and site supervisors.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Eagle TPP",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/eagle-tpp-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/eagle-tpp-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
