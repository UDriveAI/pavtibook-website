import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  FileText,
  ShieldAlert,
  Users,
  Clock,
  Smartphone,
  Award,
  RefreshCw,
  Lock,
  ArrowRight,
  MessageSquare
} from "lucide-react";
import { generateWhatsAppLink, getFormattedWhatsAppDisplay } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Features",
  description: "Explore PavtiBook's powerful features tailored for Indian festival committees, temple trusts, and NGOs. Features custom receipt engines, zero-commission UPI codes, WhatsApp delivery, and cloud donor databases.",
};

export default function FeaturesPage() {
  const displayPhone = getFormattedWhatsAppDisplay();
  const whatsAppLink = generateWhatsAppLink("नमस्कार PavtiBook Team, मला Features बद्दल अधिक माहिती हवी आहे.");

  const deepFeatures = [
    {
      id: "receipt-engine",
      title: "Traditional Receipt Engine",
      marathi: "डिजिटल पावती इंजिन",
      desc: "Preserves the cultural aesthetic of traditional receipt books while digitizing operations. Renders clean double borders, traditional Devanagari headers like '॥ श्री गणेश प्रसन्न ॥', and optional deity watermarks. Generates high-resolution PDFs ready for desktop printing or compact JPG formats optimized for instant WhatsApp delivery.",
      icon: <FileText className="w-9 h-9 text-maroon" />,
      bullets: [
        "Select from Cream, Yellow, or Saffron paper tints",
        "Devanagari script support for Marathi and Hindi",
        "Verifiable QR code block automatically appended",
        "Compressed JPG & PDF formatting for low-data sharing"
      ]
    },
    {
      id: "audit-trail",
      title: "Tamper-Proof Audit Trail",
      marathi: "सुरक्षित ऑडिट नोंद",
      desc: "Maintains financial transparency. Every single receipt records the volunteer collector's unique account ID, timestamp, and payment method (Cash or UPI). Automated sequential numbering prevents missing or duplicated pages.",
      icon: <ShieldAlert className="w-9 h-9 text-orange-brand" />,
      bullets: [
        "Tracks volunteer collection totals in real time",
        "Automated sequential serial numbers (PB-2026-000001)",
        "Easy-to-export Excel/CSV formats for committee meetings",
        "Verifiable QR token validation against database"
      ]
    },
    {
      id: "donor-management",
      title: "Smart Donor Directory (CRM)",
      marathi: "देणगीदार नोंदणी",
      desc: "Never forget a community supporter. The platform indexes donor mobile numbers, names, and past contributions. When a volunteer enters an existing phone number, PavtiBook instantly auto-fills the donor profile.",
      icon: <Users className="w-9 h-9 text-gold-brand" />,
      bullets: [
        "1-second profile auto-fill via 10-digit mobile number",
        "Lifetime contribution records across festival seasons",
        "Categorization for major sponsors and local residents",
        "Clean contact directory export for festival invitations"
      ]
    },
    {
      id: "pending-tracking",
      title: "Pending Collection Tracker",
      marathi: "प्रलंबित वर्गणी व्यवस्थापन",
      desc: "Eliminate collection leakage. When a local business or sponsor promises a donation to be paid later, log it as 'Pending' with a target due date. Send friendly WhatsApp reminder alerts directly from the app.",
      icon: <Clock className="w-9 h-9 text-emerald-600" />,
      bullets: [
        "Record promised amounts with scheduled due dates",
        "Dashboard overview of pending vs. collected totals",
        "1-click WhatsApp friendly reminder alerts",
        "Instant reconciliation upon payment clearance"
      ]
    },
    {
      id: "upi-system",
      title: "Direct P2P UPI Integration",
      marathi: "थेट UPI पेमेंट (Zero Commission)",
      desc: "Eliminate payment gateway deductions. PavtiBook generates instant P2P UPI deep links and dynamic QR codes. When donors scan with GPay, PhonePe, Paytm, or BHIM, funds transfer directly from their bank to your trust bank account with zero platform commission.",
      icon: <Smartphone className="w-9 h-9 text-maroon" />,
      bullets: [
        "100% direct bank-to-bank transfer with 0% commission",
        "Dynamic QR codes pre-filled with the exact donation amount",
        "Works with all major consumer UPI apps across India",
        "Immediate volunteer confirmation on receipt screen"
      ]
    },
    {
      id: "branding",
      title: "Trust Branding & Signatures",
      marathi: "ब्रँडिंग आणि डिजिटल स्वाक्षरी",
      desc: "Add your official trust logo, registration details, and contact information to every receipt. Overlay the treasurer's pre-saved authorized signature to establish field authenticity immediately.",
      icon: <Award className="w-9 h-9 text-orange-brand" />,
      bullets: [
        "Custom trust logo and header uploads",
        "Treasurer and President authorized signature stamps",
        "Custom address and registration details",
        "Personalized footer terms and thank-you notes"
      ]
    },
    {
      id: "backup-restore",
      title: "Cloud Backup & Multi-Device Sync",
      marathi: "डेटा बॅकअप आणि सुरक्षितता",
      desc: "Never lose a single record. PavtiBook automatically backs up receipt records to secure cloud database nodes. Switch or replace phones without losing any donor histories or collection logs.",
      icon: <RefreshCw className="w-9 h-9 text-gold-brand" />,
      bullets: [
        "Continuous automated cloud synchronization",
        "Encrypted database storage",
        "Instant account access on any Android or iOS device",
        "CSV export available 24/7 for annual accounts"
      ]
    },
    {
      id: "security",
      title: "Multi-User Role Permissions",
      marathi: "कार्यकर्ते व्यवस्थापन",
      desc: "Assign distinct mobile logins to volunteers and committee leaders. Committee admins retain full visibility over all collections, while volunteers generate receipts and track their individual daily collection totals.",
      icon: <Lock className="w-9 h-9 text-emerald-600" />,
      bullets: [
        "Separate collector accounts for volunteers",
        "Admin dashboard for presidents and treasurers",
        "Volunteer-wise collection reports",
        "Secure mobile OTP session authentication"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-cream-light font-sans text-neutral-800 flex flex-col justify-between">
      <Header />

      {/* Hero Banner */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-gradient-to-b from-maroon to-[#A32436] text-white relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#FFF6E8_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 relative">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-gold-brand text-xs font-bold uppercase tracking-wider">
            Complete Feature Tour
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-cream-brand">
            The Complete PavtiBook Feature Suite
          </h1>
          <p className="text-xs sm:text-base text-cream-brand/85 max-w-2xl mx-auto font-medium leading-relaxed">
            Discover how PavtiBook blends traditional cultural design with modern digital reliability to simplify Indian festival collections.
          </p>
        </div>
      </section>

      {/* Feature Sections */}
      <main className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {deepFeatures.map((feat, idx) => {
          const isEven = idx % 2 === 0;
          return (
            <div
              key={feat.id}
              id={feat.id}
              className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center border-b border-maroon/10 pb-16 last:border-0 last:pb-0"
            >
              {/* Feature Badge Card */}
              <div className={`lg:col-span-5 ${isEven ? "lg:order-1" : "lg:order-2"} flex justify-center`}>
                <div className="w-full max-w-sm bg-white p-7 sm:p-8 rounded-3xl border border-maroon/10 shadow-sm relative text-center space-y-5">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-cream-brand/60 flex items-center justify-center shadow-xs">
                    {feat.icon}
                  </div>
                  
                  <div>
                    <h4 className="font-extrabold text-neutral-900 text-base sm:text-lg">{feat.title}</h4>
                    <p className="text-xs text-orange-brand font-bold devanagari mt-0.5">{feat.marathi}</p>
                  </div>

                  <ul className="text-left space-y-2.5 pt-2 border-t border-neutral-100">
                    {feat.bullets.map((bullet, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-neutral-700 font-semibold">
                        <span className="h-4 w-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] shrink-0 font-bold mt-0.5">✓</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Description Panel */}
              <div className={`lg:col-span-7 ${isEven ? "lg:order-2" : "lg:order-1"} space-y-4`}>
                <h3 className="text-2xl sm:text-3xl font-black text-maroon-dark leading-tight">
                  {feat.title}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-700 font-medium leading-relaxed">
                  {feat.desc}
                </p>
                <div className="pt-2">
                  <Link
                    href="/request-demo"
                    className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-maroon hover:text-orange-brand transition-colors group"
                  >
                    <span>See live demo of this feature in our walkthrough</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* Final CTA */}
      <section className="py-16 md:py-20 bg-maroon text-white relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-cream-brand leading-tight">
            Ready to See These Features in Action?
          </h2>
          <p className="text-xs sm:text-base text-cream-brand/85 max-w-2xl mx-auto font-medium leading-relaxed">
            Our product specialists can walk you through the custom templates, volunteer logins, and UPI setups live on a 15-minute demo call.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/request-demo"
              className="w-full sm:w-auto bg-orange-brand hover:bg-orange-light text-white font-bold text-xs sm:text-sm px-8 py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group"
            >
              <span>Book Free Demo</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <a
              href={whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-7 py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>Ask Questions on WhatsApp ({displayPhone})</span>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
