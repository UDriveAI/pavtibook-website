import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Phone, Mail, Clock, QrCode } from "lucide-react";
import { generateSupportWhatsAppLink, getFormattedWhatsAppDisplay } from "@/lib/whatsapp";

export default function Footer() {
  const whatsAppLink = generateSupportWhatsAppLink();
  const displayPhone = getFormattedWhatsAppDisplay();

  return (
    <footer className="bg-maroon-dark text-cream-brand/90 border-t border-gold-brand/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Brand Info & Mission */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <Image
                src="/images/Pavati-Book-Logo-White-Orange.png"
                alt="PavtiBook Logo"
                width={160}
                height={44}
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="text-xs sm:text-sm text-cream-brand/75 leading-relaxed font-light">
              PavtiBook is the premier digital collection platform for Ganesh Mandals, Temple Trusts, NGOs, and Housing Societies across India.
            </p>
            <div className="pt-1">
              <p className="text-xs text-gold-brand font-bold devanagari">
                पारंपारिक विश्वास. डिजिटल सोपेपणा.
              </p>
              <p className="text-[11px] text-cream-brand/50 mt-0.5">
                Traditional Trust. Digital Simplicity.
              </p>
            </div>
          </div>

          {/* Product & Solutions */}
          <div>
            <h3 className="text-gold-brand text-xs font-bold tracking-wider uppercase mb-4">
              Product & Features
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm font-medium">
              <li>
                <Link href="/features" className="hover:text-orange-brand transition-colors duration-200">
                  All Features
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-orange-brand transition-colors duration-200">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/#qr-verification" className="hover:text-orange-brand transition-colors duration-200 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-gold-brand" />
                  <span>QR Verification</span>
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-orange-brand transition-colors duration-200">
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link href="/download" className="hover:text-orange-brand transition-colors duration-200">
                  Download Mobile App
                </Link>
              </li>
              <li>
                <Link href="/request-demo" className="hover:text-orange-brand transition-colors duration-200 text-gold-brand font-semibold">
                  Book Free Demo →
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Governance */}
          <div>
            <h3 className="text-gold-brand text-xs font-bold tracking-wider uppercase mb-4">
              Legal & Trust
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm font-medium">
              <li>
                <Link href="/privacy" className="hover:text-orange-brand transition-colors duration-200">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-orange-brand transition-colors duration-200">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/delete-account" className="hover:text-orange-brand transition-colors duration-200">
                  Delete Account Data
                </Link>
              </li>
              <li>
                <Link href="/verify" className="hover:text-orange-brand transition-colors duration-200">
                  Public Receipt Registry
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-orange-brand transition-colors duration-200">
                  Help & Contact Desk
                </Link>
              </li>
            </ul>
          </div>

          {/* Official Support Details */}
          <div className="space-y-3.5">
            <h3 className="text-gold-brand text-xs font-bold tracking-wider uppercase mb-4">
              Support & Inquiries
            </h3>
            <div className="space-y-3 text-xs sm:text-sm font-light text-cream-brand/85">
              <a
                href={whatsAppLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 hover:text-emerald-400 transition-colors duration-200 font-medium"
              >
                <div className="p-1.5 rounded-md bg-emerald-600/20 text-emerald-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span>WhatsApp: {displayPhone}</span>
              </a>

              <a
                href={`tel:+${displayPhone.replace(/[^0-9]/g, "")}`}
                className="flex items-center gap-2.5 hover:text-orange-brand transition-colors duration-200"
              >
                <div className="p-1.5 rounded-md bg-maroon text-cream-brand">
                  <Phone className="w-4 h-4" />
                </div>
                <span>Call: {displayPhone}</span>
              </a>

              <a
                href="mailto:support@pavtibook.online"
                className="flex items-center gap-2.5 hover:text-orange-brand transition-colors duration-200"
              >
                <div className="p-1.5 rounded-md bg-maroon text-cream-brand">
                  <Mail className="w-4 h-4" />
                </div>
                <span>support@pavtibook.online</span>
              </a>

              <div className="flex items-start gap-2.5 pt-1.5 text-cream-brand/65 text-xs">
                <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Support Hours: Mon – Sat
                  <br />
                  9:00 AM – 7:00 PM IST
                </span>
              </div>
            </div>
          </div>

        </div>

        <hr className="border-gold-brand/15 my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-cream-brand/60 gap-3">
          <p>© {new Date().getFullYear()} PavtiBook. All rights reserved.</p>
          <div className="flex items-center gap-2 font-light">
            <span>Made with ❤️ for Indian Mandals, Temple Trusts & NGOs.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
