import type { Metadata } from "next";
import "./globals.css";
import SplashCursor from "@/components/SplashCursor";
import { AuthProvider } from "@/lib/contexts/AuthContext";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_PRODUCT_NAME || "BabelBooks",
  description: "AI-powered storytelling for bilingual kids",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&family=Nunito+Sans:wght@300;400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body bg-soft-white">
        <AuthProvider>
          <SplashCursor />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}