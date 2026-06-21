import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing Plans",
  description: "Simple, transparent pricing for Indian Mandals, Trusts, and NGOs. Professional plan at just ₹99/month with unlimited digital receipts. Zero transaction commissions.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
