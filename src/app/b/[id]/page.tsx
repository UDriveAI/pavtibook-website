import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/firebase";
import BusinessCustomerPage from "./BusinessCustomerPage";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  let businessName = "PavtiBook Business";

  if (db) {
    try {
      const doc = await db.collection("business_public_links").doc(id).get();
      if (doc.exists) {
        businessName = doc.data()?.businessName || businessName;
      }
    } catch {
      // Ignore fallback
    }
  }

  return {
    title: `${businessName} — Digital Pavti | PavtiBook`,
    description: `Scan, bill, pay via UPI and get an instant Digital Pavti with PavtiBook at ${businessName}.`,
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;

  if (!db) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FFF6E8]">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-200 text-center max-w-md">
          <p className="text-red-700 font-semibold mb-2">सर्व्हर त्रुटी / Server Error</p>
          <p className="text-sm text-gray-600">
            डेटाबेस कनेक्शन उपलब्ध नाही. कृपया काही वेळाने पुन्हा प्रयत्न करा.
          </p>
        </div>
      </div>
    );
  }

  try {
    const pubSnap = await db.collection("business_public_links").doc(id).get();

    if (!pubSnap.exists) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#FFF6E8]">
          <div className="bg-white p-8 rounded-2xl shadow-md border border-amber-200 text-center max-w-md">
            <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              !
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              क्यूआर कोड सापडला नाही / QR Not Found
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              हा Business QR कोड अस्तित्वात नाही किंवा कालबाह्य झाला आहे. कृपया दुकानदाराशी संपर्क साधा.
            </p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 bg-[#8B1E2D] text-white rounded-xl font-medium text-sm hover:bg-[#721824] transition-colors"
            >
              पावतीबुक मुख्यपृष्ठ
            </Link>
          </div>
        </div>
      );
    }

    const pubData = pubSnap.data() || {};
    const orgId = pubData.organizationId;

    // Fetch active products if any
    let products: Array<{ id: string; name: string; price: number; category?: string }> = [];
    if (orgId) {
      const prodSnap = await db
        .collection("business_products")
        .where("organizationId", "==", orgId)
        .where("isActive", "==", true)
        .limit(100)
        .get();

      products = prodSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name || "",
          price: Number(d.price) || 0,
          category: d.category || undefined,
        };
      });
    }

    const business = {
      publicId: id,
      businessName: pubData.businessName || "PavtiBook Merchant",
      businessType: pubData.businessType || "व्यापार / Retail",
      city: pubData.city || "",
      logoUrl: pubData.logoUrl || null,
      upiId: pubData.upiId || "",
      upiMerchantName: pubData.upiMerchantName || pubData.businessName || "Merchant",
      isGstEnabled: pubData.isGstEnabled === true,
      gstPercentage: Number(pubData.gstPercentage) || 0,
    };

    return <BusinessCustomerPage business={business} initialProducts={products} />;
  } catch (error) {
    console.error("Error loading business public link:", error);
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FFF6E8]">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-200 text-center max-w-md">
          <p className="text-red-700 font-semibold mb-2">तात्पुरती अडचण / Temporary Issue</p>
          <p className="text-sm text-gray-600">
            माहिती लोड करताना अडचण आली. कृपया पेज रीलोड करा.
          </p>
        </div>
      </div>
    );
  }
}
