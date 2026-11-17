import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ExamPilot 智学库",
  description: "AI 智能组卷与复习助手",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
