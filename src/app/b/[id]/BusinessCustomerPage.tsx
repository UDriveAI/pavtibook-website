"use client";

import React, { useState } from "react";
import QRCode from "qrcode";
import { Plus, Trash2, CheckCircle2, ArrowRight, Share2, Printer, ExternalLink, RefreshCw } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  category?: string;
}

interface BusinessInfo {
  publicId: string;
  businessName: string;
  businessType: string;
  city: string;
  logoUrl: string | null;
  upiId: string;
  upiMerchantName: string;
  isGstEnabled: boolean;
  gstPercentage: number;
}

interface BillItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  productId?: string;
}

interface CreatedReceipt {
  id: string;
  receiptNumber: string;
  amount: number;
  subtotal: number;
  gstAmount: number | null;
  gstPercentage: number | null;
  paymentMode: string;
  paymentStatus: string;
  createdAt: string;
  donorName?: string;
  donorMobile?: string;
  items: Array<{ name: string; quantity: number; price: number; total: number }>;
}

export default function BusinessCustomerPage({
  business,
  initialProducts,
}: {
  business: BusinessInfo;
  initialProducts: Product[];
}) {
  const [items, setItems] = useState<BillItem[]>([]);
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemPrice, setItemPrice] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");

  const [paymentStep, setPaymentStep] = useState<"billing" | "payment" | "receipt">("billing");
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReceipt, setCreatedReceipt] = useState<CreatedReceipt | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subtotal and GST calculations
  const subtotal = Math.round(items.reduce((sum, it) => sum + it.total, 0) * 100) / 100;
  const gstRate = business.isGstEnabled ? business.gstPercentage : 0;
  const gstAmount = business.isGstEnabled && gstRate > 0
    ? Math.round(((subtotal * gstRate) / 100) * 100) / 100
    : 0;
  const grandTotal = Math.round((subtotal + gstAmount) * 100) / 100;

  // Handle product selection from catalogue
  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    if (!productId) {
      setItemName("");
      setItemPrice("");
      return;
    }
    const found = initialProducts.find((p) => p.id === productId);
    if (found) {
      setItemName(found.name);
      setItemPrice(found.price.toString());
    }
  };

  // Add Item to Bill
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const name = itemName.trim();
    const qty = parseFloat(itemQty) || 1;
    const price = parseFloat(itemPrice) || 0;

    if (!name) {
      setErrorMessage("कृपया वस्तूचे नाव टाका / Enter item name");
      return;
    }
    if (qty <= 0) {
      setErrorMessage("किमान प्रमाण १ असावे / Quantity must be greater than 0");
      return;
    }
    if (price < 0) {
      setErrorMessage("दर योग्य असावा / Price cannot be negative");
      return;
    }

    setErrorMessage(null);
    const lineTotal = Math.round(qty * price * 100) / 100;

    const newItem: BillItem = {
      id: Date.now().toString(),
      name,
      quantity: qty,
      price,
      total: lineTotal,
      productId: selectedProductId || undefined,
    };

    setItems((prev) => [...prev, newItem]);
    setItemName("");
    setItemQty("1");
    setItemPrice("");
    setSelectedProductId("");
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Generate UPI Intent URL
  const upiIntentUrl = business.upiId
    ? `upi://pay?pa=${business.upiId}&pn=${encodeURIComponent(
        business.upiMerchantName || business.businessName
      )}&am=${grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
        `PavtiBook Bill - ${business.businessName}`
      )}`
    : "";

  // Proceed to Payment screen
  const handleProceedToPay = async () => {
    if (items.length === 0) {
      setErrorMessage("बिल बनवण्यासाठी किमान एक वस्तू जोडा / Add at least 1 item");
      return;
    }
    setErrorMessage(null);

    // Generate UPI QR Code image
    if (upiIntentUrl) {
      try {
        const qr = await QRCode.toDataURL(upiIntentUrl, {
          width: 240,
          margin: 1,
          color: { dark: "#1f2937", light: "#ffffff" },
        });
        setUpiQrDataUrl(qr);
      } catch (err) {
        console.error("QR generation error:", err);
      }
    }

    setPaymentStep("payment");
  };

  // Create receipt on server
  const handleConfirmAndGenerateReceipt = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/business/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: business.publicId,
          items: items.map((it) => ({
            name: it.name,
            quantity: it.quantity,
            price: it.price,
            productId: it.productId,
          })),
          customerName: customerName.trim() || "Walk-in Customer",
          customerMobile: customerMobile.trim(),
          paymentMode: "upi",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "पावती तयार करता आली नाही / Failed to create receipt");
      }

      setCreatedReceipt(data.receipt);
      setPaymentStep("receipt");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "त्रुटी आली. कृपया पुन्हा प्रयत्न करा.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // WhatsApp Share receipt
  const handleShareWhatsApp = () => {
    if (!createdReceipt) return;
    const msg = `*${business.businessName} - खरेदी पावती*\n` +
      `पावती क्र.: ${createdReceipt.receiptNumber}\n` +
      `एकूण रक्कम: ₹${createdReceipt.amount}\n` +
      `दिनांक: ${new Date(createdReceipt.createdAt).toLocaleDateString("en-IN")}\n\n` +
      `पावती पाहण्यासाठी व पडताळण्यासाठी खालील लिंक उघडा:\n` +
      `https://pavtibook.online/receipt/${createdReceipt.id}\n\n` +
      `_पावतीबुक डिजिटल पावती प्रणालीद्वारे तयार करण्यात आलेली अधिकृत पावती._`;

    const cleanMobile = (createdReceipt.donorMobile || "").replace(/\D/g, "");
    const url = cleanMobile.length >= 10
      ? `https://api.whatsapp.com/send?phone=91${cleanMobile.slice(-10)}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#FFF6E8] text-[#2E1C0C] flex flex-col items-center p-3 sm:p-6">
      {/* Container */}
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-sm border border-[#F2C94C]/30 overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-[#8B1E2D] text-white p-5 text-center relative">
          <div className="text-[11px] uppercase tracking-wider text-[#F2C94C] font-semibold mb-1">
            PavtiBook Business · डिजिटल पावती
          </div>
          <h1 className="text-2xl font-bold">{business.businessName}</h1>
          {business.city && (
            <p className="text-xs text-white/80 mt-0.5">{business.city}</p>
          )}
          {business.businessType && (
            <span className="inline-block bg-white/15 text-[11px] px-2.5 py-0.5 rounded-full mt-2">
              {business.businessType}
            </span>
          )}
        </div>

        {/* STEP 1: BILLING FORM */}
        {paymentStep === "billing" && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-[#8B1E2D]">
                बिल तपशील / Your Bill
              </h2>
              <span className="text-xs text-gray-500">
                {items.length} {items.length === 1 ? "Item" : "Items"}
              </span>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {errorMessage}
              </div>
            )}

            {/* Add Item Box */}
            <form onSubmit={handleAddItem} className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/60 mb-5">
              <div className="text-xs font-semibold text-amber-900 mb-2">
                + वस्तू जोडा / Add Item
              </div>

              {/* Optional catalogue picker */}
              {initialProducts.length > 0 && (
                <div className="mb-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    aria-label="सूचीतील वस्तू निवडा"
                    className="w-full text-xs p-2 bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-[#8B1E2D]"
                  >
                    <option value="">-- सूचीतील वस्तू निवडा (वैकल्पिक) --</option>
                    {initialProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₹{p.price}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Manual inputs: Name, Qty, Rate */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="वस्तूचे नाव / Item name (उदा. साखर, चहा)"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-[#8B1E2D]"
                />

                <div className="flex gap-2">
                  <div className="w-1/3">
                    <input
                      type="number"
                      step="any"
                      placeholder="प्रमाण / Qty"
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-[#8B1E2D]"
                    />
                  </div>
                  <div className="w-2/3">
                    <input
                      type="number"
                      step="any"
                      placeholder="दर / Rate (₹)"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-[#8B1E2D]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="mt-3 w-full py-2 bg-[#8B1E2D] text-white text-xs font-semibold rounded-xl hover:bg-[#721824] transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus size={15} /> वस्तू बिलात जोडा (Add to Bill)
              </button>
            </form>

            {/* Itemized list */}
            {items.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs border border-dashed border-gray-200 rounded-2xl mb-5">
                कोणतीही वस्तू जोडलेली नाही. वरून वस्तू जोडा.
              </div>
            ) : (
              <div className="space-y-2 mb-5">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50/80 rounded-xl border border-gray-200/70 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-gray-500 text-[11px]">
                        {item.quantity} × ₹{item.price}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-gray-900">₹{item.total.toFixed(2)}</div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        aria-label={`वस्तू काढा: ${item.name}`}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bill Summary */}
            {items.length > 0 && (
              <div className="bg-amber-50/30 p-4 rounded-2xl border border-amber-200/50 mb-5 text-xs space-y-1.5">
                <div className="flex justify-between text-gray-600">
                  <span>उपएकूण / Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {business.isGstEnabled && gstRate > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>GST ({gstRate}%):</span>
                    <span>₹{gstAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-amber-200/70 pt-2 flex justify-between font-bold text-sm text-[#8B1E2D]">
                  <span>एकूण देय रक्कम / Total:</span>
                  <span className="text-base">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Optional Customer Information */}
            <div className="space-y-2 mb-5">
              <div className="text-xs font-semibold text-gray-700">
                ग्राहकाची माहिती (वैकल्पिक) / Customer Details
              </div>
              <input
                type="text"
                placeholder="आपले नाव / Your Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8B1E2D]"
              />
              <input
                type="tel"
                placeholder="व्हॉट्सॲप मोबाईल क्र. / WhatsApp Number"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8B1E2D]"
              />
            </div>

            {/* Pay Button */}
            <button
              type="button"
              disabled={items.length === 0}
              onClick={handleProceedToPay}
              className="w-full py-3.5 bg-[#8B1E2D] disabled:opacity-50 text-white font-bold rounded-2xl shadow-sm hover:bg-[#721824] transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <span>पेमेंट करा / Pay ₹{grandTotal.toFixed(2)}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 2: PAYMENT WITH DIRECT UPI & QR */}
        {paymentStep === "payment" && (
          <div className="p-5 text-center">
            <div className="text-xs uppercase tracking-wider text-amber-800 font-semibold mb-1">
              थेट व्यापारी पेमेंट / Direct Merchant UPI
            </div>
            <h2 className="text-xl font-bold text-[#8B1E2D] mb-4">
              ₹{grandTotal.toFixed(2)}
            </h2>

            {/* UPI QR Display */}
            {upiQrDataUrl ? (
              <div className="inline-block p-3 bg-white border-2 border-dashed border-[#8B1E2D]/40 rounded-2xl shadow-sm mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={upiQrDataUrl}
                  alt="UPI QR Code"
                  className="w-48 h-48 mx-auto object-contain"
                />
                <p className="text-[11px] text-gray-500 mt-2">
                  कोणत्याही UPI ॲपने स्कॅन करा (GPay / PhonePe / Paytm)
                </p>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-xl text-xs text-amber-800 mb-4">
                UPI तपशील उपलब्ध नाही. कृपया रोख पेमेंट करा किंवा दुकानदाराशी संपर्क साधा.
              </div>
            )}

            {/* Merchant UPI Details */}
            {business.upiId && (
              <div className="text-xs text-gray-600 mb-4 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <span>व्यापारी UPI ID: </span>
                <span className="font-mono font-bold text-gray-900">{business.upiId}</span>
              </div>
            )}

            {/* Click to open UPI Intent on mobile */}
            {upiIntentUrl && (
              <a
                href={upiIntentUrl}
                className="block w-full py-3 bg-[#2E7D6B] text-white font-bold rounded-2xl shadow-sm hover:bg-[#256657] transition-colors mb-3 text-sm"
              >
                UPI ॲपने त्वरित भरा (Open UPI App)
              </a>
            )}

            {/* Transparent Status Notice */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 text-left mb-5">
              <span className="font-bold">नोंद: </span>
              पेमेंट पूर्ण केल्यानंतर खालील &quot;पावती मिळवा&quot; बटण दाबा. डिजिटल पावती त्वरित तयार होईल व तिची पडताळणी प्रलंबित म्हणून नोंदवली जाईल.
            </div>

            {/* Generate Digital Pavti confirmation */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmAndGenerateReceipt}
              className="w-full py-3.5 bg-[#8B1E2D] disabled:opacity-50 text-white font-bold rounded-2xl shadow-sm hover:bg-[#721824] transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>पावती तयार होत आहे...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>पेमेंट झाले, पावती मिळवा (Generate Pavti)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setPaymentStep("billing")}
              className="mt-3 text-xs text-gray-500 hover:text-gray-800 underline"
            >
              ← बिलात बदल करा / Edit Bill
            </button>
          </div>
        )}

        {/* STEP 3: DIGITAL PAVTI CREATED */}
        {paymentStep === "receipt" && createdReceipt && (
          <div className="p-5 text-center">
            <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 size={28} />
            </div>

            <div className="text-xs font-semibold text-green-700 mb-1">
              पावती यशस्वीपणे तयार झाली!
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              ₹{createdReceipt.amount.toFixed(2)}
            </h2>
            <div className="text-xs text-gray-500 mb-4">
              पावती क्र.: <span className="font-mono font-bold text-gray-800">{createdReceipt.receiptNumber}</span>
            </div>

            {/* Honest Status Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[11px] font-medium mb-5">
              <span>●</span> पेमेंट सुरू झाले / Awaiting Merchant Confirmation
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200/60 text-left text-xs space-y-2 mb-5">
              <div className="flex justify-between text-gray-600">
                <span>दुकान:</span>
                <span className="font-semibold text-gray-900">{business.businessName}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>दिनांक:</span>
                <span>{new Date(createdReceipt.createdAt).toLocaleString("en-IN")}</span>
              </div>
              {createdReceipt.donorName && (
                <div className="flex justify-between text-gray-600">
                  <span>ग्राहक:</span>
                  <span>{createdReceipt.donorName}</span>
                </div>
              )}

              <div className="border-t border-amber-200/70 my-2 pt-2">
                <div className="font-semibold text-gray-700 mb-1">वस्तूंचा तपशील:</div>
                {createdReceipt.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-gray-600 text-[11px]">
                    <span>{it.name} ({it.quantity} × ₹{it.price})</span>
                    <span>₹{it.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-amber-200/70 pt-2 flex justify-between font-bold text-[#8B1E2D]">
                <span>एकूण रक्कम / Total:</span>
                <span>₹{createdReceipt.amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full py-3 bg-[#25D366] text-white font-bold rounded-2xl shadow-sm hover:bg-[#20b858] transition-colors flex items-center justify-center gap-2 text-xs"
              >
                <Share2 size={16} />
                <span>व्हॉट्सॲपवर पावती शेअर करा (Share WhatsApp)</span>
              </button>

              <a
                href={`/receipt/${createdReceipt.id}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 bg-[#8B1E2D] text-white font-bold rounded-2xl shadow-sm hover:bg-[#721824] transition-colors flex items-center justify-center gap-2 text-xs"
              >
                <ExternalLink size={16} />
                <span>अधिकृत पावती पहा (View Full Pavti)</span>
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-2xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-xs"
              >
                <Printer size={15} />
                <span>प्रिंट / Print</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setItems([]);
                setPaymentStep("billing");
                setCreatedReceipt(null);
              }}
              className="mt-5 text-xs text-[#8B1E2D] hover:underline font-semibold"
            >
              + नवीन बिल बनवा (New Bill)
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gray-50 p-3 text-center border-t border-gray-100 text-[11px] text-gray-500">
          Powered by <span className="font-bold text-[#8B1E2D]">PavtiBook</span> · भारताची डिजिटल पावती प्रणाली
        </div>
      </div>
    </div>
  );
}
