import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Autolink | Agentic LinkedIn Growth",
  description: "AI employee for LinkedIn growth"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <div className="min-h-screen md:pl-64">{children}</div>
      </body>
    </html>
  );
}
