import type { Metadata } from "next";
import { Poppins, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import PromoBanner from "@/components/PromoBanner";
import WhatsAppButton from "@/components/WhatsAppButton";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import MicrosoftClarity from "@/components/MicrosoftClarity";
import { Suspense } from "react";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "PavtiBook — Digital Receipts & Collection Management for Indian Mandals & Trusts",
    template: "%s | PavtiBook"
  },
  description: "PavtiBook is the premier digital collection platform for Ganesh Mandals, Temple Trusts, NGOs, and Housing Societies. Generate digital receipts, share instantly on WhatsApp, track donors, and manage pending collections. Traditional trust, digital efficiency.",
  keywords: [
    "Digital Receipt App",
    "Mandal Management App",
    "Trust Management Software",
    "Donation Receipt Software",
    "WhatsApp Receipt App",
    "Vargani Management App",
    "Temple Donation Software",
    "Pavti Book",
    "Pavati Book",
    "Digitizing Indian Collections"
  ],
  metadataBase: new URL("https://pavtibook.online"),
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "PavtiBook — Digital Receipts & Collection Management for Indian Mandals & Trusts",
    description: "Generate digital receipts, share instantly on WhatsApp, track donors, and manage pending collections for Ganesh Mandals, Temples, and NGOs.",
    url: "https://pavtibook.online",
    siteName: "PavtiBook",
    images: [
      {
        url: "/images/Pavati-Book-Logo-01.png",
        width: 1200,
        height: 630,
        alt: "PavtiBook Digital Collection Platform"
      }
    ],
    locale: "en_IN",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "PavtiBook — Digital Collection Management Platform",
    description: "Traditional trust, digital efficiency. Indian Mandals, Temple Trusts & NGO donation collections made easy.",
    images: ["/images/Pavati-Book-Logo-01.png"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // SoftwareApplication Schema
  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "PavtiBook",
    "operatingSystem": "Android, iOS, Web",
    "applicationCategory": "BusinessApplication, FinancialApplication",
    "offers": {
      "@type": "Offer",
      "price": "99",
      "priceCurrency": "INR"
    },
    "description": "Digital Receipt Book & Collection Management Platform for Indian Ganesh Mandals, Navratri Mandals, Temple Trusts, NGOs, and Housing Societies. Enables instant WhatsApp receipt sharing and UPI payments.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "1840"
    }
  };

  // Organization Schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "PavtiBook",
    "url": "https://pavtibook.online",
    "logo": "https://pavtibook.online/images/Pavati-Book-Logo.png",
    "sameAs": [
      "https://wa.me/919930533929"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+91-99305-33929",
      "contactType": "customer service",
      "areaServed": "IN",
      "availableLanguage": ["en", "mr", "hi"]
    }
  };

  // LocalBusiness Schema
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "PavtiBook",
    "image": "https://pavtibook.online/images/Pavati-Book-Logo-01.png",
    "@id": "https://pavtibook.online/#localbusiness",
    "url": "https://pavtibook.online",
    "telephone": "+919930533929",
    "priceRange": "₹₹",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Plot No. 171, Sector 21, Kamothe",
      "addressLocality": "Panvel",
      "addressRegion": "Maharashtra",
      "postalCode": "410209",
      "addressCountry": "IN"
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
      ],
      "opens": "09:00",
      "closes": "19:00"
    }
  };

  // FAQ Schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is PavtiBook and who is it for?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "PavtiBook is a digital receipt and collection management platform specifically designed for Indian festival committees (Ganesh/Navratri Mandals), Temple Trusts, NGOs, and Housing Societies. It replaces physical paper receipts with secure, instant digital receipts shared on WhatsApp."
        }
      },
      {
        "@type": "Question",
        "name": "Can we share receipts on WhatsApp with donor details?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Once you record a donation, PavtiBook automatically generates a PDF receipt and triggers a WhatsApp share dialogue so the receipt is sent directly to the donor's WhatsApp number in seconds."
        }
      },
      {
        "@type": "Question",
        "name": "Is donor data secure and private?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Absolutely. All donor and financial records are encrypted and stored in secure cloud systems. Each organization has fully isolated data boundaries using UUID level row isolation."
        }
      }
    ]
  };

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      </head>
      <body
        className={`${poppins.variable} ${devanagari.variable} antialiased font-sans bg-cream-light text-neutral-900 selection:bg-orange-brand/20 selection:text-maroon-dark`}
      >
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <MicrosoftClarity />
        <PromoBanner />
        {children}
        <WhatsAppButton />
      </body>
    </html>
  );
}

