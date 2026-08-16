import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastViewport } from "@/components/toast";
import { NotificationListener } from "@/components/notification-listener";
import { ChatUnreadListener } from "@/components/chat-unread-listener";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Comm Connect",
  description: "A better way to connect with your community.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}<NotificationListener /><ChatUnreadListener /><ToastViewport /></body>
    </html>
  );
}
