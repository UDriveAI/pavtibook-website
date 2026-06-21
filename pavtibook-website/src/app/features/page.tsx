import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Features",
  description: "Explore PavtiBook's powerful features tailored for Indian festival committees, temple trusts, and NGOs. Features custom receipt engines, zero-fee UPI codes, WhatsApp delivery, and cloud donor databases.",
};

export default function FeaturesPage() {
  const deepFeatures = [
    {
      id: "receipt-engine",
      title: "Traditional Receipt Engine",
      marathi: "डिजिटल पावती इंजिन",
      desc: "Preserves the cultural aesthetic of traditional receipt books while digitizing operations. Renders gorgeous double borders, traditional floral designs (marigold vectors), and optional watermarks of deities like Lord Ganesha. Supports Sanskrit Devanagari headers like '॥ श्री गणेश प्रसन्न ॥'. Generates clean, high-resolution PDFs ready for desktop printing or compact JPG formats optimized for instant mobile sharing.",
      icon: <FileText className="w-10 h-10 text-maroon" />,
      bullets: [
        "Select from Cream, Yellow, or Saffron paper tints",
        "Devanagari script support for local languages",
        "Verifiable QR code block automatically appended",
        "Compressed JPG formatting for low-data sharing"
      ]
    },
    {
      id: "audit-trail",
      title: "Tamper-Proof Audit Trail",
      marathi: "सुरक्षित ऑडिट नोंद",
      desc: "Maintains 100% financial transparency. Every single receipt generated records the volunteer collector's unique account ID, timestamp, IP address, and device metadata. Deleting or modifying a recorded receipt requires dual authentication from trust administrators and leaves a clear record, preventing collection discrepancies.",
      icon: <ShieldAlert className="w-10 h-10 text-orange-brand" />,
      bullets: [
        "Tracks volunteer performance in real time",
        "Automated system event log (who created/modified what)",
        "Easy-to-export excel formats for annual general meetings",
        "Anti-tampering receipt verification codes"
      ]
    },
    {
      id: "donor-management",
      title: "Smart Donor Directory",
      marathi: "देणगीदार नोंदणी",
      desc: "Never forget a donor. The platform automatically indexes donor mobile numbers, names, and past contributions into a centralized CRM. When a volunteer enters an existing phone number, PavtiBook instantly populates the donor profile, showing their complete historical support timeline.",
      icon: <Users className="w-10 h-10 text-gold-brand" />,
      bullets: [
        "One-click profile auto-fill via phone number",
        "Donor lifetime value (LTV) and frequency metrics",
        "Separate grouping for VIP donors and corporate sponsors",
        "Seamless address and contact export"
      ]
    },
    {
      id: "pending-tracking",
      title: "Pending Collection Tracker",
      marathi: "प्रलंबित वर्गणी व्यवस्थापन",
      desc: "Stop donation leakage. When a business or donor promises a sponsorship (vargani) to be paid at a later date, log it as 'Pending' with a target date. The dashboard shows upcoming schedules, allowing volunteers to map their collections efficiently.",
      icon: <Clock className="w-10 h-10 text-green-brand" />,
      bullets: [
        "Direct volunteer allocation for promised amounts",
        "Dynamic calendar alerts for due dates",
        "One-click friendly reminder alerts on WhatsApp",
        "Real-time reconciliation upon payment clearance"
      ]
    },
    {
      id: "upi-system",
      title: "Zero-Commission UPI System",
      marathi: "थेट UPI पेमेंट",
      desc: "Bypass high payment gateway fee structures. PavtiBook generates instant peer-to-peer (P2P) UPI deep links and renders dynamic QR codes directly inside the app. When donors scan using BHIM, GPay, PhonePe, or Paytm, the money transfers directly from their bank to your trust's bank with zero commission fees.",
      icon: <Smartphone className="w-10 h-10 text-maroon" />,
      bullets: [
        "100% free - bypass standard 2% gateway commissions",
        "Dynamic QR codes pre-filled with the exact donation amount",
        "Works with all major consumer UPI apps",
        "Immediate volunteer-side simulated success verification"
      ]
    },
    {
      id: "branding",
      title: "Trust Branding & Signatures",
      marathi: "ब्रँडिंग आणि डिजिटल स्वाक्षरी",
      desc: "Establish credibility instantly. Add your official trust logo, registration numbers (such as PAN or 80G tax exemptions), and contact details to every receipt. Volunteers can stamp receipts with a pre-saved digital signature of the treasurer, verifying collections immediately in the field.",
      icon: <Award className="w-10 h-10 text-orange-brand" />,
      bullets: [
        "Custom logo and trust header image uploads",
        "Treasurer/President digital signature overlays",
        "Official government tax registration number listings",
        "Personalized terms and condition footnotes"
      ]
    },
    {
      id: "backup-restore",
      title: "Cloud Backup & Offline Mode",
      marathi: "डेटा बॅकअप आणि ऑफलाइन उपलब्धता",
      desc: "Never lose a single record. PavtiBook operates an offline cache to save receipts locally when network coverage is weak in crowded festival pandals. As soon as the device reconnects to the network, all collections sync securely to cloud databases.",
      icon: <RefreshCw className="w-10 h-10 text-gold-brand" />,
      bullets: [
        "Real-time background sync when connected to internet",
        "Full offline receipt generation support",
        "Military-grade cloud server hosting & database encryption",
        "Instant record recovery on new devices"
      ]
    },
    {
      id: "security",
      title: "Multi-Tenant Security",
      marathi: "सुरक्षितता आणि डेटा गोपनीयता",
      desc: "Rest assured your database is completely private. Utilizing advanced UUID query-level isolation in the database, each organization's data is completely locked. Standard volunteers cannot view core trust settings, and admins control all collection permission gates.",
      icon: <Lock className="w-10 h-10 text-green-brand" />,
      bullets: [
        "Strict database row isolation using unique organization IDs",
        "Role-based access controls (Admins vs. Field Collectors)",
        "Secure JWT session tokens with auto-expire settings",
        "Two-factor OTP authentication for critical actions"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-cream-light font-sans text-neutral-800">
      <Header />

      {/* Hero Banner */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-maroon-dark text-white relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#FFF6E8_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-cream-brand">
            The Complete PavtiBook Feature Suite
          </h1>
          <p className="text-sm md:text-lg text-cream-brand/80 max-w-2xl mx-auto font-medium">
            Discover how we blend traditional trust and cultural designs with advanced multi-tenant SaaS features to digitize Indian donations safely.
          </p>
        </div>
      </section>

      {/* Feature Sections */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
        {deepFeatures.map((feat, idx) => {
          const isEven = idx % 2 === 0;
          return (
            <div
              key={feat.id}
              id={feat.id}
              className={`grid grid-cols-1 lg:grid-cols-12 gap-12 items-center border-b border-maroon/5 pb-16 last:border-0 last:pb-0`}
            >
              {/* Image/Visual Panel */}
              <div className={`lg:col-span-5 ${isEven ? "lg:order-1" : "lg:order-2"} flex justify-center`}>
                <div className="w-full max-w-sm bg-white p-8 rounded-2xl border border-maroon/10 shadow-lg relative overflow-hidden text-center space-y-6">
                  {/* Decorative background grid */}
                  <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#8B1E2D_1px,transparent_1px)] [background-size:12px_12px]"></div>
                  
                  <div className="w-20 h-20 mx-auto rounded-full bg-cream-brand flex items-center justify-center shadow-inner">
                    {feat.icon}
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-bold text-neutral-800 text-lg">{feat.title}</h4>
                    <p className="text-xs text-orange-brand font-semibold devanagari">{feat.marathi}</p>
                  </div>

                  <ul className="text-left space-y-2.5">
                    {feat.bullets.map((bullet, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-neutral-700 font-semibold">
                        <span className="h-4.5 w-4.5 rounded-full bg-green-brand/10 text-green-brand flex items-center justify-center text-[10px] shrink-0 font-bold">✓</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Description Panel */}
              <div className={`lg:col-span-7 ${isEven ? "lg:order-2" : "lg:order-1"} space-y-6`}>
                <h3 className="text-2xl md:text-3xl font-extrabold text-maroon-dark leading-tight">
                  {feat.title}
                </h3>
                <p className="text-sm md:text-base text-neutral-600 font-medium leading-relaxed">
                  {feat.desc}
                </p>
                <div className="pt-2">
                  <a
                    href="/request-demo"
                    className="inline-flex items-center gap-2 text-sm font-bold text-maroon hover:text-orange-brand transition-colors duration-250 group"
                  >
                    <span>See live demo of this feature</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-maroon text-white relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-cream-brand leading-tight">
            Want to see these features in action?
          </h2>
          <p className="text-sm md:text-base text-cream-brand/80 max-w-2xl mx-auto font-medium">
            Our product experts can walk you through the templates, audit dashboards, and UPI configurations live on a Google Meet.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href="/request-demo"
              className="w-full sm:w-auto bg-orange-brand hover:bg-orange-light text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              <span>Book Free Demo</span>
              <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
            </a>
            <a
              href="https://wa.me/919876543210?text=I%20want%20to%20know%20more%20about%20PavtiBook%20features"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-green-brand hover:bg-green-light text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-5 h-5 shrink-0" />
              <span>Ask on WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
