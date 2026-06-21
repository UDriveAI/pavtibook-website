import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Phone, Mail, Clock } from "lucide-react";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { trackWhatsAppClick } from "@/lib/analytics";

export default function Footer() {
  return (
    <footer className="bg-maroon-dark text-cream-brand/90 border-t border-gold-brand/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <Image
                src="/images/Pavati-Book-Logo-White-Orange.png"
                alt="PavtiBook Logo"
                width={150}
                height={40}
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="text-sm text-cream-brand/70 leading-relaxed font-light">
              PavtiBook simplifies receipt and donation management for Mandals, Trusts, NGOs, and Housing Societies across India.
            </p>
            <p className="text-xs text-gold-brand/80 font-semibold devanagari">
              पारंपारिक विश्वास. डिजिटल सोपेपणा.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-gold-brand text-sm font-bold tracking-wider uppercase mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm font-medium">
              <li>
                <Link href="/" className="hover:text-orange-brand transition-colors duration-200">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-orange-brand transition-colors duration-200">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-orange-brand transition-colors duration-200">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/download" className="hover:text-orange-brand transition-colors duration-200">
                  Download App
                </Link>
              </li>
              <li>
                <Link href="/request-demo" className="hover:text-orange-brand transition-colors duration-200">
                  Book Free Demo
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Pages */}
          <div>
            <h3 className="text-gold-brand text-sm font-bold tracking-wider uppercase mb-4">
              Legal & Support
            </h3>
            <ul className="space-y-2 text-sm font-medium">
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
                <Link href="/contact" className="hover:text-orange-brand transition-colors duration-200">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-4">
            <h3 className="text-gold-brand text-sm font-bold tracking-wider uppercase mb-2">
              Contact Us
            </h3>
            <div className="space-y-2 text-sm font-light text-cream-brand/80">
              {(() => {
                const link = generateWhatsAppLink("I am interested in PavtiBook");
                if (link) {
                  return (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackWhatsAppClick("footer")}
                      className="flex items-center gap-2 hover:text-green-light transition-colors duration-200"
                    >
                      <MessageSquare className="w-4 h-4 text-green-light shrink-0" />
                      <span>WhatsApp: +91 99305 33929</span>
                    </a>
                  );
                }
                return (
                  <div className="flex items-center gap-2 text-cream-brand/50 select-none cursor-not-allowed">
                    <MessageSquare className="w-4 h-4 text-neutral-500 shrink-0" />
                    <span className="text-[11px] font-semibold">WhatsApp Support Not Configured</span>
                  </div>
                );
              })()}
              <a
                href="tel:+919930533929"
                className="flex items-center gap-2 hover:text-orange-brand transition-colors duration-200"
              >
                <Phone className="w-4 h-4 shrink-0" />
                <span>Call: +91 99305 33929</span>
              </a>
              <a
                href="mailto:support@pavtibook.online"
                className="flex items-center gap-2 hover:text-orange-brand transition-colors duration-200"
              >
                <Mail className="w-4 h-4 shrink-0" />
                <span>support@pavtibook.online</span>
              </a>
              <div className="flex items-start gap-2 pt-1">
                <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-xs text-cream-brand/60 leading-tight">
                  Support Hours: Mon - Sat
                  <br />
                  9:00 AM - 7:00 PM IST
                </span>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-gold-brand/10 my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-cream-brand/50">
          <p>© {new Date().getFullYear()} PavtiBook. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 font-light">
            Made with ❤️ for Mandals & Trusts in India.
          </p>
        </div>
      </div>
    </footer>
  );
}
