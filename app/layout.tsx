import type { Metadata } from "next";
import "./globals.css";
import CopyProtection from "@/components/CopyProtection";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Value Proposition Generator + Prospect Universe Builder",
  description: "Build strategic value propositions using value mapping framework and Jobs-to-Be-Done methodology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased flex flex-col min-h-screen">
        <CopyProtection />
        <div className="flex-1">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}

