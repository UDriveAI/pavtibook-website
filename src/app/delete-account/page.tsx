import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Delete Your PavtiBook Account",
  description: "Learn how to request account deletion and understand what data is permanently deleted or retained in accordance with Indian regulatory compliance.",
};

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-cream-light font-sans text-neutral-800 flex flex-col justify-between">
      <Header />

      <main className="flex-1 pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 bg-white p-8 sm:p-12 rounded-2xl border border-maroon/10 shadow-md space-y-8">
          <div className="space-y-2 border-b border-neutral-200 pb-6">
            <h1 className="text-3xl font-black text-maroon-dark">Delete Your PavtiBook Account</h1>
            <p className="text-xs text-neutral-500 font-semibold">Effective Date: July 7, 2026</p>
          </div>

          <div className="space-y-6 text-sm sm:text-base text-neutral-700 leading-relaxed font-medium">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">1. How to Request Account Deletion</h2>
              <p>
                If you wish to permanently delete your PavtiBook account and associated personal data, please send a deletion request to:
              </p>
              <p className="bg-cream-light p-3 rounded-lg border border-maroon/5 inline-block font-mono text-maroon-dark">
                <a href="mailto:admin@pavtibook.online" className="hover:underline">
                  admin@pavtibook.online
                </a>
              </p>
              <p>
                To help us verify and process your request quickly, please include the following information in your email:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Registered mobile number:</strong> The phone number associated with your account.
                </li>
                <li>
                  <strong>Registered email address:</strong> The email address linked to your profile.
                </li>
                <li>
                  <strong>Organization name:</strong> The name of your trust, mandal, or society.
                </li>
                <li>
                  <strong>Reason for deletion:</strong> (Optional) Feedback on how we can improve.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">2. What Will Be Deleted</h2>
              <p>
                Upon processing your account deletion request, the following information will be permanently deleted from our databases:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>User profile and volunteer collector details</li>
                <li>Organization settings and trust configuration profiles</li>
                <li>Donor contact directories</li>
                <li>Uploaded profile images</li>
                <li>Uploaded receipt images, custom templates, and other documents</li>
                <li>Account preferences and configurations</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">3. Data Retention Policy</h2>
              <p>
                Some financial records, receipt audit trails, or transaction history details may be retained even after account deletion, but only where we are required to do so under applicable laws, accounting requirements, or regulatory obligations in India.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">4. Processing Timeline</h2>
              <p>
                Once we receive your deletion request, our compliance team will verify your identity to prevent unauthorized deletion. Verified account deletion requests are fully completed and all associated data is permanently erased within <strong>30 days</strong>.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">5. Contact Support</h2>
              <p>
                If you have any questions or require assistance during the account deletion process, you can reach our administration and support team at:
              </p>
              <p>
                <strong>Email:</strong>{" "}
                <a href="mailto:admin@pavtibook.online" className="text-maroon hover:underline">
                  admin@pavtibook.online
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
