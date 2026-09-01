import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Smartphone,
  CheckCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  MessageSquare
} from "lucide-react";
import { generateSupportWhatsAppLink, getFormattedWhatsAppDisplay } from "@/lib/whatsapp";

export default function DownloadPage() {
  const displayPhone = getFormattedWhatsAppDisplay();
  const whatsAppLink = generateSupportWhatsAppLink();

  return (
    <div className="min-h-screen bg-cream-light font-sans text-neutral-800 flex flex-col justify-between">
      <Header />

      <main className="flex-1 pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-10">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Official Release · Live on Store</span>
            </span>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-maroon-dark tracking-tight leading-tight">
              Download PavtiBook
            </h1>

            <p className="text-sm sm:text-base text-neutral-600 font-medium leading-relaxed">
              Manage collections, issue digital receipts and keep your mandal&apos;s records organized.
            </p>
          </div>

          {/* Download Platforms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto items-stretch">
            
            {/* Android Card (Live on Google Play) */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border-2 border-emerald-500/40 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                Live Now ✓
              </div>

              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 group-hover:scale-105 transition-transform">
                  <Smartphone className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-black text-neutral-900">
                    Android
                  </h2>
                  <p className="text-sm font-bold text-emerald-700">
                    Available on Google Play
                  </p>
                  <p className="text-xs text-neutral-500 pt-1 leading-relaxed">
                    Install the official app on any Android smartphone or tablet to create and issue digital receipts instantly.
                  </p>
                </div>
              </div>

              <div className="pt-6">
                <a
                  href="https://play.google.com/store/apps/details?id=com.pavtibook.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-maroon hover:bg-maroon-light text-white font-bold text-sm py-3.5 px-5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group-hover:bg-maroon-light"
                >
                  <span>Install App</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </div>

            {/* iOS Card (Coming Soon) */}
            <div className="bg-white/80 p-6 sm:p-7 rounded-3xl border border-neutral-200 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-500 flex items-center justify-center border border-neutral-200">
                  <Smartphone className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-neutral-900">
                      Apple iOS
                    </h2>
                    <span className="bg-orange-brand/10 text-orange-brand text-[10px] font-black uppercase px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Coming Soon</span>
                    </span>
                  </div>
                  <p className="text-sm font-bold text-neutral-600">
                    Apple App Store
                  </p>
                  <p className="text-xs text-neutral-500 pt-1 leading-relaxed">
                    The iOS version for iPhone and iPad is currently under review and will be available soon.
                  </p>
                </div>
              </div>

              <div className="pt-6">
                <div className="w-full bg-neutral-100 text-neutral-400 font-bold text-sm py-3.5 px-5 rounded-xl text-center cursor-not-allowed select-none border border-neutral-200">
                  Coming Soon for iOS
                </div>
              </div>
            </div>

          </div>

          {/* Quick Feature Highlights */}
          <div className="max-w-3xl mx-auto mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="bg-white/70 p-4 rounded-2xl border border-maroon/10 text-center space-y-1.5 shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs text-neutral-800">0% Commission UPI</h3>
              <p className="text-[11px] text-neutral-500">Donations go directly into your Mandal&apos;s bank account.</p>
            </div>

            <div className="bg-white/70 p-4 rounded-2xl border border-maroon/10 text-center space-y-1.5 shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-orange-brand/10 text-orange-brand flex items-center justify-center mx-auto">
                <CheckCircle className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs text-neutral-800">WhatsApp Receipts</h3>
              <p className="text-[11px] text-neutral-500">Share receipts to donor phones in under 3 seconds.</p>
            </div>

            <div className="bg-white/70 p-4 rounded-2xl border border-maroon/10 text-center space-y-1.5 shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-maroon/10 text-maroon flex items-center justify-center mx-auto">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs text-neutral-800">Secure Cloud Sync</h3>
              <p className="text-[11px] text-neutral-500">Encrypted records accessible to your team anywhere.</p>
            </div>
          </div>

          {/* Need Assistance Banner */}
          <div className="max-w-3xl mx-auto mt-8 bg-cream-brand/60 p-4 sm:p-5 rounded-2xl border border-maroon/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="space-y-0.5">
              <p className="text-xs sm:text-sm font-bold text-maroon-dark">Need help installing or setting up PavtiBook?</p>
              <p className="text-xs text-neutral-600">Our support specialists are available on WhatsApp to guide you.</p>
            </div>
            <a
              href={whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors shrink-0"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat on WhatsApp ({displayPhone})</span>
            </a>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
