import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://iamlens.dev"),
  title: {
    default: "IAM Lens — AWS IAM Policy Visualizer",
    template: "%s",
  },
  description:
    "Turn AWS IAM policies into visual clarity. Paste a policy and see a graph, plain-English summary, and risk flags.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "IAM Lens — AWS IAM Policy Visualizer",
    description:
      "Turn AWS IAM policies into visual clarity. Paste a policy and see a graph, plain-English summary, and risk flags.",
    url: "https://iamlens.dev",
    siteName: "IAM Lens",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IAM Lens — AWS IAM Policy Visualizer",
    description:
      "Turn AWS IAM policies into visual clarity. Free, client-side, no signup.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
