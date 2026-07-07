import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Review the terms and conditions governing accounts, subscriptions, KYC requirements, and payment processing rules on the PavtiBook platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-cream-light font-sans text-neutral-800 flex flex-col justify-between">
      <Header />

      <main className="flex-1 pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 bg-white p-8 sm:p-12 rounded-2xl border border-maroon/10 shadow-md space-y-8">
          <div className="space-y-2 border-b border-neutral-105 pb-6">
            <h1 className="text-3xl font-black text-maroon-dark">Terms & Conditions</h1>
            <p className="text-xs text-neutral-500 font-semibold">Effective Date: June 21, 2026</p>
          </div>

          <div className="space-y-6 text-sm sm:text-base text-neutral-700 leading-relaxed font-medium">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">1. Agreement to Terms</h2>
              <p>
                By registering an account for your organization (Mandal, Trust, Housing Society, or NGO) on the PavtiBook platform, you agree to comply with and be bound by these Terms & Conditions. These terms govern the use of the mobile applications, web dashboards, receipt generation tools, and related APIs.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">2. Trust KYC Verification and Eligibility</h2>
              <p>
                To collect public donations (vargani, pathdi, or donations) in India, registering organizations must possess legally valid registration certificates. PavtiBook reserves the right to lock accounts or demand KYC documents (such as PAN cards, trust registration certificates, and society bye-laws) to verify organization identities. Individual collectors must be explicitly added and authorized by the trust admins.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">3. UPI P2P Payments and simulated transactions</h2>
              <p>
                PavtiBook provides a peer-to-peer (P2P) UPI QR code rendering tool that routes money directly from the donor&apos;s bank to the organization&apos;s designated VPA (Virtual Payment Address).
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>PavtiBook is NOT a payment gateway or banking entity. We do not handle, store, or hold any donation money.</li>
                <li>All transfers occur directly on consumer UPI payment rails (NPCI).</li>
                <li>The organization is solely responsible for ensuring VPA details are correct. PavtiBook is not liable for routing issues.</li>
                <li>Volunteer-side &quot;Simulated Payment Success&quot; confirmations represent collection flags and do not represent verified bank settlements, which must be audited via the trust&apos;s official bank statement.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">4. Data Ownership and Compliance</h2>
              <p>
                The registering organization holds complete copyright and ownership of all donor and financial records compiled. However, the organization warrants that its collection activity complies with local regulations, including tax exemption certifications (like 80G or 12A).
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">5. Fair Use & Collection Limits</h2>
              <p>
                PavtiBook offers tiered services (Professional, Premium). Organizations must operate within the volume limits of their subscribed plan. Exceeding limits may prompt a hold on new receipt generation until the account is upgraded.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">6. Service Availability & Offline Operations</h2>
              <p>
                While the mobile app operates an offline cache to record receipts during outdoor network drops, internet connection is required to sync databases. PavtiBook strives to maintain 99.9% cloud server uptime but is not liable for data transmission delays caused by local carrier outages.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">7. Termination of Service</h2>
              <p>
                PavtiBook reserves the right to terminate or suspend accounts if organizations violate Indian financial regulations, generate fake receipts, or violate donor trust.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">8. Governing Law</h2>
              <p>
                These terms shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of the use of PavtiBook services shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
