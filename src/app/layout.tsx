import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rilogram Support Chat",
  description: "Connect with Rilogram Support and Administration team in real-time.",
  icons: {
    icon: "/rilogram_logo.png",
    shortcut: "/rilogram_logo.png",
    apple: "/rilogram_logo.png",
  },
  other: {
    "google-adsense-account": "ca-pub-6821892124319111",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-XXXXXXXXXXXXXXXX";

  return (
    <html lang="en">
      <body>
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
