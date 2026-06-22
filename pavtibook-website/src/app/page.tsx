"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { trackWhatsAppClick } from "@/lib/analytics";
import {
  Smartphone,
  CheckCircle,
  XCircle,
  ArrowRight,
  TrendingUp,
  FileText,
  MessageSquare,
  Users,
  Clock,
  ShieldCheck,
  Share2,
  FileDown,
  UserCheck,
  Award,
  RefreshCw,
  Search,
  ChevronDown,
  HelpCircle,
  Download,
  X
} from "lucide-react";

const screenshotTopics = [
  {
    id: "dashboard",
    title: "Mandal Dashboard",
    desc: "Real-time stats of cash vs. UPI collection, donor count, and volunteer collection activity logs.",
    color: "bg-maroon"
  },
  {
    id: "receipt",
    title: "Instant Receipt Creation",
    desc: "Autofills donor profiles by phone number, generates receipt serials, and records payments instantly.",
    color: "bg-orange-brand"
  },
  {
    id: "preview",
    title: "Traditional Receipt Preview",
    desc: "Visualizes custom receipt templates with Ganesha watermarks, double borders, and verification QRs.",
    color: "bg-gold-brand"
  },
  {
    id: "donors",
    title: "Donor Directory",
    desc: "Search, filter, and track historical contributions of every community supporter in your dashboard.",
    color: "bg-green-brand"
  },
  {
    id: "pending",
    title: "Pending Collection Tracking",
    desc: "Track promised donations (vargani) and directly send friendly follow-up reminders on WhatsApp.",
    color: "bg-maroon-dark"
  },
  {
    id: "reports",
    title: "Audit & CSV Export",
    desc: "Generate professional financial reports with one-click export for committee audit reviews.",
    color: "bg-orange-brand"
  }
];

