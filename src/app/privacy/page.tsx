import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read our privacy policy to understand how PavtiBook safely processes, stores, and protects trust databases, volunteer access, and donor logs.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream-light font-sans text-neutral-800 flex flex-col justify-between">
      <Header />

      <main className="flex-1 pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 bg-white p-8 sm:p-12 rounded-2xl border border-maroon/10 shadow-md space-y-8">
          <div className="space-y-2 border-b border-neutral-105 pb-6">
            <h1 className="text-3xl font-black text-maroon-dark">Privacy Policy</h1>
            <p className="text-xs text-neutral-500 font-semibold">Effective Date: June 21, 2026</p>
          </div>

          <div className="space-y-6 text-sm sm:text-base text-neutral-700 leading-relaxed font-medium">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">1. Introduction</h2>
              <p>
                PavtiBook (&quot;we,&quot; &quot;our,&quot; &quot;us&quot;) provides a digital receipt and collection management platform specifically designed for Indian Ganesh Mandals, Navratri Mandals, Temple Trusts, Housing Societies, NGOs, and community groups. This Privacy Policy details how we handle the collection, storage, and protection of organization accounts, volunteer collector details, and donor records.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">2. Information We Collect</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Organization & Account Information:</strong> When a trust registers, we collect the organization name, registration details (e.g. Trust PAN, 80G status), official address, president/treasurer details, and contact numbers.
                </li>
                <li>
                  <strong>Volunteer Collector Information:</strong> We collect names and mobile numbers of volunteers authorized by the trust to collect donations.
                </li>
                <li>
                  <strong>Donor Information:</strong> When volunteers issue digital receipts, they record the donor&apos;s mobile number, name, amount contributed, purpose (vargani type), and payment method (cash, check, or UPI reference).
                </li>
                <li>
                  <strong>Audit Metadata:</strong> For compliance and anti-leakage audits, the platform logs device info, IP addresses, collector IDs, and timestamp logs for each transaction.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">3. Data Ownership and Row Isolation</h2>
              <p>
                All donor database and transaction records are the absolute property of the registering organization. PavtiBook uses secure multi-tenant UUID Isolation, meaning your organization&apos;s data is strictly partitioned and isolated. No other mandal, trust, or third-party can inspect, search, or access your transaction records.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">4. How We Use the Information</h2>
              <p>
                We use the collected information exclusively to:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Generate and deliver digital receipts via PDF, JPG, and WhatsApp API.</li>
                <li>Compile dashboard statistics, total cash vs. UPI collection logs, and activity reports for committee reviews.</li>
                <li>Verify trust identities (KYC procedures) to maintain the platform&apos;s trust environment.</li>
                <li>Prevent financial fraud or duplicate receipt entries in the field.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">5. Data Security</h2>
              <p>
                We execute security protocols to protect public trust funds. All data is encrypted during transit (via HTTPS/SSL) and at rest on secure cloud servers hosted in Indian regions. We enforce strict JWT session tokens and OTP logins to prevent unauthorized volunteer access.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">6. Updates to this Policy</h2>
              <p>
                We may periodically update this policy to reflect regulatory changes or service enhancements. Registered trusts will receive notifications of material changes via WhatsApp message or email.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">7. Contact Information</h2>
              <p>
                For data privacy requests or information corrections, please contact our Compliance Officer at:
                <br />
                <strong>Email:</strong> privacy@pavtibook.online
                <br />
                <strong>WhatsApp:</strong> +91 98765 43210
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
