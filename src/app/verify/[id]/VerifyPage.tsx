"use client";

interface VerificationResult {
  isValid: boolean;
  receiptNumber?: string;
  donorName?: string;
  donorMobile?: string;
  amount?: number;
  purpose?: string;
  paymentMode?: string;
  paymentStatus?: string;
  date?: string;
  organizationName?: string;
  organizationType?: string;
  isOrganizationVerified?: boolean;
  message?: string;
  error?: boolean;
}

interface Props {
  token: string;
  result: VerificationResult;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function formatAmount(amount?: number): string {
  if (amount === undefined || amount === null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPaymentMode(mode?: string): string {
  if (!mode) return "—";
  const map: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    cheque: "Cheque",
    online: "Online",
    card: "Card",
    bank_transfer: "Bank Transfer",
  };
  return map[mode.toLowerCase()] ?? mode;
}

function formatPaymentStatus(status?: string): string {
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "10px 0",
        borderBottom: "1px solid rgba(139, 30, 45, 0.08)",
        gap: "12px",
      }}
    >
      <span
        style={{
          fontSize: "13px",
          color: "#6B6B6B",
          fontWeight: 500,
          flexShrink: 0,
          minWidth: "120px",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "14px",
          color: "#1A1A1A",
          fontWeight: 600,
          textAlign: "right",
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function VerifyPage({ token, result }: Props) {
  const isValid = result.isValid === true;
  const isError = result.error === true;

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(160deg, #FFF6E8 0%, #FFFBF5 60%, #FFF0D8 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "24px 16px 48px",
        fontFamily: "var(--font-sans, Poppins, sans-serif)",
      }}
    >
      {/* Logo Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "28px",
          marginTop: "8px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/Pavati-Book-Logo-01.png"
          alt="PavtiBook Logo"
          style={{ height: "36px", objectFit: "contain" }}
        />
      </div>

      {/* Verification Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#FFFFFF",
          borderRadius: "20px",
          border: isValid
            ? "2px solid rgba(46, 125, 107, 0.25)"
            : "2px solid rgba(139, 30, 45, 0.15)",
          boxShadow: "0 4px 32px rgba(139, 30, 45, 0.08)",
          overflow: "hidden",
        }}
      >
        {/* Status Header */}
        <div
          style={{
            padding: "24px 24px 20px",
            background: isValid
              ? "linear-gradient(135deg, #2E7D6B 0%, #3B9E88 100%)"
              : isError
              ? "linear-gradient(135deg, #8B6914 0%, #A07C1A 100%)"
              : "linear-gradient(135deg, #8B1E2D 0%, #A52A3A 100%)",
            textAlign: "center",
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              fontSize: "28px",
            }}
          >
            {isValid ? "✓" : isError ? "⚠" : "✕"}
          </div>

          <h1
            style={{
              color: "#FFFFFF",
              fontSize: "20px",
              fontWeight: 700,
              margin: "0 0 6px",
              letterSpacing: "0.01em",
            }}
          >
            {isValid ? "Receipt Verified" : isError ? "Service Unavailable" : "Invalid Receipt"}
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: "13px",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {isValid
              ? "This receipt is authentic and registered in PavtiBook."
              : isError
              ? "Verification service is temporarily unavailable. Please try again."
              : "This receipt token could not be found in the PavtiBook registry."}
          </p>
        </div>

        {/* Receipt Details (valid only) */}
        {isValid && (
          <div style={{ padding: "20px 24px 24px" }}>
            {/* Organization badge */}
            <div
              style={{
                background: "#FFF6E8",
                border: "1px solid rgba(139, 30, 45, 0.12)",
                borderRadius: "10px",
                padding: "12px 16px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "20px" }}>🏛️</span>
              <div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#8B1E2D",
                    lineHeight: 1.3,
                  }}
                >
                  {result.organizationName ?? "—"}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#888",
                    marginTop: "2px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  {result.organizationType ?? ""}
                  {result.isOrganizationVerified && (
                    <span
                      style={{
                        background: "#2E7D6B",
                        color: "#fff",
                        fontSize: "10px",
                        fontWeight: 600,
                        borderRadius: "4px",
                        padding: "1px 6px",
                      }}
                    >
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Amount spotlight */}
            <div
              style={{
                textAlign: "center",
                padding: "16px 0",
                marginBottom: "16px",
                borderBottom: "2px dashed rgba(139, 30, 45, 0.12)",
              }}
            >
              <div style={{ fontSize: "13px", color: "#888", fontWeight: 500 }}>
                Amount
              </div>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 800,
                  color: "#1A1A1A",
                  letterSpacing: "-0.02em",
                  marginTop: "4px",
                }}
              >
                {formatAmount(result.amount)}
              </div>
            </div>

            {/* Receipt Details */}
            <div>
              <DetailRow label="Receipt No." value={result.receiptNumber ?? "—"} />
              <DetailRow label="Donor" value={result.donorName ?? "—"} />
              <DetailRow label="Purpose" value={result.purpose ?? "—"} />
              <DetailRow
                label="Payment"
                value={`${formatPaymentMode(result.paymentMode)} · ${formatPaymentStatus(result.paymentStatus)}`}
              />
              <DetailRow label="Date" value={formatDate(result.date)} />
            </div>

            {/* Verified seal */}
            <div
              style={{
                marginTop: "20px",
                padding: "12px 16px",
                background: "rgba(46, 125, 107, 0.06)",
                borderRadius: "10px",
                border: "1px solid rgba(46, 125, 107, 0.2)",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "#2E7D6B",
                  fontWeight: 600,
                }}
              >
                🔒 {result.message}
              </span>
            </div>
          </div>
        )}

        {/* Invalid state footer */}
        {!isValid && !isError && (
          <div
            style={{
              padding: "24px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "#888",
                lineHeight: 1.6,
                margin: "0 0 8px",
              }}
            >
              Token scanned:{" "}
              <code
                style={{
                  background: "#F5F5F5",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  wordBreak: "break-all",
                }}
              >
                {token}
              </code>
            </p>
            <p style={{ fontSize: "12px", color: "#AAA", margin: 0 }}>
              If you believe this is an error, contact the issuing organization.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "28px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "12px", color: "#AAA", margin: "0 0 4px" }}>
          Powered by
        </p>
        <a
          href="https://pavtibook.online"
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#8B1E2D",
            textDecoration: "none",
          }}
        >
          PavtiBook
        </a>
        <p style={{ fontSize: "11px", color: "#CCC", marginTop: "4px" }}>
          Digital Receipt & Collection Management
        </p>
      </div>
    </main>
  );
}
