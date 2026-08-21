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
  MessageSquare
} from "lucide-react";
import { generateDemoWhatsAppLink, getFormattedWhatsAppDisplay } from "@/lib/whatsapp";
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

  const displayPhone = getFormattedWhatsAppDisplay();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const cleanMobile = mobile.replace(/\s+/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMsg("कृपया १० अंकी वैध मोबाईल नंबर प्रविष्ट करा. (Please enter a valid 10-digit Indian mobile number).");
      setLoading(false);
      return;
    }

    if (!name.trim() || !orgName.trim() || !city.trim()) {
      setErrorMsg("कृपया सर्व आवश्यक माहिती भरा. (Please fill in all required fields).");
      setLoading(false);
      return;
    }

    try {
      const res = await submitDemoRequest({
        name: name.trim(),
        mobile: cleanMobile,
        orgName: orgName.trim(),
        orgType,
        city: city.trim(),
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
      setErrorMsg("Network error. Please try again later or ping us on WhatsApp.");
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
            /* Success State: Traditional Receipt Pass Stamped 'Demo Booked' */
            <div className="max-w-md mx-auto text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="space-y-3">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle className="w-9 h-9" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-maroon-dark">
                  Demo Booked Successfully!
                </h2>
                <p className="text-xs sm:text-sm text-neutral-600 font-medium leading-relaxed">
                  We have generated your demo pass. A PavtiBook specialist will contact you on WhatsApp within 2 hours.
                </p>
              </div>

              {/* The Success Receipt Pass */}
              <div className="bg-[#FFFDF9] traditional-border p-6 shadow-xl relative text-neutral-800 text-left space-y-4 max-w-sm mx-auto overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] border-4 border-dashed border-emerald-600/80 text-emerald-700 font-black text-lg px-3 py-1.5 uppercase rounded tracking-widest pointer-events-none select-none z-10 devanagari">
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
                <a
                  href={generateDemoWhatsAppLink(orgName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackWhatsAppClick("demo_booking_success")}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Connect with Specialist on WhatsApp</span>
                </a>
              </div>
            </div>
          ) : (
            /* Request Demo Form */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              
              {/* Form Info Panel */}
              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-maroon/10 text-maroon text-xs font-bold uppercase tracking-wider">
                    Free 15-Min Walkthrough
                  </span>
                  <h1 className="text-3xl sm:text-4xl font-black text-maroon-dark tracking-tight leading-tight">
                    Schedule Your Free Demo
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-600 font-medium leading-relaxed">
                    Set up a 15-minute walkthrough with our collection specialists. We will help you configure your Mandal logo, setup UPI QR codes, and onboard volunteers.
                  </p>
                </div>

                <ul className="space-y-3.5">
                  {[
                    "Custom temple / mandal receipt styling",
                    "Multi-volunteer sub-account permissions",
                    "Direct bank P2P UPI QR setup",
                    "Complete accounting audit CSV export"
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2.5 text-xs text-neutral-700 font-bold">
                      <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="bg-cream-brand/60 border border-maroon/10 p-4 rounded-xl space-y-2">
                  <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Direct Assistance</p>
                  <a
                    href={generateDemoWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-bold text-emerald-700 hover:underline"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Or chat with us on WhatsApp ({displayPhone})</span>
                  </a>
                </div>
              </div>

              {/* Form Input Panel */}
              <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-maroon/10 shadow-md space-y-5">
                <h3 className="font-black text-lg text-maroon-dark border-b border-neutral-100 pb-3">
                  Organization & Contact Details
                </h3>

                {errorMsg && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold border border-red-200">
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
                    <label className="block text-xs font-bold text-neutral-700">
                      Your Name (नाव) <span className="text-red-500">*</span>
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
                        placeholder="e.g. Ramesh Patil"
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm outline-none focus:bg-white focus:border-maroon transition-colors"
                      />
                    </div>
                  </div>

                  {/* Mobile field */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-700">
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
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl pl-11 pr-3 py-2.5 text-xs sm:text-sm outline-none focus:bg-white focus:border-maroon transition-colors"
                      />
                    </div>
                    <p className="text-[10px] text-neutral-500">For demo pass & WhatsApp coordination.</p>
                  </div>

                  {/* Organization Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-700">
                      Mandal / Trust Name (मंडळ / ट्रस्टचे नाव) <span className="text-red-500">*</span>
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
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm outline-none focus:bg-white focus:border-maroon transition-colors"
                      />
                    </div>
                  </div>

                  {/* Organization Type & City */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-neutral-700">
                        Organization Type
                      </label>
                      <select
                        value={orgType}
                        onChange={(e) => setOrgType(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm outline-none focus:bg-white focus:border-maroon transition-colors font-medium"
                      >
                        <option value="Ganesh Mandal">Ganesh Mandal (गणेश मंडळ)</option>
                        <option value="Navratri Mandal">Navratri Mandal (नवरात्री मंडळ)</option>
                        <option value="Temple Trust">Temple Trust (मंदिर ट्रस्ट)</option>
                        <option value="NGO / Trust">NGO / Social Trust (सामाजिक संस्था)</option>
                        <option value="Housing Society">Housing Society (गृहनिर्माण संस्था)</option>
                        <option value="Other">Other / Local Group</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-neutral-700">
                        City / Town (शहर) <span className="text-red-500">*</span>
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
                          placeholder="e.g. Mumbai, Pune"
                          className="w-full bg-neutral-50 border border-neutral-300 rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm outline-none focus:bg-white focus:border-maroon transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Approx Receipts Per Month */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-700">
                      Approx. Receipts Expected
                    </label>
                    <select
                      value={receiptsPerMonth}
                      onChange={(e) => setReceiptsPerMonth(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm outline-none focus:bg-white focus:border-maroon transition-colors font-medium"
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
                    className="w-full bg-maroon hover:bg-maroon-light disabled:opacity-50 text-white font-bold text-xs sm:text-sm py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
                  >
                    {loading ? (
                      <span>Submitting... (नोंदणी होत आहे...)</span>
                    ) : (
                      <>
                        <span>Submit Free Demo Request</span>
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
