import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Request a Free Demo",
  description: "Schedule a walkthrough with our specialists. See how PavtiBook helps digitize your collection records, track donors, and manage accounts seamlessly.",
};

export default function RequestDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
