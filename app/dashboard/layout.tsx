import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";

export async function generateMetadata(): Promise<Metadata> {
  const r = await keystoneClient<{ agencyName: string | null }>("{ agencyName }");
  const name = (r.success && r.data?.agencyName) || "Sports agency";
  return { title: `${name} staff`, description: `Staff dashboard for ${name}.` };
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster />
    </ThemeProvider>
  );
}
