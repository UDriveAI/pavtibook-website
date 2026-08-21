"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
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
  QrCode,
  Sparkles,
  Shield,
  Layers
} from "lucide-react";
import { generateDemoWhatsAppLink, getFormattedWhatsAppDisplay } from "@/lib/whatsapp";
import { trackWhatsAppClick } from "@/lib/analytics";

// Interactive Screen Topics for Product Carousel
const screenshotTopics = [
  {
    id: "receipt",
    title: "Instant Receipt Creation",
    subtitle: "पावती निर्मिती",
    desc: "Auto-fills donor profiles by phone number, generates sequential receipt numbers, and records cash or UPI.",
    color: "bg-orange-brand"
  },
  {
    id: "preview",
    title: "Traditional Receipt Preview",
    subtitle: "पारंपारिक पावती",
    desc: "Renders custom receipt templates with Devanagari headers, double borders, authorized signatures, and verification QR.",
    color: "bg-gold-brand"
  },
  {
    id: "dashboard",
    title: "Collection Dashboard",
    subtitle: "डॅशबोर्ड आणि आकडेवारी",
    desc: "Real-time summary of today's total collections, cash vs. UPI split, donor count, and active collection activity.",
    color: "bg-maroon"
  },
  {
    id: "donors",
    title: "Donor Directory (CRM)",
    subtitle: "देणगीदार नोंदणी",
    desc: "Search, filter, and track historical contributions of every community supporter across seasons.",
    color: "bg-green-brand"
  },
  {
    id: "pending",
    title: "Pending Collection Tracker",
    subtitle: "प्रलंबित वर्गणी",
    desc: "Track promised donations (vargani) with due dates and send polite WhatsApp reminder alerts.",
    color: "bg-maroon-dark"
  }
];

