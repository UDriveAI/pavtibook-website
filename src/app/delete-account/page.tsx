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
            <p className="text-xs text-neutral-500 font-semibold">Effective Date: August 28, 2026</p>
          </div>

          <div className="space-y-6 text-sm sm:text-base text-neutral-700 leading-relaxed font-medium">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">1. How to Delete Your Account</h2>
              
              <div className="bg-cream-light p-5 rounded-xl border border-maroon/10 space-y-3">
                <h3 className="text-base font-bold text-maroon-dark">Option A: In-App Self-Service Deletion (Instant)</h3>
                <p>
                  You can immediately delete your account directly from within the PavtiBook mobile application:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-sm sm:text-base">
                  <li>Open the <strong>PavtiBook</strong> app and navigate to the <strong>Profile</strong> tab.</li>
                  <li>Scroll to the <strong>Danger Zone</strong> card and tap <strong>Delete Account</strong>.</li>
                  <li>Review the permanent deletion warning and consequences.</li>
                  <li>Complete <strong>2-Step Security Verification</strong> (Password, Google Sign-In, or 6-digit Mobile SMS OTP).</li>
                  <li>Enter the final confirmation by typing <strong>DELETE</strong> in uppercase.</li>
                  <li>Your user account, personal profile, and authentication credentials will be erased immediately.</li>
                </ol>
              </div>

              <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-3">
                <h3 className="text-base font-bold text-maroon-dark">Option B: Email Request Fallback</h3>
                <p>
                  If you have uninstalled the app or lost access to your registered device, you can request account deletion by sending an email from your registered address to:
                </p>
                <p className="bg-cream-light p-3 rounded-lg border border-maroon/5 inline-block font-mono text-maroon-dark">
                  <a href="mailto:admin@pavtibook.online" className="hover:underline">
                    admin@pavtibook.online
                  </a>
                </p>
                <p className="text-sm">
                  Please include: <strong>Registered Mobile Number</strong>, <strong>Registered Email</strong>, <strong>Organization Name</strong>, and reason for deletion (optional).
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">2. What Will Be Deleted Immediately</h2>
              <p>
                Upon completing account deletion, the following personal data is permanently wiped from our production databases:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Firebase Authentication login credentials and active session tokens</li>
                <li>Personal user profile record (name, contact details, role metadata)</li>
                <li>Uploaded personal profile photos and thumbnail image files</li>
                <li>Personal device tokens and push notification preferences</li>
                <li>Active membership access links to registered organizations</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">3. Data Retention & Legal Compliance</h2>
              <p>
                Under Indian accounting, charity commissioner, trust acts, and statutory tax compliance regulations:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Organization Receipt Books:</strong> Digital receipts issued by your organization are official financial records belonging to the registered Trust/Mandal and remain intact. Historical creator name signatures on receipts are retained for audit validity.
                </li>
                <li>
                  <strong>Payment & Subscription Records:</strong> Payment gateway transaction history (Razorpay / Google Play) is retained for statutory financial accounting and dispute resolution.
                </li>
                <li>
                  <strong>Organization Owners:</strong> If you are the registered Owner of an active organization with other members or financial receipts, you must transfer ownership to another team member or archive the organization before deleting your personal account.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">4. Processing Timeline</h2>
              <p>
                • <strong>In-App Deletion:</strong> Processed <strong>instantly</strong> upon successful 2-step verification and confirmation.<br />
                • <strong>Email Requests:</strong> Identity is verified by our compliance team and fully processed within <strong>30 days</strong>.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-maroon-dark">5. Contact Support</h2>
              <p>
                If you have any questions regarding your data privacy or the account deletion process, please contact us at:
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
