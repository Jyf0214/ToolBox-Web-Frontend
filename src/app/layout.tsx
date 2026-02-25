import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AntdRegistry } from '@ant-design/nextjs-registry';

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "ToolBox - 高效文档转换",
  description: "DOCX 转 PDF，即用即走，无需登录",
  viewport: { width: "device-width", initialScale: 1, maximumScale: 1 },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={inter.className} style={{ margin: 0, padding: 0, overflowX: 'hidden' }}>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