function renderMockScreen(id: string) {
  switch (id) {
    case "receipt":
      return (
        <div className="space-y-2.5 pt-1 text-[9px] animate-in fade-in duration-300">
          <div className="flex justify-between items-center border-b border-maroon/10 pb-1.5">
            <h4 className="font-bold text-maroon text-[10px]">New Receipt (नवीन पावती)</h4>
            <span className="text-[8px] bg-orange-brand/10 text-orange-brand font-bold px-1.5 py-0.5 rounded">PB-2026</span>
          </div>
          <div className="space-y-1">
            <label className="text-[7.5px] font-bold text-neutral-600">DONOR MOBILE (मोबाईल)</label>
            <input type="text" value="98234 56789" disabled className="w-full bg-white border border-neutral-300 rounded p-1 text-[9px] font-semibold text-neutral-800 outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[7.5px] font-bold text-neutral-600">DONOR NAME (नाव)</label>
            <input type="text" value="Shri. Ramesh Patil" disabled className="w-full bg-white border border-neutral-300 rounded p-1 text-[9px] font-semibold text-neutral-800 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="space-y-1">
              <label className="text-[7.5px] font-bold text-neutral-600">AMOUNT (रक्कम ₹)</label>
              <input type="text" value="₹ 501" disabled className="w-full bg-white border border-neutral-300 rounded p-1 text-[9px] font-black text-maroon outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[7.5px] font-bold text-neutral-600">MODE (पेमेंट)</label>
              <input type="text" value="Cash / UPI" disabled className="w-full bg-white border border-neutral-300 rounded p-1 text-[9px] font-semibold text-neutral-800 outline-none" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[7.5px] font-bold text-neutral-600">PURPOSE (कारण)</label>
            <input type="text" value="Ganpati Vargani 2026" disabled className="w-full bg-white border border-neutral-300 rounded p-1 text-[9px] text-neutral-800 outline-none" />
          </div>
          <div className="w-full bg-orange-brand text-white font-bold py-1.5 rounded text-center text-[9px] shadow-sm mt-2 flex items-center justify-center gap-1">
            <Share2 className="w-3 h-3" />
            <span>Generate & Share on WhatsApp</span>
          </div>
        </div>
      );
    case "preview":
      return (
        <div className="pt-0.5 text-[7px] leading-tight animate-in fade-in duration-300">
          <div className="bg-[#FFFDF9] traditional-border p-2 shadow-md relative text-neutral-800">
            <div className="text-center text-[6px] font-bold text-maroon devanagari">
              ॥ श्री गणेश प्रसन्न ॥
            </div>
            <div className="text-center font-bold text-maroon text-[8px] tracking-tight mt-0.5">
              LALBAUGCHA RAJA GANESH UTSAV
            </div>
            <hr className="border-maroon/20 my-1" />
            <div className="flex justify-between font-bold text-neutral-700 mb-0.5 text-[6.5px]">
              <span>No: PB-2026-000050</span>
              <span>Date: 18 August 2026</span>
            </div>
            <div className="space-y-0.5 text-neutral-700 font-medium">
              <div>Received with thanks from:</div>
              <div className="font-bold text-neutral-900 border-b border-dashed border-neutral-300 pb-0.5">
                Shri. Ramesh Patil
              </div>
              <div>The sum of Rupees:</div>
              <div className="font-bold text-neutral-900 border-b border-dashed border-neutral-300 pb-0.5">
                Five Hundred One Only
              </div>
              <div className="flex justify-between items-center pt-0.5 text-[6.5px]">
                <div>For: <span className="font-bold">Ganpati Vargani</span></div>
                <div>Mode: <span className="font-bold">UPI (Paid)</span></div>
              </div>
            </div>
            <div className="flex justify-between items-end mt-2 pt-0.5">
              <div className="bg-maroon/10 border border-maroon text-maroon px-1.5 py-0.5 font-black text-[9px] rounded">
                ₹ 501/-
              </div>
              <div className="w-7 h-7 border border-neutral-400 p-0.5 flex items-center justify-center bg-white rounded shadow-sm">
                <QrCode className="w-full h-full text-neutral-900" />
              </div>
              <div className="text-right text-[5px] text-neutral-600 italic">
                <div className="font-bold text-neutral-800">Treasurer</div>
                <span>Authorised Signatory</span>
              </div>
            </div>
          </div>
          <div className="mt-2 bg-emerald-50 border border-emerald-200 p-1 rounded flex items-center gap-1.5 text-emerald-800 text-[6.5px]">
            <CheckCircle className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
            <span>Delivered to Donor&apos;s WhatsApp (+91 98234 56789)</span>
          </div>
        </div>
      );
    case "dashboard":
      return (
        <div className="space-y-2.5 pt-1 text-[8px] animate-in fade-in duration-300">
          <div className="bg-white p-2.5 rounded-xl border border-maroon/10 shadow-sm text-center">
            <p className="text-[7.5px] font-bold text-neutral-500 uppercase tracking-wide">Today&apos;s Total Collection</p>
            <h4 className="text-xl font-black text-maroon">₹ 1,50,500</h4>
            <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-neutral-100 text-[7.5px] text-neutral-600">
              <div>Cash: <span className="font-bold text-neutral-800">₹50,000</span></div>
              <div>UPI: <span className="font-bold text-green-brand">₹1,00,500</span></div>
            </div>
          </div>

          <div className="bg-white p-2 rounded-xl border border-maroon/10 shadow-sm">
            <div className="flex justify-between items-center text-[7.5px] font-bold text-neutral-600 mb-1">
              <span>FESTIVAL TOTALS</span>
              <span className="text-orange-brand">AUGUST 2026</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-center">
              <div className="bg-cream-brand/50 p-1.5 rounded-lg">
                <p className="text-[6.5px] text-neutral-600">Total Donors</p>
                <p className="text-xs font-bold text-neutral-800">856</p>
              </div>
              <div className="bg-cream-brand/50 p-1.5 rounded-lg">
                <p className="text-[6.5px] text-neutral-600">Receipts Issued</p>
                <p className="text-xs font-bold text-neutral-800">1,245</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-2 rounded-xl border border-maroon/10 shadow-sm space-y-1">
            <p className="font-bold text-neutral-600 text-[7.5px] uppercase">Recent Receipts</p>
            {[
              { name: "Rahul Patil", amount: "₹ 1,000", mode: "UPI" },
              { name: "Sneha Joshi", amount: "₹ 500", mode: "Cash" },
              { name: "Amit Sharma", amount: "₹ 2,100", mode: "UPI" }
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-0.5 border-b border-neutral-50 last:border-0 text-[7.5px]">
                <span className="font-semibold text-neutral-800">{item.name} ({item.mode})</span>
                <span className="font-bold text-green-brand">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "donors":
      return (
        <div className="space-y-2 pt-1 text-[8px] animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-neutral-800 text-[9px]">Donor Directory</h4>
            <span className="text-neutral-500 text-[7px] font-semibold">856 Profiles</span>
          </div>
          <div className="bg-white p-1 rounded border border-neutral-200 flex items-center justify-between text-[7.5px] mb-1">
            <span className="text-neutral-400">Search by Name or Mobile...</span>
            <Search className="w-2.5 h-2.5 text-neutral-400" />
          </div>
          <div className="space-y-1">
            {[
              { n: "Kiran R. Deshmukh", p: "+91 98332 11223", a: "₹ 5,000", c: "3 Receipts" },
              { n: "Rajesh S. Thorat", p: "+91 98455 66778", a: "₹ 2,500", c: "2 Receipts" },
              { n: "Anjali M. Kadam", p: "+91 97665 44332", a: "₹ 1,001", c: "1 Receipt" }
            ].map((item, i) => (
              <div key={i} className="bg-white p-1.5 rounded border border-neutral-100 flex justify-between items-center text-[7.5px]">
                <div>
                  <p className="font-bold text-neutral-800">{item.n}</p>
                  <p className="text-[6.5px] text-neutral-500">{item.p} · {item.c}</p>
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
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-neutral-800 text-[9px]">Pending Vargani</h4>
            <span className="text-orange-brand text-[7px] font-bold">2 Due</span>
          </div>
          <div className="space-y-1.5">
            {[
              { n: "Vikas More (Shop #4)", a: "₹ 5,000", d: "Due 20 Aug" },
              { n: "Santosh G. (Builder)", a: "₹ 11,000", d: "Due 22 Aug" }
            ].map((item, i) => (
              <div key={i} className="bg-white p-2 rounded-lg border border-neutral-200 flex justify-between items-center shadow-sm text-[7.5px]">
                <div>
                  <p className="font-bold text-neutral-800">{item.n}</p>
                  <p className="text-[6.5px] text-neutral-500 font-semibold">{item.d}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-0.5">
                  <p className="font-black text-orange-brand">{item.a}</p>
                  <span className="bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded text-[6px] font-bold flex items-center gap-0.5">
                    <MessageSquare className="w-2 h-2" /> Remind
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
}

export default function Home() {
  const [activeScreenIndex, setActiveScreenIndex] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [activeFeatureTab, setActiveFeatureTab] = useState<"receipts" | "donors" | "collections" | "management">("receipts");

  const displayPhone = getFormattedWhatsAppDisplay();

  const faqs = [
    {
      q: "PavtiBook म्हणजे काय आणि हे कोणासाठी आहे? (What is PavtiBook?)",
      a: "PavtiBook हे गणेशोत्सव मंडळे, नवरात्र उत्सव, मंदिर ट्रस्ट, सामाजिक संस्था आणि गृहनिर्माण संस्थांसाठी बनवलेले डिजिटल पावती व देणगी व्यवस्थापन ॲप आहे. पारंपारिक कागदी पावत्यांऐवजी मोबाईलवरून थेट पावती तयार करून देणगीदाराच्या WhatsApp वर त्वरित पाठवता येते."
    },
    {
      q: "पावती देणगीदाराच्या WhatsApp वर कशी जाते? (WhatsApp Receipt Sharing)",
      a: "पावती बनवल्यावर ॲप आपोआप अधिकृत डिझाइनची PDF तयार करतो. 'WhatsApp वर शेअर करा' वर क्लिक करताच पावती थेट देणगीदाराच्या WhatsApp वर एका सेकंदात पाठवली जाते."
    },
    {
      q: "पावतीची QR कोडद्वारे पडताळणी कशी होते? (QR Verification)",
      a: "प्रत्येक पावतीवर एक सुरक्षित युनिक QR कोड असतो. कोणताही देणगीदार किंवा नागरिक तो QR कोड मोबाईल कॅमेऱ्याने स्कॅन करून pavtibook.online वर पावतीची खरी रक्कम, नाव आणि तारीख तपासू शकतो."
    },
    {
      q: "प्रलंबित वर्गणी (Pending Vargani) ट्रॅक करता येते का?",
      a: "होय! ज्या देणगीदारांनी किंवा दुकानांनी नंतर वर्गणी देण्याचे आश्वासन दिले आहे, त्यांच्या नोंदी 'Pending' म्हणून नोंदवता येतात आणि योग्य दिवशी त्यांना WhatsApp वर स्मरणपत्र (Reminder) पाठवता येते."
    },
    {
      q: "एकाच वेळी अनेक कार्यकर्ते (Volunteers) पावती फाडू शकतात का?",
      a: "होय. एका मंडळासाठी अध्यक्ष, खजिनदार आणि अनेक कार्यकर्त्यांचे स्वतंत्र लॉग इन बनवता येतात. प्रत्येक कार्यकर्त्याने जमा केलेली रक्कम डॅशबोर्डवर स्वतंत्रपणे दिसते."
    },
    {
      q: "UPI पेमेंट थेट आमच्या ट्रस्टच्या बँक खात्यात जमा होते का?",
      a: "होय. PavtiBook मध्ये मंडळाचा स्वतःचा UPI ID सेट केला जातो. देणगीदाराने QR स्कॅन केल्यावर पैसे थेट मंडळाच्या बँक खात्यात जमा होतात, यामध्ये कोणताही मध्यस्थ किंवा कमिशन नसते."
    },
    {
      q: "पावतीवर आमचा लोगो, नाव आणि सही टाकता येते का?",
      a: "होय. Template Settings मधून मंडळाचा अधिकृत लोगो, नाव, पत्ता आणि खजिनदारांची डिजिटल सही पावतीवर आपोआप सेट करता येते."
    },
    {
      q: "डेटा सुरक्षित राहतो का? (Data Backup & Safety)",
      a: "होय. सर्व पावत्या आणि देणगीदारांची माहिती सुरक्षित क्लाउड डेटाबेसमध्ये साठवली जाते. फोन हरवला किंवा बदलला तरी सर्व जुना डेटा त्वरित मिळवता येतो आणि Excel/CSV मध्ये डाउनलोड करता येतो."
    }
  ];

  const userSegments = [
    {
      title: "Ganesh Mandals",
      marathi: "गणेश मंडळ",
      desc: "High-speed vargani collection during festival days with multi-volunteer tracking for cash & UPI.",
      icon: "🌺"
    },
    {
      title: "Temple Trusts",
      marathi: "मंदिर ट्रस्ट",
      desc: "Daily pooja and donation receipts with custom deity watermarks and organized lifetime donor databases.",
      icon: "🛕"
    },
    {
      title: "Festival Committees",
      marathi: "उत्सव समिती",
      desc: "Digitize Navratri, Shiv Jayanti, or Dahi Handi drives with live daily collection dashboards.",
      icon: "🥁"
    },
    {
      title: "NGOs & Foundations",
      marathi: "सामाजिक संस्था",
      desc: "Transparent fundraising drives with instant digital receipts, audit export, and donor management.",
      icon: "🤝"
    },
    {
      title: "Housing Societies",
      marathi: "गृहनिर्माण संस्था",
      desc: "Maintenance and festival contributions with digital WhatsApp delivery and year-end CSV reports.",
      icon: "🏢"
    },
    {
      title: "Community Groups",
      marathi: "स्थानिक मंडळ",
      desc: "Cultural events, sports tournaments, and member contributions with verifiable digital records.",
      icon: "👥"
    }
  ];

  return (
    <div className="min-h-screen bg-cream-light font-sans text-neutral-800 selection:bg-maroon selection:text-white">
      <Header />

      {/* ============================================================ */}
      {/* 1. HERO SECTION                                              */}
      {/* ============================================================ */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden bg-gradient-to-b from-cream-brand via-cream-light to-white">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#8B1E2D_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-orange-brand/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full bg-gold-brand/20 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Value Proposition */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-maroon/10 border border-gold-brand/35 text-maroon text-xs sm:text-sm font-semibold tracking-wide">
                <span className="flex h-2 w-2 rounded-full bg-orange-brand animate-pulse" />
                <span>डिजिटल पावती आणि देणगी व्यवस्थापन</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-[3.4rem] font-black text-maroon-dark tracking-tight leading-[1.14]">
                Digital Trust for <br />
                <span className="text-orange-brand">Indian Collections</span>
              </h1>
              
              <p className="text-base sm:text-lg md:text-xl text-neutral-700 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Generate authentic digital receipts, share instantly on WhatsApp, track donors, and verify collections with QR codes. Built specifically for Ganesh Mandals, Temple Trusts, and NGOs.
              </p>

              {/* Cultural Tagline */}
              <div className="bg-cream-brand/90 border-l-4 border-gold-brand p-4 rounded-r-xl max-w-xl mx-auto lg:mx-0 shadow-sm border border-maroon/10">
                <p className="text-base sm:text-lg font-bold text-maroon-dark devanagari leading-snug">
                  &quot;वर्गणी घेतल्याबरोबर पावती थेट देणगीदाराच्या WhatsApp वर.&quot;
                </p>
                <p className="text-xs text-neutral-600 mt-1 font-semibold">
                  पारंपारिक विश्वास · डिजिटल सोपेपणा (Traditional Trust · Digital Simplicity)
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/request-demo"
                  className="w-full sm:w-auto text-center bg-maroon hover:bg-maroon-light text-white text-sm sm:text-base font-bold px-7 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group"
                >
                  <span>Request Free Demo</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>

                <a
                  href={generateDemoWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackWhatsAppClick("hero_whatsapp_cta")}
                  className="w-full sm:w-auto text-center bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-base font-bold px-6 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span>Chat on WhatsApp</span>
                </a>

                <Link
                  href="/verify"
                  className="w-full sm:w-auto text-center bg-white border border-maroon/20 hover:bg-maroon/5 text-maroon text-sm sm:text-base font-bold px-6 py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Verify Receipt</span>
                </Link>
              </div>

              {/* Core Feature Badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-neutral-600 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Instant WhatsApp Delivery</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Verifiable QR Codes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Multi-Volunteer Accounts</span>
                </div>
              </div>
            </div>

            {/* Right Realistic Product Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[330px] aspect-[9/19] bg-neutral-900 rounded-[48px] p-2.5 shadow-2xl border-4 border-neutral-800">
                {/* Speaker & Camera Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-28 bg-neutral-900 rounded-b-2xl z-20 flex items-center justify-center">
                  <div className="w-10 h-1 bg-neutral-800 rounded-full" />
                </div>

                {/* Inner Screen Canvas */}
                <div className="relative w-full h-full bg-cream-light rounded-[38px] overflow-hidden flex flex-col z-10 border border-neutral-700">
                  {/* Status Bar */}
                  <div className="bg-maroon text-white pt-6 pb-2 px-3.5 flex justify-between items-center text-[9px] font-bold">
                    <span className="text-cream-brand">PavtiBook</span>
                    <span className="text-gold-brand">॥ श्री गणेश प्रसन्न ॥</span>
                  </div>

                  {/* Dynamic Mock Screen View */}
                  <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3">
                    {renderMockScreen(screenshotTopics[activeScreenIndex].id)}
                  </div>

                  {/* Mock Bottom App Nav */}
                  <div className="bg-white border-t border-neutral-200 py-2 px-3 flex justify-between items-center text-[8px] font-bold text-neutral-600">
                    {screenshotTopics.map((item, idx) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveScreenIndex(idx)}
                        className={`flex flex-col items-center gap-0.5 ${
                          activeScreenIndex === idx ? "text-maroon font-black" : "text-neutral-500"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full mb-0.5" style={{ background: activeScreenIndex === idx ? "#8B1E2D" : "transparent" }} />
                        <span className="text-[7.5px]">{item.title.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Home Indicator */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 h-1 bg-neutral-700 rounded-full" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. PROBLEMS WE SOLVE (BEFORE VS AFTER)                       */}
      {/* ============================================================ */}
      <section className="py-16 md:py-20 bg-cream-brand/30 border-y border-maroon/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-maroon-dark tracking-tight">
              Why Mandals Are Switching to PavtiBook
            </h2>
            <p className="text-sm md:text-base font-semibold text-neutral-600">
              Traditional paper receipt struggles vs. PavtiBook digital reliability
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {/* The Paper Receipt Struggle */}
            <div className="bg-white p-7 sm:p-8 rounded-2xl border-2 border-red-100 shadow-sm space-y-5 relative">
              <div className="flex items-center gap-2.5 text-red-600 font-bold text-lg">
                <XCircle className="w-6 h-6 shrink-0" />
                <span>The Paper Receipt Struggle (पारंपारिक अडचणी)</span>
              </div>
              
              <ul className="space-y-3.5 text-xs sm:text-sm">
                {[
                  { t: "Lost & Wet Paper Books", d: "Receipt books get torn or damaged during monsoon festivals, losing records forever." },
                  { t: "Nighttime Balancing Errors", d: "Volunteers spend hours reconciling cash with duplicate paper slips after midnight." },
                  { t: "Lost Donor Contact Numbers", d: "Handwritten phone numbers are often illegible, so donor lists cannot be reused next year." },
                  { t: "Forgotten Pending Pledges", d: "Promised sponsorships are written on loose slips and forgotten, causing collection leakage." },
                  { t: "Auditing & Transparency Issues", d: "Paper records make it difficult to verify authenticity during committee reviews." }
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="h-5 w-5 rounded-full bg-red-100 text-red-600 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">✕</span>
                    <div>
                      <h4 className="font-bold text-neutral-800">{item.t}</h4>
                      <p className="text-neutral-600 text-xs mt-0.5">{item.d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* The PavtiBook Advantage */}
            <div className="bg-white p-7 sm:p-8 rounded-2xl border-2 border-emerald-500/20 shadow-md space-y-5 relative">
              <div className="flex items-center gap-2.5 text-emerald-700 font-bold text-lg">
                <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                <span>The PavtiBook Advantage (पावतीबुकचा फायदा)</span>
              </div>
              
              <ul className="space-y-3.5 text-xs sm:text-sm">
                {[
                  { t: "Instant WhatsApp Delivery", d: "Beautiful digital receipt with trust branding sent directly to the donor in seconds." },
                  { t: "Automated Daily Tally", d: "Real-time dashboard tracks cash vs. UPI totals and volunteer-wise collection summaries." },
                  { t: "Permanent Cloud Donor Directory", d: "Phone numbers and historical contribution sizes are safely saved for future festivals." },
                  { t: "Smart Pending Vargani Reminders", d: "Set reminder schedules for promised donations and send polite WhatsApp alerts in one tap." },
                  { t: "Online QR Verification", d: "Every receipt has a verifiable QR code ensuring 100% transparency for donors and organizers." }
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">✓</span>
                    <div>
                      <h4 className="font-bold text-neutral-800">{item.t}</h4>
                      <p className="text-neutral-600 text-xs mt-0.5">{item.d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. DEDICATED QR VERIFICATION TRUST SECTION                   */}
      {/* ============================================================ */}
      <section id="qr-verification" className="py-16 md:py-24 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Explanation */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 border border-emerald-300 text-emerald-800 text-xs font-bold">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Verifiable & Tamper-Proof</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-maroon-dark tracking-tight leading-tight">
                Every Receipt Can Be Verified Online
              </h2>

              <p className="text-sm sm:text-base text-neutral-700 leading-relaxed font-medium">
                PavtiBook brings transparency to festival collections. Every receipt issued through the platform contains an authentic, machine-verifiable QR code. Donors can simply scan the QR code using any smartphone camera to view the registered receipt on <span className="font-bold text-maroon">pavtibook.online</span>.
              </p>

              {/* 4-Step Verification Workflow */}
              <div className="space-y-3 pt-2">
                {[
                  { step: "1", title: "Receipt Generated", desc: "Volunteer records donation and app creates verified receipt with unique token." },
                  { step: "2", title: "Donor Scans QR", desc: "Donor scans QR code using phone camera, Google Lens, or PavtiBook scanner." },
                  { step: "3", title: "Cloud Registry Lookup", desc: "System securely authenticates the receipt against the organization database." },
                  { step: "4", title: "Instant Authenticity Confirmed", desc: "Website shows exact donor name, donation amount, date, and trust name." }
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3.5 p-3 rounded-xl bg-cream-brand/40 border border-maroon/10">
                    <span className="w-7 h-7 rounded-full bg-maroon text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {item.step}
                    </span>
                    <div>
                      <h4 className="font-bold text-neutral-900 text-sm">{item.title}</h4>
                      <p className="text-xs text-neutral-600 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  href="/verify"
                  className="inline-flex items-center gap-2 bg-maroon hover:bg-maroon-light text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl shadow-sm transition-all"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Open Public Verification Page</span>
                </Link>
                <span className="text-xs text-neutral-500 font-semibold">
                  (Try with any receipt number)
                </span>
              </div>
            </div>

            {/* Right Verification Visual Card */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-md bg-gradient-to-br from-cream-brand/60 to-white rounded-3xl p-6 sm:p-8 border border-maroon/15 shadow-xl space-y-6">
                
                {/* Badge Header */}
                <div className="bg-emerald-700 text-white p-4 rounded-2xl text-center space-y-1 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mx-auto text-lg mb-1">
                    ✓
                  </div>
                  <h3 className="font-extrabold text-base">Receipt Verified (पडताळणी पूर्ण)</h3>
                  <p className="text-xs text-emerald-100">Official PavtiBook Digital Registry</p>
                </div>

                {/* Organization Details */}
                <div className="bg-white p-4 rounded-xl border border-maroon/10 shadow-sm space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-500 font-semibold">Organization</span>
                    <span className="font-bold text-maroon">Ganesh Mandal, Dadar</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-500 font-semibold">Receipt No.</span>
                    <span className="font-mono font-bold text-neutral-800">PB-2026-000050</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-500 font-semibold">Donor Name</span>
                    <span className="font-bold text-neutral-800">Pranay Asha</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-500 font-semibold">Amount</span>
                    <span className="text-base font-black text-emerald-700">₹ 501.00</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-500 font-semibold">Date & Time</span>
                    <span className="text-neutral-700 font-medium">18 August 2026 (IST)</span>
                  </div>
                </div>

                {/* Security Seal */}
                <div className="text-center p-2.5 rounded-lg bg-maroon/5 border border-maroon/15 text-xs text-maroon font-bold flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Authenticated & Encrypted Digital Record</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. GROUPED FEATURES ARCHITECTURE                             */}
      {/* ============================================================ */}
      <section className="py-16 md:py-24 bg-cream-brand/25 border-y border-maroon/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-maroon-dark tracking-tight">
              Comprehensive Feature Architecture
            </h2>
            <p className="text-sm md:text-base font-semibold text-neutral-600">
              Built for speed in crowded festival pandals and total financial transparency
            </p>

            {/* Feature Tabs */}
            <div className="flex flex-wrap justify-center gap-2 pt-4">
              {[
                { id: "receipts", label: "🧾 Digital Receipts", marathi: "पावती निर्मिती" },
                { id: "donors", label: "👥 Donor Directory", marathi: "देणगीदार CRM" },
                { id: "collections", label: "📊 Collections & UPI", marathi: "जमा आणि UPI" },
                { id: "management", label: "🔒 Team & Security", marathi: "कार्यकर्ते व्यवस्थापन" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFeatureTab(tab.id as "receipts" | "donors" | "collections" | "management")}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeFeatureTab === tab.id
                      ? "bg-maroon text-white shadow-md scale-105"
                      : "bg-white text-neutral-700 border border-maroon/15 hover:bg-maroon/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {activeFeatureTab === "receipts" && [
              { t: "Devanagari Sanskrit Headers", d: "Preset headers like '॥ श्री गणेश प्रसन्न ॥' and regional festival titles for cultural authenticity.", i: <FileText className="w-5 h-5 text-maroon" /> },
              { t: "Instant WhatsApp Sharing", d: "One-click share dialogue triggers WhatsApp with the formatted receipt PDF attached directly.", i: <Share2 className="w-5 h-5 text-emerald-600" /> },
              { t: "PDF & JPG Output", d: "Download high-resolution PDFs for printing or lightweight JPGs optimized for mobile messaging.", i: <FileDown className="w-5 h-5 text-orange-brand" /> },
              { t: "Deity Watermarks & Logos", d: "Upload custom trust logos, treasurer digital signatures, and optional deity background watermarks.", i: <Award className="w-5 h-5 text-gold-brand" /> }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-maroon/10 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                <div className="p-2.5 rounded-xl bg-cream-brand/60 w-fit">{item.i}</div>
                <h3 className="font-bold text-base text-maroon-dark">{item.t}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">{item.d}</p>
              </div>
            ))}

            {activeFeatureTab === "donors" && [
              { t: "Auto-Fill by Mobile Number", d: "Typing an existing donor's phone number instantly fills their name, address, and past donation history.", i: <Users className="w-5 h-5 text-maroon" /> },
              { t: "Lifetime Contribution History", d: "Track how much each donor contributed across previous festival years for personalized thanks.", i: <TrendingUp className="w-5 h-5 text-emerald-600" /> },
              { t: "VIP & Sponsor Filtering", d: "Segment major commercial sponsors from regular household vargani for targeted coordination.", i: <Award className="w-5 h-5 text-orange-brand" /> },
              { t: "One-Click CSV Export", d: "Export clean donor contact directories to Excel or CSV for festival invitations and AGM reporting.", i: <FileDown className="w-5 h-5 text-gold-brand" /> }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-maroon/10 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                <div className="p-2.5 rounded-xl bg-cream-brand/60 w-fit">{item.i}</div>
                <h3 className="font-bold text-base text-maroon-dark">{item.t}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">{item.d}</p>
              </div>
            ))}

            {activeFeatureTab === "collections" && [
              { t: "Direct UPI (Zero Commission)", d: "Generates P2P UPI QR codes. Payments land directly in trust's bank account with no middleman fees.", i: <Smartphone className="w-5 h-5 text-maroon" /> },
              { t: "Cash vs. UPI Realtime Split", d: "Dashboard automatically calculates cash in hand vs. digital bank deposits throughout collection drives.", i: <TrendingUp className="w-5 h-5 text-emerald-600" /> },
              { t: "Pending Vargani Reminders", d: "Schedule promised donations with target dates and dispatch friendly WhatsApp reminders in 1 click.", i: <Clock className="w-5 h-5 text-orange-brand" /> },
              { t: "Multi-Day Collection Charts", d: "View hourly and daily collection trends to allocate volunteers to high-density areas efficiently.", i: <Layers className="w-5 h-5 text-gold-brand" /> }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-maroon/10 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                <div className="p-2.5 rounded-xl bg-cream-brand/60 w-fit">{item.i}</div>
                <h3 className="font-bold text-base text-maroon-dark">{item.t}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">{item.d}</p>
              </div>
            ))}

            {activeFeatureTab === "management" && [
              { t: "Multi-Volunteer Logins", d: "Assign separate mobile accounts to volunteers. Every receipt records which volunteer accepted the money.", i: <UserCheck className="w-5 h-5 text-maroon" /> },
              { t: "Role-Based Permissions", d: "Presidents and Treasurers view full settings, while field collectors only generate and view their own receipts.", i: <Shield className="w-5 h-5 text-emerald-600" /> },
              { t: "Tamper-Proof Sequential Numbers", d: "System generates automated serials (e.g. PB-2026-000050) ensuring no duplicate or missing pages.", i: <ShieldCheck className="w-5 h-5 text-orange-brand" /> },
              { t: "Automatic Cloud Backup", d: "All records are securely encrypted and backed up continuously. Access from any phone or desktop browser.", i: <RefreshCw className="w-5 h-5 text-gold-brand" /> }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-maroon/10 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                <div className="p-2.5 rounded-xl bg-cream-brand/60 w-fit">{item.i}</div>
                <h3 className="font-bold text-base text-maroon-dark">{item.t}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>

          <div className="text-center pt-10">
            <Link
              href="/features"
              className="inline-flex items-center gap-1.5 text-maroon font-bold text-sm hover:text-orange-brand transition-colors"
            >
              <span>Explore all in-depth features on the Features page</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. HOW IT WORKS (4-STEP WORKFLOW)                            */}
      {/* ============================================================ */}
      <section id="how-it-works" className="py-16 md:py-24 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-maroon-dark tracking-tight">
              Simple 4-Step Field Workflow
            </h2>
            <p className="text-sm md:text-base font-semibold text-neutral-600">
              How volunteers and organizers manage digital collections on the ground
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {[
              {
                step: "01",
                title: "Register Your Trust",
                marathi: "नोंदणी",
                desc: "Sign up in 1 minute, configure your Mandal name, logo, UPI ID, and authorized signatory.",
                icon: <Sparkles className="w-5 h-5 text-gold-brand" />
              },
              {
                step: "02",
                title: "Create Receipt",
                marathi: "पावती निर्मिती",
                desc: "Volunteer enters donor phone, name, and amount. Existing donors auto-fill in 1 second.",
                icon: <FileText className="w-5 h-5 text-orange-brand" />
              },
              {
                step: "03",
                title: "Collect Cash or UPI",
                marathi: "रक्कम स्वीकारा",
                desc: "Accept cash or display direct P2P UPI QR code. Funds go straight to the trust's bank account.",
                icon: <Smartphone className="w-5 h-5 text-emerald-600" />
              },
              {
                step: "04",
                title: "WhatsApp Delivery",
                marathi: "WhatsApp वर पाठवा",
                desc: "PDF receipt is immediately delivered to the donor's WhatsApp with verifiable QR code.",
                icon: <MessageSquare className="w-5 h-5 text-maroon" />
              }
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-cream-brand/35 p-6 rounded-2xl border border-maroon/10 shadow-sm space-y-3 relative hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-center">
                  <span className="w-8 h-8 rounded-full bg-maroon text-white font-black text-xs flex items-center justify-center">
                    {item.step}
                  </span>
                  <div className="p-2 rounded-xl bg-white shadow-xs border border-neutral-100">
                    {item.icon}
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-maroon-dark">{item.title}</h3>
                  <p className="text-xs text-orange-brand font-bold devanagari">{item.marathi}</p>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. WHO USES PAVTIBOOK (COMMUNITY SEGMENTS)                    */}
      {/* ============================================================ */}
      <section className="py-16 md:py-20 bg-cream-brand/35 border-y border-maroon/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-maroon-dark tracking-tight">
              Designed For Indian Organizations
            </h2>
            <p className="text-sm md:text-base font-semibold text-neutral-600">
              Tailored specifically to handle local Indian community dynamics and festival operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {userSegments.map((seg, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-maroon/10 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{seg.icon}</span>
                  <div>
                    <h3 className="text-base font-bold text-maroon-dark">{seg.title}</h3>
                    <p className="text-xs text-orange-brand font-bold devanagari">{seg.marathi}</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed font-medium">{seg.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. PRICING SECTION (AUTHENTIC UNALTERED PLANS)               */}
      {/* ============================================================ */}
      <section id="pricing" className="py-16 md:py-24 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-maroon/10 text-maroon text-xs font-bold uppercase tracking-wider">
              Transparent Pricing
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-maroon-dark tracking-tight">
              Simple, Affordable Plans for Every Mandal
            </h2>
            <p className="text-sm md:text-base text-neutral-600 font-medium">
              No hidden gateway commissions on donations. Choose the plan that fits your festival size.
            </p>

            {/* Monthly / Yearly Switcher */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <span className={`text-xs sm:text-sm font-bold ${billingPeriod === "monthly" ? "text-maroon" : "text-neutral-500"}`}>
                Monthly Billing
              </span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "yearly" : "monthly")}
                className="w-12 h-6 bg-maroon rounded-full p-1 transition-colors duration-200 focus:outline-none relative"
                aria-label="Toggle billing period"
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                    billingPeriod === "yearly" ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
              <span className={`text-xs sm:text-sm font-bold ${billingPeriod === "yearly" ? "text-maroon" : "text-neutral-500"} flex items-center gap-1`}>
                <span>Yearly Billing</span>
                <span className="bg-emerald-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                  Save 30%
                </span>
              </span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
            {/* Professional Plan */}
            <div className="bg-white rounded-3xl border border-maroon/15 shadow-sm hover:shadow-md p-7 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-black text-maroon-dark">Professional</h3>
                  <p className="text-xs text-orange-brand font-bold devanagari">व्यावसायिक</p>
                  <p className="text-xs text-neutral-600 mt-1">Perfect for active Ganesh/Navratri Mandals and Temple Trusts.</p>
                </div>

                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-neutral-800">₹</span>
                  <span className="text-4xl sm:text-5xl font-black text-neutral-900 tracking-tight">
                    {billingPeriod === "monthly" ? "99" : "999"}
                  </span>
                  <span className="text-neutral-500 text-xs font-semibold ml-1.5">
                    /{billingPeriod === "monthly" ? "month" : "year"}
                  </span>
                </div>

                <ul className="space-y-2.5 text-xs text-neutral-700 pt-2 border-t border-neutral-100">
                  <li className="flex items-center gap-2">✓ Unlimited Receipt Generation</li>
                  <li className="flex items-center gap-2">✓ Instant WhatsApp Share Now</li>
                  <li className="flex items-center gap-2">✓ Verifiable QR Codes on Receipts</li>
                  <li className="flex items-center gap-2">✓ Full Donor CRM & History</li>
                  <li className="flex items-center gap-2">✓ Pending Vargani Reminder Tracker</li>
                  <li className="flex items-center gap-2">✓ Multi-Device Volunteer Logins</li>
                  <li className="flex items-center gap-2">✓ PDF / JPG & CSV Export</li>
                </ul>
              </div>

              <Link
                href="/request-demo"
                className="w-full text-center py-3 rounded-xl border-2 border-maroon text-maroon hover:bg-maroon hover:text-white font-bold text-xs sm:text-sm transition-all"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Premium Plan */}
            <div className="bg-white rounded-3xl border-2 border-orange-brand/60 shadow-lg p-7 sm:p-8 flex flex-col justify-between space-y-6 relative overflow-hidden ring-2 ring-orange-brand/20">
              <div className="absolute top-0 right-0 bg-orange-brand text-white text-[9px] font-black uppercase tracking-wider px-3.5 py-1 rounded-bl-xl">
                Most Popular
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-black text-maroon-dark">Premium</h3>
                  <p className="text-xs text-orange-brand font-bold devanagari">प्रीमियम</p>
                  <p className="text-xs text-neutral-600 mt-1">Designed for large festival collection drives with automated WhatsApp delivery.</p>
                </div>

                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-neutral-800">₹</span>
                  <span className="text-4xl sm:text-5xl font-black text-neutral-900 tracking-tight">
                    {billingPeriod === "monthly" ? "199" : "1999"}
                  </span>
                  <span className="text-neutral-500 text-xs font-semibold ml-1.5">
                    /{billingPeriod === "monthly" ? "month" : "year"}
                  </span>
                </div>

                <ul className="space-y-2.5 text-xs text-neutral-700 pt-2 border-t border-neutral-100">
                  <li className="flex items-center gap-2 font-bold text-maroon">✓ Everything in Professional Plan</li>
                  <li className="flex items-center gap-2">✓ Auto WhatsApp Receipt Send</li>
                  <li className="flex items-center gap-2">✓ Up to 1,000 Auto Sends per month</li>
                  <li className="flex items-center gap-2">✓ Custom Deity Watermarks & Branding</li>
                  <li className="flex items-center gap-2">✓ Priority WhatsApp Technical Support</li>
                  <li className="flex items-center gap-2">✓ Advanced Audit & Financial Summary</li>
                </ul>
              </div>

              <Link
                href="/request-demo"
                className="w-full text-center py-3 rounded-xl bg-maroon hover:bg-maroon-light text-white font-bold text-xs sm:text-sm shadow-md transition-all"
              >
                Book Free Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 8. FAQ ACCORDION                                             */}
      {/* ============================================================ */}
      <section id="faq" className="py-16 md:py-24 bg-cream-brand/30 border-y border-maroon/10 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-maroon-dark tracking-tight">
              Frequently Asked Questions (वारंवार विचारले जाणारे प्रश्न)
            </h2>
            <p className="text-sm md:text-base font-semibold text-neutral-600">
              Clear answers for mandal presidents, treasurers, and volunteers
            </p>
          </div>

          <div className="space-y-3.5">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white border border-maroon/10 rounded-xl overflow-hidden shadow-xs">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between font-bold text-sm sm:text-base text-maroon-dark hover:bg-cream-brand/20 transition-colors"
                >
                  <span className="flex items-center gap-2.5 pr-2">
                    <HelpCircle className="w-4 h-4 text-orange-brand shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200 ${openFaq === idx ? "rotate-180" : ""}`} />
                </button>
                {openFaq === idx && (
                  <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-neutral-700 leading-relaxed font-medium border-t border-maroon/5 bg-cream-brand/10">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 9. BOTTOM DEMO & WHATSAPP CTA                                */}
      {/* ============================================================ */}
      <section className="py-16 md:py-20 bg-maroon text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-brand/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gold-brand/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative space-y-6">
          <h2 className="text-3xl md:text-5xl font-black text-cream-brand leading-tight">
            Ready to Digitize Your Collections?
          </h2>
          <p className="text-sm md:text-lg text-cream-brand/85 max-w-2xl mx-auto font-medium">
            Join hundreds of Ganesh Mandals, Temple Trusts, and NGOs across Maharashtra and India. Schedule a free demo call with our support specialists.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/request-demo"
              className="w-full sm:w-auto bg-orange-brand hover:bg-orange-light text-white font-bold text-sm sm:text-base px-8 py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group"
            >
              <span>Book Free Demo</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>

            <a
              href={generateDemoWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick("bottom_banner_whatsapp")}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base px-7 py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>WhatsApp: {displayPhone}</span>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
