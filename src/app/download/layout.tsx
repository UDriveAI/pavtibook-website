import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download PavtiBook Android App",
  description: "Download the official PavtiBook Android application from Google Play Store. Manage collections, issue digital receipts, and keep your Mandal records organized.",
};

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