function renderScreenContent(id: string) {
  switch (id) {
    case "dashboard":
      return (
        <div className="space-y-3 pt-1 text-[8px] animate-in fade-in duration-300">
          <div className="bg-white p-2.5 rounded-xl border border-maroon/10 shadow-sm text-center">
            <p className="text-[8px] font-bold text-neutral-505 uppercase tracking-wide">Today&apos;s Collection</p>
            <h4 className="text-xl font-black text-maroon">₹ 1,50,005</h4>
            <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-neutral-100 text-[8px] text-neutral-600">
              <div>Cash: <span className="font-bold">₹50k</span></div>
              <div>UPI: <span className="font-bold text-green-brand">₹100k</span></div>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-maroon/10 shadow-sm">
            <div className="flex justify-between items-center text-[8px] font-bold text-neutral-500 mb-1">
              <span>TOTAL STATS</span>
              <span className="text-orange-brand">JUNE 2026</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-center">
              <div className="bg-cream-brand/50 p-1.5 rounded-lg">
                <p className="text-[7px] text-neutral-600">Total Donors</p>
                <p className="text-xs font-bold text-neutral-850">856</p>
              </div>
              <div className="bg-cream-brand/50 p-1.5 rounded-lg">
                <p className="text-[7px] text-neutral-600">Total Receipts</p>
                <p className="text-xs font-bold text-neutral-850">1,245</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-2 rounded-xl border border-maroon/10 shadow-sm space-y-1">
            <p className="font-bold text-neutral-500 uppercase tracking-wide">Recent Collections</p>
            {[
              { name: "Rahul Patil", amount: "₹ 1,000" },
              { name: "Sneha Joshi", amount: "₹ 1,000" },
              { name: "Amit Sharma", amount: "₹ 1,000" }
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-0.5 border-b border-neutral-50 last:border-0">
                <span className="font-semibold text-neutral-800">{item.name}</span>
                <span className="font-bold text-green-brand">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "receipt":
      return (
        <div className="space-y-2 pt-1 text-[8px] animate-in fade-in duration-300">
          <h4 className="font-bold text-maroon text-[9px]">Create New Receipt</h4>
          <div className="space-y-1">
            <label className="text-[7px] font-bold text-neutral-705">DONOR MOBILE</label>
            <input type="text" value="98234 56789" disabled className="w-full bg-white border border-neutral-300 rounded p-1 text-[8px] outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[7px] font-bold text-neutral-705">DONOR NAME</label>
            <input type="text" value="Shri. Ramesh Patil" disabled className="w-full bg-white border border-neutral-300 rounded p-1 text-[8px] outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[7px] font-bold text-neutral-705">AMOUNT (₹)</label>
            <input type="text" value="501" disabled className="w-full bg-white border border-neutral-300 rounded p-1 text-[8px] font-bold text-maroon outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[7px] font-bold text-neutral-705">PURPOSE</label>
            <input type="text" value="Ganpati Vargani" disabled className="w-full bg-white border border-neutral-300 rounded p-1 text-[8px] outline-none" />
          </div>
          <button className="w-full bg-orange-brand text-white font-bold py-1.5 rounded shadow-sm mt-1">
            GENERATE & SHARE
          </button>
        </div>
      );
    case "preview":
      return (
        <div className="pt-0.5 text-[6px] leading-tight animate-in fade-in duration-300">
          <div className="bg-[#FFFDF9] traditional-border p-2 shadow-md relative text-neutral-800">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] border border-dashed border-green-brand text-green-brand font-black text-[8px] px-1 py-0.5 uppercase tracking-wide pointer-events-none select-none z-10 devanagari">
              बुक झाले / PAID
            </div>
            <div className="text-center text-[5px] font-bold text-maroon devanagari">
              ॥ श्री गणेश प्रसन्न ॥
            </div>
            <div className="text-center font-bold text-maroon text-[7px] tracking-tight mt-0.5">
              LALBAUGCHA RAJA GANESH UTSAV
            </div>
            <hr className="border-maroon/20 my-1" />
            <div className="flex justify-between font-bold text-neutral-700 mb-0.5">
              <span>No: PB-2026-000005</span>
              <span>Date: 11/06/2026</span>
            </div>
            <div className="space-y-0.5 text-neutral-600 font-medium">
              <div>Received with thanks from:</div>
              <div className="font-bold text-neutral-850 border-b border-dashed border-neutral-350 pb-0.5">
                Shri. Ramesh Patil
              </div>
              <div>The sum of Rupees:</div>
              <div className="font-bold text-neutral-850 border-b border-dashed border-neutral-350 pb-0.5">
                Five Hundred One Only
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <div>For: <span className="font-bold text-neutral-850">Ganpati Vargani</span></div>
                <div>By: <span className="font-bold text-neutral-850">UPI</span></div>
              </div>
            </div>
            <div className="flex justify-between items-end mt-2 pt-0.5">
              <div className="bg-maroon/10 border border-maroon text-maroon px-1.5 py-0.5 font-bold text-[8px] rounded">
                ₹ 501/-
              </div>
              <div className="w-6 h-6 border border-neutral-450 p-0.5 flex items-center justify-center bg-white rounded">
                <svg className="w-full h-full text-neutral-900" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 2h6v6H2V2zm1 1v4h4V3H3zm11-1h6v6h-6V2zm1 1v4h4V3h-4zM2 14h6v6H2v-6zm1 1v4h4v-4H3zm13-1h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm-2-2h2v2h-2v-2zm0-2h2v2h-2v-2zm4-2h2v2h-2V8zm-2 2h2v2h-2v-2z" />
                </svg>
              </div>
              <div className="text-right text-[4px] text-neutral-500 italic">
                <div className="font-bold text-neutral-850">Treasurer</div>
                <span>Authorised Signatory</span>
              </div>
            </div>
          </div>
        </div>
      );
    case "donors":
      return (
        <div className="space-y-2 pt-1 text-[8px] animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-neutral-800">Donor Database</h4>
            <span className="text-neutral-400 text-[6px]">856 Donors</span>
          </div>
          <div className="bg-white p-1 rounded border border-neutral-200 flex items-center justify-between text-[7px] mb-1">
            <span className="text-neutral-400">Search Donors...</span>
            <Search className="w-2.5 h-2.5 text-neutral-400" />
          </div>
          <div className="space-y-1">
            {[
              { n: "Kiran R. Deshmukh", p: "+91 98332 11223", a: "₹5,000" },
              { n: "Rajesh S. Thorat", p: "+91 98455 66778", a: "₹2,500" },
              { n: "Anjali M. Kadam", p: "+91 97665 44332", a: "₹1,001" }
            ].map((item, i) => (
              <div key={i} className="bg-white p-1.5 rounded border border-neutral-100 flex justify-between items-center">
                <div>
                  <p className="font-bold text-neutral-800">{item.n}</p>
                  <p className="text-[6px] text-neutral-505 font-semibold">{item.p}</p>
                </div>
                <span className="font-bold text-green-brand">{item.a}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "pending":
      return (
        <div className="space-y-2 pt-1 text-[8px] animate-in fade-in duration-300">
          <h4 className="font-bold text-neutral-800">Pending Promises</h4>
          <div className="space-y-1.5">
            {[
              { n: "Vikas More", a: "₹ 5,000", d: "Due 15 June" },
              { n: "Santosh G.", a: "₹ 2,000", d: "Due 18 June" }
            ].map((item, i) => (
              <div key={i} className="bg-white p-1.5 rounded border border-neutral-200 flex justify-between items-center shadow-sm">
                <div>
                  <p className="font-bold text-neutral-800">{item.n}</p>
                  <p className="text-[6px] text-neutral-400 font-semibold">{item.d}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-brand">{item.a}</p>
                  <span className="bg-orange-brand/10 text-orange-brand px-1 py-0.5 rounded text-[5px] font-bold cursor-pointer">Remind</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case "reports":
      return (
        <div className="space-y-2 pt-1 text-[8px] text-center animate-in fade-in duration-300">
          <h4 className="font-bold text-neutral-800 text-left">Generate Reports</h4>
          <div className="bg-white p-2.5 rounded border border-neutral-200 space-y-1.5">
            <p className="text-neutral-500 text-[6px]">Select date range to download financial statements.</p>
            <div className="flex gap-1 justify-center">
              <span className="bg-neutral-100 p-0.5 rounded font-semibold text-[5px]">1 June 2026</span>
              <span className="bg-neutral-100 p-0.5 rounded font-semibold text-[5px]">21 June 2026</span>
            </div>
            <button className="bg-maroon text-white font-bold px-2 py-1 rounded text-[6px] w-full flex items-center justify-center gap-0.5">
              <FileDown className="w-2.5 h-2.5" />
              <span>Export PDF & CSV</span>
            </button>
          </div>
        </div>
      );
    default:
      return null;
  }
}

export default function Home() {
  return <HomePageContent />;
}

function HomePageContent() {
  // Mockup Interactive States
  const [activeScreen, setActiveScreen] = useState("receipt");
  
  // Carousel States
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Auto transition carousel every 5s
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % screenshotTopics.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const faqs = [
    {
      q: "What is PavtiBook and who is it for?",
      a: "PavtiBook is a digital collection management platform specifically designed for Indian festival committees (Ganesh/Navratri Mandals), Temple Trusts, NGOs, and Housing Societies. It replaces physical paper receipts with secure, instant digital receipts that can be shared on WhatsApp."
    },
    {
      q: "Can we share receipts on WhatsApp with donor details?",
      a: "Yes! Once you record a donation, PavtiBook automatically generates a PDF receipt and triggers a WhatsApp share dialogue so the receipt is sent directly to the donor's WhatsApp number in seconds."
    },
    {
      q: "Is donor data secure and private?",
      a: "Absolutely. All donor and financial records are encrypted and stored in secure cloud systems. Each organization has fully isolated data boundaries using UUID level row isolation, meaning only authorized committee members can access your database."
    },
    {
      q: "Can multiple committee members collect collections concurrently?",
      a: "Yes. PavtiBook supports multiple logins. You can set up admin accounts for treasurers/presidents and separate collector accounts for volunteers, allowing everyone to gather collections simultaneously while tracking who collected what."
    },
    {
      q: "Can we customize the receipts with our Mandal's logo and deity?",
      a: "Yes. The app includes a Template Customizer where you can select card themes (Cream, Yellow, Saffron), floral marigold border presets, local Devanagari titles (॥ श्री गणेश प्रसन्न ॥), and upload your authorized signs."
    },
    {
      q: "Can we track pending collections (Vargani)?",
      a: "Yes, you can record promised donations as 'Pending' with the target date, view them on a dedicated dashboard, and send polite follow-up reminders directly to the donor."
    }
  ];

  // Who uses PavtiBook list
  const userSegments = [
    {
      title: "Ganesh Mandals",
      marathi: "गणेश मंडळ",
      desc: "Manage high-volume vargani collection during Ganeshotsav with volunteers tracking cash & UPI.",
      icon: "🌺"
    },
    {
      title: "Temple Trusts",
      marathi: "मंदिर ट्रस्ट",
      desc: "Record daily temple donations, issue customized receipts, and manage trusted donor history.",
      icon: "🛕"
    },
    {
      title: "Housing Societies",
      marathi: "गृहनिर्माण संस्था",
      desc: "Track monthly maintenance receipts, festival collections, and audit trails for AGM reports.",
      icon: "🏢"
    },
    {
      title: "NGOs & Trusts",
      marathi: "सामाजिक संस्था",
      desc: "Organize fundraising drives, issue transparent digital receipts, and track tax-exempt donation histories.",
      icon: "🤝"
    },
    {
      title: "Festival Committees",
      marathi: "उत्सव समिती",
      desc: "Digitize Navratri, Shiv Jayanti, or Dahi Handi collections. Real-time dashboards keep all organizers aligned.",
      icon: "🥁"
    },
    {
      title: "Community Groups",
      marathi: "स्थानिक मंडळ",
      desc: "Track sports tournaments, community halls, or cultural event entry fees and digital receipt logs.",
      icon: "👥"
    }
  ];

  return (
    <div className="min-h-screen bg-cream-light font-sans text-neutral-800">
      <Header />

      {/* SECTION 1 - HERO */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden bg-gradient-to-b from-cream-brand via-cream-light to-white">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#8B1E2D_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        {/* Background Accent Graphics */}
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-orange-brand/10 blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full bg-gold-brand/20 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-10 w-80 h-80 rounded-full bg-gold-brand/10 blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-maroon/10 border border-gold-brand/35 text-maroon text-xs sm:text-sm font-semibold tracking-wide">
                <span className="flex h-2 w-2 rounded-full bg-orange-brand animate-pulse"></span>
                <span>Digitizing Indian Collections</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-[3.5rem] lg:text-[3.75rem] font-black text-maroon-dark tracking-tight leading-[1.15]">
                Digitize Your <br />
                <span className="text-orange-brand">Mandal & Trust</span> Collections
              </h1>
              
              <p className="text-base sm:text-lg md:text-xl text-neutral-700 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Generate receipts, track donors, manage pending collections, and instantly send professional receipts on WhatsApp.
              </p>

              {/* Marathi Accent Tagline */}
              <div className="bg-cream-brand/90 border-l-4 border-gold-brand p-4 rounded-r-xl max-w-xl mx-auto lg:mx-0 shadow-md border border-maroon/5">
                <p className="text-lg md:text-xl font-bold text-maroon-dark devanagari italic leading-snug">
                  &quot;वर्गणी घेतल्याबरोबर पावती थेट देणगीदाराच्या WhatsApp वर.&quot;
                </p>
                <p className="text-xs text-neutral-600 mt-1 font-semibold">
                  Traditional Trust. Digital Simplicity.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5 pt-4">
                <a
                  href="/request-demo"
                  className="w-full sm:w-auto text-center bg-maroon hover:bg-maroon-light text-white text-base font-bold px-8 py-4.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-250 flex items-center justify-center gap-2 group hover:scale-[1.03] active:scale-[0.98]"
                >
                  <span>Request Free Demo</span>
                  <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                </a>
                <a
                  href="/download"
                  className="w-full sm:w-auto text-center bg-transparent border-2 border-maroon hover:bg-maroon/5 text-maroon text-base font-bold px-8 py-4 rounded-xl transition-all duration-250 flex items-center justify-center gap-2 hover:scale-[1.03] active:scale-[0.98]"
                >
                  <Download className="w-5 h-5" />
                  <span>Download App</span>
                </a>
              </div>

              {/* Trust badge */}
              <div className="pt-6 flex items-center justify-center lg:justify-start gap-6 text-neutral-655 font-semibold">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-green-brand" />
                  <span className="text-xs font-bold uppercase tracking-wider">KYC Verified Trusts Only</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Award className="w-5 h-5 text-gold-brand" />
                  <span className="text-xs font-bold uppercase tracking-wider">Trusted by 1,800+ Committees</span>
                </div>
              </div>
            </div>

            {/* Right Interactive Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[340px] aspect-[9/19.5] bg-neutral-900 rounded-[50px] p-3 shadow-2xl border-4 border-neutral-800">
                {/* Phone Speaker/Camera Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-32 bg-neutral-900 rounded-b-2xl z-20 flex items-center justify-center">
                  <div className="w-12 h-1 bg-neutral-800 rounded-full"></div>
                </div>

                {/* Inner Screen */}
                <div className="relative w-full h-full bg-cream-light rounded-[40px] overflow-hidden flex flex-col z-10 border border-neutral-700">
                  
                  {/* App Header Status Bar */}
                  <div className="bg-maroon text-white pt-6 pb-2.5 px-4 flex justify-between items-center text-xs font-semibold">
                    <span className="text-[10px] text-cream-brand/80">PavtiBook</span>
                    <span className="text-[10px] text-gold-brand">॥ श्री गणेश प्रसन्न ॥</span>
                  </div>

                  {/* Dynamic Screen Content */}
                  <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 space-y-4">
                    
                    {activeScreen === "login" && (
                      <div className="space-y-4 pt-4 animate-in fade-in duration-300">
                        <div className="text-center space-y-2">
                          <Image src="/images/Pavati-Book-LogoIcon.png" alt="Icon" width={56} height={56} className="h-14 w-auto mx-auto object-contain" />
                          <h3 className="font-bold text-lg text-maroon">Welcome Back!</h3>
                          <p className="text-xs text-neutral-600">Login to your Mandal Account</p>
                        </div>
                        <div className="space-y-2.5 pt-2">
                          <label className="block text-[10px] font-bold text-neutral-700">MOBILE NUMBER</label>
                          <div className="flex bg-white border border-neutral-300 rounded-lg p-2 text-xs">
                            <span className="text-neutral-500 mr-1.5">+91</span>
                            <input type="text" value="98765 43210" disabled className="bg-transparent outline-none w-full" />
                          </div>
                        </div>
                        <button className="w-full bg-maroon text-white font-bold text-xs py-2.5 rounded-lg shadow-md">
                          SEND OTP
                        </button>
                        <p className="text-[9px] text-center text-neutral-500 font-medium">
                          Simulating SMS gateway log
                        </p>
                      </div>
                    )}

                    {activeScreen === "dashboard" && (
                      <div className="space-y-3 pt-1 animate-in fade-in duration-300">
                        <div className="bg-white p-3 rounded-xl border border-maroon/10 shadow-sm text-center">
                          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">Today&apos;s Collection</p>
                          <h4 className="text-2xl font-black text-maroon">₹ 1,50,005</h4>
                          <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-neutral-100 text-[10px] text-neutral-600">
                            <div>Cash: <span className="font-bold">₹50k</span></div>
                            <div>UPI: <span className="font-bold text-green-brand">₹100k</span></div>
                          </div>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-maroon/10 shadow-sm">
                          <div className="flex justify-between items-center text-[10px] font-bold text-neutral-500 mb-1.5">
                            <span>TOTAL STATS</span>
                            <span className="text-orange-brand">JUNE 2026</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="bg-cream-brand/50 p-2 rounded-lg">
                              <p className="text-[9px] text-neutral-600">Total Donors</p>
                              <p className="text-sm font-bold text-neutral-800">856</p>
                            </div>
                            <div className="bg-cream-brand/50 p-2 rounded-lg">
                              <p className="text-[9px] text-neutral-600">Total Receipts</p>
                              <p className="text-sm font-bold text-neutral-800">1,245</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-maroon/10 shadow-sm space-y-1.5">
                          <p className="text-[9px] font-bold text-neutral-500">RECENT COLLECTIONS</p>
                          {[
                            { name: "Rahul Patil", amount: "₹ 1,000" },
                            { name: "Sneha Joshi", amount: "₹ 1,000" },
                            { name: "Amit Sharma", amount: "₹ 1,000" }
                          ].map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] py-1 border-b border-neutral-50 last:border-0">
                              <span className="font-semibold text-neutral-800">{item.name}</span>
                              <span className="font-bold text-green-brand">{item.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeScreen === "create" && (
                      <div className="space-y-2.5 pt-1 animate-in fade-in duration-300">
                        <h4 className="font-bold text-xs text-maroon">Create New Receipt</h4>
                        
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-neutral-700">DONOR MOBILE</label>
                          <input type="text" value="98234 56789" disabled className="w-full bg-white border border-neutral-300 rounded p-1.5 text-xs outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-neutral-700">DONOR NAME</label>
                          <input type="text" value="Shri. Ramesh Patil" disabled className="w-full bg-white border border-neutral-300 rounded p-1.5 text-xs outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-neutral-700">AMOUNT (₹)</label>
                          <input type="text" value="501" disabled className="w-full bg-white border border-neutral-300 rounded p-1.5 text-xs font-bold text-maroon outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-neutral-700">PURPOSE</label>
                          <input type="text" value="Ganpati Vargani" disabled className="w-full bg-white border border-neutral-300 rounded p-1.5 text-xs outline-none" />
                        </div>
                        <button className="w-full bg-orange-brand text-white font-bold text-[10px] py-2 rounded shadow-md mt-2">
                          GENERATE & SHARE
                        </button>
                      </div>
                    )}

                    {activeScreen === "receipt" && (
                      <div className="pt-0.5 animate-in fade-in duration-300">
                        {/* Traditional Receipt Mapped to guidelines */}
                        <div className="bg-[#FFFDF9] traditional-border p-2.5 shadow-md relative text-neutral-800 text-[8px] leading-tight">
                          {/* Deity line */}
                          <div className="text-center text-[7px] font-bold text-maroon devanagari">
                            ॥ श्री गणेश प्रसन्न ॥
                          </div>
                          
                          {/* Org header */}
                          <div className="text-center font-bold text-maroon text-[9px] tracking-tight mt-1">
                            LALBAUGCHA RAJA GANESH UTSAV
                          </div>
                          
                          <hr className="border-maroon/20 my-1.5" />

                          {/* Rec details */}
                          <div className="flex justify-between font-bold text-neutral-700 mb-1">
                            <span>No: PB-2026-000005</span>
                            <span>Date: 11/06/2026</span>
                          </div>

                          <div className="space-y-1 text-neutral-600">
                            <div>Received with thanks from:</div>
                            <div className="font-bold text-neutral-800 border-b border-dashed border-neutral-400 pb-0.5">
                              Shri. Ramesh Patil
                            </div>
                            
                            <div>The sum of Rupees:</div>
                            <div className="font-bold text-neutral-800 border-b border-dashed border-neutral-400 pb-0.5">
                              Five Hundred One Only
                            </div>
                            
                            <div className="flex justify-between items-center pt-1">
                              <div>For: <span className="font-bold text-neutral-800">Ganpati Vargani</span></div>
                              <div>By: <span className="font-bold text-neutral-800">UPI</span></div>
                            </div>
                          </div>

                          {/* Bottom Row */}
                          <div className="flex justify-between items-end mt-3 pt-1">
                            <div className="bg-maroon/10 border border-maroon text-maroon px-2 py-1 font-bold text-xs rounded">
                              ₹ 501/-
                            </div>
                            
                            {/* QR Block */}
                            <div className="w-8 h-8 border border-neutral-400 p-0.5 flex items-center justify-center bg-white rounded">
                              <svg className="w-full h-full text-neutral-900" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2 2h6v6H2V2zm1 1v4h4V3H3zm11-1h6v6h-6V2zm1 1v4h4V3h-4zM2 14h6v6H2v-6zm1 1v4h4v-4H3zm13-1h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm-2-2h2v2h-2v-2zm0-2h2v2h-2v-2zm4-2h2v2h-2V8zm-2 2h2v2h-2v-2z" />
                              </svg>
                            </div>
                            
                            <div className="text-right text-[6px] text-neutral-500 italic">
                              <div className="font-bold text-neutral-800">Treasurer</div>
                              <span>Authorised Signatory</span>
                            </div>
                          </div>
                        </div>

                        {/* WhatsApp Delivery Action */}
                        <div className="mt-3 bg-green-brand/10 border border-green-brand/20 p-2 rounded-lg flex items-center gap-2">
                          <div className="bg-green-brand text-white p-1 rounded-full">
                            <Share2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[9px] font-bold text-green-brand">Receipt Sent to WhatsApp!</p>
                            <p className="text-[7px] text-neutral-500">Delivered dynamically to donor</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* App Bottom Navigation Bar */}
                  <div className="bg-white border-t border-neutral-200 py-2.5 px-4 flex justify-between items-center text-[9px] font-bold text-neutral-600">
                    <button onClick={() => setActiveScreen("login")} className={`flex flex-col items-center ${activeScreen === "login" ? "text-maroon" : ""}`}>
                      <UserCheck className="w-4 h-4" />
                      <span>Login</span>
                    </button>
                    <button onClick={() => setActiveScreen("dashboard")} className={`flex flex-col items-center ${activeScreen === "dashboard" ? "text-maroon" : ""}`}>
                      <TrendingUp className="w-4 h-4" />
                      <span>Stats</span>
                    </button>
                    <button onClick={() => setActiveScreen("create")} className={`flex flex-col items-center ${activeScreen === "create" ? "text-maroon" : ""}`}>
                      <FileText className="w-4 h-4" />
                      <span>Receipt</span>
                    </button>
                    <button onClick={() => setActiveScreen("receipt")} className={`flex flex-col items-center ${activeScreen === "receipt" ? "text-maroon" : ""}`}>
                      <Award className="w-4 h-4" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>

                {/* Phone Home Indicator Bar */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 h-1 bg-neutral-800 rounded-full"></div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* SECTION 2 – PROBLEMS WE SOLVE */}
      <section className="py-20 bg-cream-brand/35 border-y border-maroon/5 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-maroon-dark tracking-tight">
              Before & After PavtiBook
            </h2>
            <p className="text-sm md:text-base font-semibold text-neutral-600 uppercase tracking-wider">
              Traditional Collection Problems solved with modern reliability
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            
            {/* The Messy Traditional Way */}
            <div className="bg-white p-8 rounded-2xl border-2 border-red-100 shadow-md space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-3xl flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <span>The Paper Receipt Struggle</span>
              </h3>
              
              <ul className="space-y-4">
                {[
                  { t: "Lost & Damaged Receipts", d: "Paper books get wet in monsoon pandals or misplaced during hectic festival days." },
                  { t: "Messy Account Reconciliation", d: "Manually counting pages at night. High errors in balancing cash collected by different volunteers." },
                  { t: "Forgotten Donor Details", d: "Donors' telephone numbers or addresses written illegibly, meaning databases are lost forever." },
                  { t: "No Way to Track Promises", d: "Sponsors who promised donations (pending vargani) are forgotten, resulting in collection leaks." },
                  { t: "Suspicions of Leakage", d: "Difficult to audit, raising transparency questions among general committee members and donors." }
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="h-5 w-5 rounded-full bg-red-100 text-red-600 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">✕</span>
                    <div>
                      <h4 className="font-bold text-neutral-800 text-sm">{item.t}</h4>
                      <p className="text-xs text-neutral-600 mt-0.5">{item.d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* The PavtiBook Way */}
            <div className="bg-white p-8 rounded-2xl border-2 border-green-brand/20 shadow-lg space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-green-brand/10 rounded-bl-3xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-brand" />
              </div>
              <h3 className="text-xl font-bold text-green-brand flex items-center gap-2">
                <span>The PavtiBook Advantage</span>
              </h3>
              
              <ul className="space-y-4">
                {[
                  { t: "Instant WhatsApp Delivery", d: "Receipts are formatted beautifully in local languages and shared instantly on the donor's WhatsApp." },
                  { t: "Secure Digital Backups", d: "Cloud storage ensures files are completely protected, printable, and downloadable forever." },
                  { t: "Automated Donor Directory", d: "Automatically registers donor names, historical collection sizes, and mobile numbers for next year." },
                  { t: "Strict Pending Tracker", d: "Set reminders for promised donations. Volunteers can see pending collection schedules on their dashboard." },
                  { t: "Transparent Audit Trails", d: "Every single receipt has a unique QR verification code. Every entry tracks which volunteer accepted the money." }
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="h-5 w-5 rounded-full bg-green-brand/10 text-green-brand font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">✓</span>
                    <div>
                      <h4 className="font-bold text-neutral-800 text-sm">{item.t}</h4>
                      <p className="text-xs text-neutral-600 mt-0.5">{item.d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 3 – HOW IT WORKS */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-maroon-dark tracking-tight">
              Simple 4-Step Flow
            </h2>
            <p className="text-sm md:text-base font-semibold text-neutral-600 uppercase tracking-wider">
              How volunteers manage digital collections in the field
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Connector Line for Desktop */}
            <div className="hidden md:block absolute top-1/2 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-orange-brand via-gold-brand to-green-brand -translate-y-12 z-0"></div>

            {[
              {
                step: "01",
                title: "Create Receipt",
                desc: "Volunteer enters donor mobile, name, and vargani amount. Previous donor profiles auto-fill in 1 second.",
                color: "bg-maroon text-white",
                icon: <FileText className="w-6 h-6 text-gold-brand" />
              },
              {
                step: "02",
                title: "Collect Payment",
                desc: "Collect cash or display a dynamic UPI QR code. The donor scans with GPay/PhonePe to pay directly to trust's bank.",
                color: "bg-orange-brand text-white",
                icon: <Smartphone className="w-6 h-6 text-cream-brand" />
              },
              {
                step: "03",
                title: "Generate PDF/JPG",
                desc: "System instantly constructs a traditional receipt layout with borders, religious symbols, and an audit QR code.",
                color: "bg-gold-brand text-neutral-900",
                icon: <FileDown className="w-6 h-6 text-maroon" />
              },
              {
                step: "04",
                title: "WhatsApp Delivery",
                desc: "PavtiBook immediately prompts the volunteer to share. The PDF receipt sends to the donor's WhatsApp with one tap.",
                color: "bg-green-brand text-white",
                icon: <MessageSquare className="w-6 h-6 text-cream-brand" />
              }
            ].map((item, idx) => (
              <div key={idx} className="relative bg-cream-brand/35 p-6 rounded-2xl border border-maroon/5 shadow-sm text-center space-y-4 hover:shadow-md transition-shadow duration-200 z-10">
                <div className="flex justify-between items-center">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${item.color}`}>
                    {item.step}
                  </span>
                  <div className="p-2 rounded-xl bg-white shadow-sm border border-neutral-100">
                    {item.icon}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-maroon-dark">{item.title}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO VIDEO SECTION */}
      <section className="py-20 bg-cream-brand/35 border-b border-maroon/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl md:text-4xl font-extrabold text-maroon-dark tracking-tight">
              See PavtiBook In Action
            </h2>
            <p className="text-sm md:text-base font-semibold text-neutral-600 uppercase tracking-wider">
              Watch how Mandals and Trusts can generate receipts and send them instantly on WhatsApp.
            </p>
          </div>

          {/* Fallback Display */}
          <div className="bg-white p-8 rounded-3xl border border-maroon/10 shadow-lg max-w-2xl mx-auto relative overflow-hidden flex flex-col justify-center items-center gap-6 min-h-[300px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-brand/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-gold-brand/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="w-16 h-16 rounded-full bg-maroon/10 flex items-center justify-center text-maroon shadow-inner animate-pulse shrink-0">
              <svg className="w-8 h-8 fill-current translate-x-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-extrabold text-xl text-neutral-850">2 Minute Product Walkthrough</h3>
                <p className="text-xs text-orange-brand font-bold uppercase tracking-wider mt-0.5">Demo Video Coming Soon</p>
              </div>

              <div className="max-w-md mx-auto text-left bg-cream-brand/20 p-4 rounded-xl border border-maroon/5 space-y-2 text-xs sm:text-sm text-neutral-700 font-semibold">
                <p className="text-neutral-500 font-bold mb-1">See how PavtiBook helps Mandals and Trusts:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5">• Generate Digital Receipts</div>
                  <div className="flex items-center gap-1.5">• Track Donors</div>
                  <div className="flex items-center gap-1.5">• Manage Pending Collections</div>
                  <div className="flex items-center gap-1.5">• Send Receipts on WhatsApp</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
              <a
                href="/request-demo"
                className="w-full sm:w-auto bg-maroon hover:bg-maroon-light text-white font-bold text-xs px-6 py-3 rounded-lg shadow transition-colors duration-200 text-center"
              >
                Request Demo
              </a>
              <button
                onClick={() => {
                  const element = document.getElementById("screenshots");
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="w-full sm:w-auto bg-transparent border border-maroon/20 hover:bg-maroon/5 text-maroon font-bold text-xs px-6 py-3 rounded-lg transition-colors duration-200 cursor-pointer"
              >
                Watch Screenshots
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 – FEATURES */}
      <section className="py-20 bg-cream-brand/20 border-y border-maroon/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-maroon-dark tracking-tight">
              Powerful Features For High-Trust Committees
            </h2>
            <p className="text-sm md:text-base font-semibold text-neutral-600 uppercase tracking-wider">
              Engineered for absolute speed, reliability, and security
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                t: "Digital Receipts",
                d: "Traditional double borders, Sanskrit/Devanagari header options, and custom deity watermark styles.",
                i: <FileText className="w-6 h-6 text-maroon" />
              },
              {
                t: "WhatsApp Sharing",
                d: "Instantly sends receipt PDFs directly to donor accounts. Reduces paper costs to absolute zero.",
                i: <Share2 className="w-6 h-6 text-orange-brand" />
              },
              {
                t: "Donor Database",
                d: "Centralized list saves names, phone numbers, and past contributions. Exports to Excel/CSV with one click.",
                i: <Users className="w-6 h-6 text-gold-brand" />
              },
              {
                t: "Pending Collections",
                d: "Track promised donations, log target dates, and dispatch polite follow-up reminders in one click.",
                i: <Clock className="w-6 h-6 text-green-brand" />
              },
              {
                t: "Dashboard Analytics",
                d: "Real-time volunteer lists, total cash split vs. UPI collections, and hourly activity graphs.",
                i: <TrendingUp className="w-6 h-6 text-maroon" />
              },
              {
                t: "Zero-Fee UPI Support",
                d: "Generate P2P UPI QR codes. Funds land directly in the trust's bank account with zero gateway commissions.",
                i: <Smartphone className="w-6 h-6 text-orange-brand" />
              },
              {
                t: "PDF & JPG Exports",
                d: "Download receipts in high-quality PDF formats for printing, or compact JPG sizes for quick message shares.",
                i: <FileDown className="w-6 h-6 text-gold-brand" />
              },
              {
                t: "Secure Audit Trail",
                d: "Every transaction captures logs of the volunteer ID, timestamp, and device info. Tamper-proof tracking.",
                i: <ShieldCheck className="w-6 h-6 text-green-brand" />
              },
              {
                t: "Multi-User Access",
                d: "Give separate, restricted login rights to different neighborhood collectors, while admins track from central office.",
                i: <Users className="w-6 h-6 text-maroon" />
              },
              {
                t: "Branding & Signatures",
                d: "Upload trust logo, insert registration PAN details, and overlay treasurer's authorized digital signature.",
                i: <Award className="w-6 h-6 text-orange-brand" />
              },
              {
                t: "Cloud Backup & Restore",
                d: "Never lose records. Automatically backs up data to secure cloud nodes. Access from any device.",
                i: <RefreshCw className="w-6 h-6 text-gold-brand" />
              },
              {
                t: "Verification QRs",
                d: "Every receipt has a verifiable QR code. Donors can scan the code to inspect receipt details on pavtibook.online.",
                i: <Search className="w-6 h-6 text-green-brand" />
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-maroon/10 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-cream-brand/50 flex items-center justify-center">
                  {item.i}
                </div>
                <h3 className="text-lg font-bold text-maroon-dark">{item.t}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed font-medium">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 – APP SCREENSHOTS GALLERY */}
      <section id="screenshots" className="py-20 bg-white overflow-hidden scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Carousel Controls / Info */}
            <div className="lg:col-span-5 space-y-6">
              <h2 className="text-3xl md:text-4xl font-extrabold text-maroon-dark tracking-tight">
                Inspect the App Interfaces
              </h2>
              <p className="text-base text-neutral-600 font-medium leading-relaxed">
                PavtiBook is optimized to load instantly even under poor network conditions. Click any screen mockup to inspect it in detail.
              </p>
              
              <div className="space-y-3">
                {screenshotTopics.map((topic, index) => (
                  <button
                    key={topic.id}
                    onClick={() => setCarouselIndex(index)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between ${
                      carouselIndex === index
                        ? "bg-maroon/5 border-maroon shadow-sm"
                        : "bg-white border-neutral-200 hover:border-maroon/30"
                    }`}
                  >
                    <div>
                      <h4 className={`text-sm font-bold ${carouselIndex === index ? "text-maroon" : "text-neutral-800"}`}>
                        {topic.title}
                      </h4>
                      <p className="text-[11px] text-neutral-500 font-semibold mt-0.5">{topic.desc}</p>
                    </div>
                    {carouselIndex === index && <span className="h-2 w-2 rounded-full bg-maroon"></span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Carousel Mockups */}
            <div className="lg:col-span-7 flex flex-col items-center gap-6">
              <div 
                onClick={() => {
                  setLightboxIndex(carouselIndex);
                  setLightboxOpen(true);
                }}
                className="relative w-full max-w-[280px] aspect-[9/19] bg-neutral-900 rounded-[45px] p-2.5 shadow-2xl border-4 border-neutral-805 cursor-zoom-in hover:scale-102 transition-all duration-300 group"
              >
                {/* Camera Notch */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-neutral-900 rounded-full z-20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-800 ml-auto mr-3"></div>
                </div>

                <div className="relative w-full h-full bg-cream-brand/20 rounded-[38px] overflow-hidden flex flex-col border border-neutral-700">
                  {/* Status Bar */}
                  <div className="bg-maroon text-white pt-5 pb-2 px-4 flex justify-between items-center text-[9px] font-bold shrink-0">
                    <span className="text-[8px]">PavtiBook</span>
                    <div className="flex items-center gap-1">
                      <Smartphone className="w-2.5 h-2.5" />
                      <span>9:41 AM</span>
                    </div>
                  </div>

                  {/* App Screen Content */}
                  <div className="flex-1 p-3 overflow-y-auto bg-cream-brand/10 select-none">
                    {renderScreenContent(screenshotTopics[carouselIndex].id)}
                  </div>
                  
                  {/* Home Indicator */}
                  <div className="h-6 w-full flex items-center justify-center shrink-0">
                    <div className="w-20 h-1 bg-neutral-400 rounded-full"></div>
                  </div>
                </div>

                {/* Hover Zoom Overlay */}
                <div className="absolute inset-0 bg-maroon/20 opacity-0 group-hover:opacity-100 rounded-[45px] transition-opacity duration-300 flex items-center justify-center">
                  <div className="bg-white/95 text-maroon text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                    <Search className="w-3.5 h-3.5" />
                    <span>Zoom In Preview</span>
                  </div>
                </div>
              </div>

              {/* Carousel Indicators / Dots */}
              <div className="flex gap-1.5 mt-2">
                {screenshotTopics.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCarouselIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      carouselIndex === idx ? "w-6 bg-maroon" : "w-2 bg-neutral-300 hover:bg-neutral-450"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 6 – WHO USES PAVTIBOOK */}
      <section className="py-20 bg-cream-brand/35 border-y border-maroon/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-maroon-dark tracking-tight">
              Designed For Indian Community Organizations
            </h2>
            <p className="text-sm md:text-base font-semibold text-neutral-600 uppercase tracking-wider">
              Tailored specifically to handle local Indian community dynamics
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {userSegments.map((seg, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-maroon/10 shadow-sm space-y-4 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center gap-3">
                  <span className="text-3xl shrink-0">{seg.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold text-maroon-dark">{seg.title}</h3>
                    <p className="text-xs text-orange-brand font-bold devanagari">{seg.marathi}</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed font-medium">{seg.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7 – BENEFITS */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-maroon-dark tracking-tight">
              Measurable Outcomes
            </h2>
            <p className="text-sm md:text-base font-semibold text-neutral-600 uppercase tracking-wider">
              Real-world improvements for community collectors
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              { num: "90%", desc: "Reduction in paper expenses and carbon footprint.", label: "Paper Saved" },
              { num: "0%", desc: "Elimination of cash leakage and collection accounting discrepancies.", label: "Zero Leakage" },
              { num: "3x", desc: "Volunteer recording speed boost compared to handwriting books.", label: "Faster Receipts" },
              { num: "100%", desc: "Direct bank transfer of UPI funds. No middleman charges.", label: "Direct Payments" },
              { num: "24/7", desc: "Access audit trails and donor history instantly from the cloud.", label: "Audit Readiness" }
            ].map((b, idx) => (
              <div key={idx} className="bg-cream-brand/20 p-6 rounded-2xl border border-maroon/5 text-center space-y-3">
                <div className="text-3xl md:text-4xl font-black text-maroon">{b.num}</div>
                <h4 className="font-bold text-neutral-800 text-xs sm:text-sm">{b.label}</h4>
                <p className="text-[11px] text-neutral-600 leading-normal font-medium">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8 – TESTIMONIALS */}
      <section className="py-20 bg-cream-brand/35 border-y border-maroon/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-maroon-dark tracking-tight">
              Trusted by Committee Leaders
            </h2>
            <p className="text-sm md:text-base font-semibold text-neutral-600 uppercase tracking-wider">
              Hear from actual mandal treasurers and temple trust presidents
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                q: "During Ganesh Chaturthi, we collect vargani from 2,000+ homes. Writing receipts by hand used to take days, and balancing the ledger was a nightmare. With PavtiBook, our volunteers do it in seconds on their phones, and donors get a WhatsApp receipt immediately.",
                n: "Vijay Parab",
                role: "Treasurer",
                org: "Ganesh Mandal, Dadar"
              },
              {
                q: "As a religious trust, keeping donor databases clean is crucial for transparent accounting. Having an automatic donor directory linked to mobile numbers means we know our recurring donors and can keep track of digital records securely.",
                n: "Ranganath Swamy",
                role: "Trust Secretary",
                org: "Shree Laxmi Temple Trust"
              },
              {
                q: "Tracking pending collections was our biggest challenge. PavtiBook's pending list keeps our committee aligned, and sending WhatsApp reminders directly increased our donation collection efficiency by 30% this year.",
                n: "Sanjay Thorat",
                role: "President",
                org: "Shiv Jayanti Committee"
              }
            ].map((t, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-maroon/10 shadow-sm flex flex-col justify-between space-y-4">
                <p className="text-xs md:text-sm text-neutral-600 italic leading-relaxed">
                  &quot;{t.q}&quot;
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-10 h-10 rounded-full bg-maroon/10 flex items-center justify-center font-black text-maroon">
                    {t.n[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-neutral-800 text-xs md:text-sm">{t.n}</h4>
                    <p className="text-[10px] text-neutral-500 font-semibold">{t.role} — {t.org}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 9 – FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-maroon-dark tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm md:text-base font-semibold text-neutral-600 uppercase tracking-wider">
              Answers to technical and collection questions
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-cream-brand/20 border border-maroon/5 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full text-left p-5 flex items-center justify-between font-bold text-sm md:text-base text-maroon-dark hover:bg-cream-brand/50 transition-colors duration-200"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-orange-brand shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform duration-200 ${openFaq === idx ? "rotate-185" : ""}`} />
                </button>
                {openFaq === idx && (
                  <div className="p-5 pt-0 text-xs md:text-sm text-neutral-600 leading-relaxed font-medium border-t border-maroon/5 bg-white">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 10 – REQUEST DEMO CTA */}
      <section className="py-20 bg-maroon text-white relative overflow-hidden">
        {/* Saffron accent flare */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-brand/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gold-brand/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative space-y-6">
          <h2 className="text-3xl md:text-5xl font-black text-cream-brand leading-tight">
            Ready to Digitize Your Collections?
          </h2>
          <p className="text-sm md:text-lg text-cream-brand/80 max-w-2xl mx-auto font-medium">
            Join thousands of Ganesh Mandals, Temple Trusts, and NGOs across India. Schedule a free demo call with our trust specialists.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href="/request-demo"
              className="w-full sm:w-auto bg-orange-brand hover:bg-orange-light text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              <span>Book Free Demo</span>
              <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
            </a>
            {(() => {
              const link = generateWhatsAppLink("I want to see a demo of PavtiBook");
              if (link) {
                return (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackWhatsAppClick("home_bottom_cta")}
                    className="w-full sm:w-auto bg-green-brand hover:bg-green-light text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-5 h-5 shrink-0" />
                    <span>Contact on WhatsApp</span>
                  </a>
                );
              }
              return (
                <div className="w-full sm:w-auto bg-neutral-300 text-neutral-500 font-bold text-sm px-8 py-4 rounded-xl shadow select-none cursor-not-allowed flex items-center justify-center gap-2">
                  <MessageSquare className="w-5 h-5 shrink-0 text-neutral-400" />
                  <span>WhatsApp Support Not Configured</span>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* LIGHTBOX MODAL */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6"
            onClick={() => setLightboxOpen(false)}
          >
            {/* Close Button */}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Modal Content Container */}
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative bg-white rounded-3xl overflow-hidden max-w-3xl w-full grid grid-cols-1 md:grid-cols-12 shadow-2xl border border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left Side: Scaled-up Phone Mockup */}
              <div className="md:col-span-6 bg-neutral-950 p-6 flex flex-col items-center justify-center min-h-[420px]">
                <div className="relative w-full max-w-[240px] aspect-[9/19] bg-neutral-900 rounded-[35px] p-2 shadow-xl border-4 border-neutral-800">
                  {/* Camera Notch */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-3 bg-neutral-900 rounded-full z-20 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-neutral-800 ml-auto mr-2"></div>
                  </div>

                  <div className="relative w-full h-full bg-cream-brand/20 rounded-[28px] overflow-hidden flex flex-col border border-neutral-700">
                    {/* Status Bar */}
                    <div className="bg-maroon text-white pt-4 pb-1.5 px-3 flex justify-between items-center text-[7px] font-bold shrink-0">
                      <span>PavtiBook</span>
                      <div className="flex items-center gap-0.5">
                        <Smartphone className="w-2 h-2" />
                        <span>9:41 AM</span>
                      </div>
                    </div>

                    {/* App Screen Content */}
                    <div className="flex-1 p-2.5 overflow-y-auto bg-cream-brand/10 select-none">
                      {renderScreenContent(screenshotTopics[lightboxIndex].id)}
                    </div>
                    
                    {/* Home Indicator */}
                    <div className="h-4 w-full flex items-center justify-center shrink-0">
                      <div className="w-16 h-0.5 bg-neutral-400 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Information & Navigation */}
              <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between bg-cream-brand/15">
                <div className="space-y-4">
                  <span className="text-[10px] bg-maroon/10 text-maroon font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Interface Preview {lightboxIndex + 1} of {screenshotTopics.length}
                  </span>
                  
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-maroon-dark">
                      {screenshotTopics[lightboxIndex].title}
                    </h3>
                    <p className="text-xs text-orange-brand font-bold uppercase tracking-wider mt-0.5">
                      PavtiBook App UI
                    </p>
                  </div>

                  <p className="text-sm text-neutral-600 leading-relaxed font-semibold">
                    {screenshotTopics[lightboxIndex].desc}
                  </p>

                  <div className="bg-white p-4 rounded-xl border border-maroon/5 space-y-2 text-xs text-neutral-700 font-semibold shadow-sm">
                    <p className="text-neutral-500 font-bold">Key Benefits:</p>
                    <ul className="space-y-1">
                      <li className="flex items-center gap-1.5 text-neutral-600">✓ Modern Material Design UX</li>
                      <li className="flex items-center gap-1.5 text-neutral-600">✓ Fast and responsive offline support</li>
                      <li className="flex items-center gap-1.5 text-neutral-600">✓ Fully encrypted local/cloud database</li>
                    </ul>
                  </div>
                </div>

                {/* Navigation controls */}
                <div className="flex items-center justify-between pt-6 border-t border-neutral-200 mt-6">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setLightboxIndex(
                          (lightboxIndex - 1 + screenshotTopics.length) % screenshotTopics.length
                        )
                      }
                      className="bg-white hover:bg-neutral-105 border border-neutral-200 text-neutral-808 p-2 rounded-lg transition-colors cursor-pointer"
                    >
                      <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() =>
                        setLightboxIndex((lightboxIndex + 1) % screenshotTopics.length)
                      }
                      className="bg-white hover:bg-neutral-105 border border-neutral-200 text-neutral-808 p-2 rounded-lg transition-colors cursor-pointer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <button
                    onClick={() => setLightboxOpen(false)}
                    className="bg-maroon hover:bg-maroon-light text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
