import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download Android App",
  description: "Get early access to the PavtiBook mobile application. Install the Android APK to manage your Mandal or Trust collections on-the-go.",
};

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
