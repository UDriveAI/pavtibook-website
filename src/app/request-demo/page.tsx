"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { submitDemoRequest } from "./actions";
import {
  Building,
  MapPin,
  User,
  CheckCircle,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { trackDemoRequest, trackWhatsAppClick } from "@/lib/analytics";

export default function RequestDemoPage() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("Ganesh Mandal");
  const [city, setCity] = useState("");
  const [receiptsPerMonth, setReceiptsPerMonth] = useState("100 - 500");
  const [honeypot, setHoneypot] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    // Basic mobile validation (Indian mobile format: 10 digits)
    const cleanMobile = mobile.replace(/\s+/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMsg("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
      setLoading(false);
      return;
    }

    if (!name || !orgName || !city) {
      setErrorMsg("Please fill in all the required fields.");
      setLoading(false);
      return;
    }

    try {
      const res = await submitDemoRequest({
        name,
        mobile: cleanMobile,
        orgName,
        orgType,
        city,
        receiptsPerMonth,
        honeypot,
      });

      if (res.success) {
        trackDemoRequest(orgName, orgType);
        setSubmitted(true);
      } else {
        setErrorMsg(res.message || "An error occurred. Please try again.");
      }
    } catch {
      setErrorMsg("Network error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-light font-sans text-neutral-800 flex flex-col justify-between">
      <Header />

      <main className="flex-1 pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {submitted ? (
            /* Success State: Animated Traditional Receipt Stamped 'Demo Booked' */
            <div className="max-w-md mx-auto text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="space-y-3">
                <div className="w-16 h-16 bg-green-brand/10 text-green-brand rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-maroon-dark">
                  Demo Booked Successfully!
                </h2>
                <p className="text-sm text-neutral-600 font-medium">
                  We have generated your demo pass. A PavtiBook specialist will contact you on WhatsApp within 2 hours.
                </p>
              </div>

              {/* The Success Receipt */}
              <div className="bg-[#FFFDF9] traditional-border p-6 shadow-xl relative text-neutral-800 text-left space-y-4 max-w-sm mx-auto overflow-hidden">
                {/* Diagonal stamp overlay */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] border-4 border-dashed border-green-brand/80 text-green-brand/80 font-black text-xl px-4 py-2 uppercase rounded tracking-widest pointer-events-none select-none z-10 devanagari">
                  बुक झाले / DEMO BOOKED
                </div>

                <div className="text-center text-[10px] font-bold text-maroon devanagari">
                  ॥ श्री गणेश प्रसन्न ॥
                </div>
                
                <div className="text-center font-bold text-maroon text-xs tracking-wide">
                  PAVTIBOOK DIGITAL RECEIPT
                </div>
                
                <hr className="border-maroon/20 my-2" />

                <div className="flex justify-between font-bold text-[10px] text-neutral-600">
                  <span>PASS: PB-DEMO-2026</span>
                  <span>Date: {new Date().toLocaleDateString("en-IN")}</span>
                </div>

                <div className="space-y-1.5 text-xs text-neutral-700 font-medium">
                  <div>
                    <span className="text-neutral-500">To:</span> <span className="font-bold text-neutral-800">{name}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Mandal:</span> <span className="font-bold text-neutral-800">{orgName} ({orgType})</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">City:</span> <span className="font-bold text-neutral-800">{city}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Volunteers:</span> <span className="font-bold text-neutral-800">Upto 5 Demo Accounts</span>
                  </div>
                </div>

                <div className="flex justify-between items-end pt-3">
                  <div className="bg-maroon/10 border border-maroon text-maroon px-3 py-1 font-bold text-xs rounded uppercase">
                    Free Demo
                  </div>
                  <div className="text-right text-[8px] text-neutral-500 italic">
                    <div className="font-bold text-neutral-800">Support Desk</div>
                    <span>PavtiBook India</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                {(() => {
                  const link = generateWhatsAppLink("नमस्कार PavtiBook Team, मला Demo पाहिजे आहे.");
                  if (link) {
                    return (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackWhatsAppClick("demo_booking_success")}
                        className="inline-flex items-center gap-2 bg-green-brand hover:bg-green-light text-white font-bold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        <span>Ping Us on WhatsApp</span>
                      </a>
                    );
                  }
                  return (
                    <div className="text-neutral-500 text-xs font-semibold">
                      WhatsApp Support Not Configured
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            /* Request Demo Form */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              
              {/* Form Info Panel */}
              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-3">
                  <h1 className="text-3xl font-black text-maroon-dark tracking-tight leading-tight">
                    Schedule Your Free Demo
                  </h1>
                  <p className="text-sm text-neutral-600 font-medium leading-relaxed">
                    Set up a 15-minute screen share with our collection specialists. We will help you design your template, configure UPI, and onboard volunteers.
                  </p>
                </div>

                <ul className="space-y-4">
                  {[
                    "Custom temple/mandal receipt styling",
                    "Volunteer sub-account permissions",
                    "Direct bank P2P UPI QR setup",
                    "Full accounting audit reporting features"
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2.5 text-xs text-neutral-700 font-bold">
                      <span className="h-5 w-5 rounded-full bg-orange-brand/10 text-orange-brand flex items-center justify-center shrink-0">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="bg-cream-brand/50 border border-maroon/10 p-4 rounded-xl space-y-2">
                  <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Mandal Security Guarantee</p>
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-700">
                    <ShieldCheck className="w-5 h-5 text-green-brand shrink-0" />
                    <span>Data protected by 256-bit isolation</span>
                  </div>
                </div>
              </div>

              {/* Form Input Panel */}
              <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-maroon/10 shadow-lg space-y-6">
                <h3 className="font-extrabold text-lg text-maroon-dark border-b border-neutral-100 pb-3">
                  Organization & Contact Details
                </h3>

                {errorMsg && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-semibold border border-red-200">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Honeypot field (spam prevention) */}
                  <div style={{ display: "none" }} aria-hidden="true">
                    <input
                      type="text"
                      name="email_confirm"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>
                  
                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter full name"
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:bg-white focus:border-maroon transition-colors duration-200 font-medium"
                      />
                    </div>
                  </div>

                  {/* Mobile field */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                      WhatsApp Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500 text-xs font-bold">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-lg pl-11 pr-3 py-2.5 text-sm outline-none focus:bg-white focus:border-maroon transition-colors duration-200 font-medium"
                      />
                    </div>
                    <p className="text-[10px] text-neutral-500 font-medium">For demo login and WhatsApp coordination.</p>
                  </div>

                  {/* Organization Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                      Mandal / Trust Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                        <Building className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g. Lalbaugcha Raja Ganesh Mandal"
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:bg-white focus:border-maroon transition-colors duration-200 font-medium"
                      />
                    </div>
                  </div>

                  {/* Organization Type */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                      Organization Type
                    </label>
                    <select
                      value={orgType}
                      onChange={(e) => setOrgType(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-maroon transition-colors duration-200 font-semibold"
                    >
                      <option value="Ganesh Mandal">Ganesh Mandal (गणेश मंडळ)</option>
                      <option value="Navratri Mandal">Navratri Mandal (नवरात्री मंडळ)</option>
                      <option value="Temple Trust">Temple Trust (मंदिर ट्रस्ट)</option>
                      <option value="NGO / Trust">NGO / Social Group (सामाजिक संस्था)</option>
                      <option value="Housing Society">Housing Society (गृहनिर्माण संस्था)</option>
                      <option value="Other">Other / Miscellaneous</option>
                    </select>
                  </div>

                  {/* City */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                      City / Town <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                        <MapPin className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Mumbai, Pune, Nagpur"
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:bg-white focus:border-maroon transition-colors duration-200 font-medium"
                      />
                    </div>
                  </div>

                  {/* Approx Receipts Per Month */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                      Approx. Receipts Generated Per Month
                    </label>
                    <select
                      value={receiptsPerMonth}
                      onChange={(e) => setReceiptsPerMonth(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-maroon transition-colors duration-200 font-semibold"
                    >
                      <option value="Under 100">Under 100 receipts</option>
                      <option value="100 - 500">100 to 500 receipts</option>
                      <option value="500 - 2000">500 to 2,000 receipts</option>
                      <option value="2000+">More than 2,000 receipts</option>
                    </select>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-maroon hover:bg-maroon-light disabled:bg-maroon/50 text-white font-bold text-base py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 mt-4 cursor-pointer"
                  >
                    {loading ? (
                      <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <span>Submit Demo Pass Request</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                </form>
              </div>

            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
