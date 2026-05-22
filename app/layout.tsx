import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 블로그 글 생성",
  description: "주제와 톤에 맞는 블로그 글을 AI로 생성합니다",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
