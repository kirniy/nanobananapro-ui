import type { Metadata } from "next";
import { DM_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AccessGuard } from "./_components/access-guard";
import { AuthProvider } from "./_components/auth/auth-context";

// Display font for headings and branding
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

// Body font for readable text
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

// Monospace for code/technical text
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nano Banana Pro",
  description: "AI image generation studio. Create stunning visuals with ease.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const accessProtectionEnabled = Boolean(process.env.ACCESS_PASSWORD?.trim());

  return (
    <html lang="en" className={`${dmSans.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <AuthProvider>
          <AccessGuard protectionEnabled={accessProtectionEnabled}>{children}</AccessGuard>
        </AuthProvider>
      </body>
    </html>
  );
}

