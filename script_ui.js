const fs = require('fs');
const f = 'src/app/d/[orgId]/DonationClientFlow.tsx';
let txt = fs.readFileSync(f, 'utf8');

const uiReplacement = `
  if (paymentState === "uncertain") {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-6 text-center font-sans">
        <div
          style={{
            width: "100%",
            maxWidth: "500px",
            background: "#FFFDF9",
            borderRadius: "16px",
            boxShadow: "0 8px 30px rgba(139, 30, 45, 0.08)",
            border: "1px solid rgba(139, 30, 45, 0.15)",
            overflow: "hidden",
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "#8B1E2D",
              color: "#FFFFFF",
              padding: "36px 20px 28px",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#FFFDF9",
                border: "2px solid #F47C20",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: "28px",
                boxShadow: "0 4px 12px rgba(244, 124, 32, 0.3)",
              }}
            >
              ⏳
            </div>
            <h1 style={{ fontSize: "24px", fontWeight: 900, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
              Payment Status
            </h1>
            <p style={{ fontSize: "15px", color: "#FFFDF9", opacity: 0.9, margin: 0, fontWeight: 500 }}>
              Your payment status is being confirmed.
            </p>
            <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "4px", background: "linear-gradient(to right, #F47C20, #F2C94C)" }}></div>
          </div>

          <div style={{ padding: "32px 24px", color: "#374151", lineHeight: 1.6 }}>
            <button
              onClick={() => router.push(\`/receipt/\${receiptIdStr}\`)}
              style={{
                width: "100%",
                padding: "14px 24px",
                background: "#8B1E2D",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(139, 30, 45, 0.3)",
                transition: "all 0.2s ease-in-out",
                marginBottom: "12px"
              }}
            >
              Check Payment Status
            </button>
            <button
              onClick={() => setPaymentState("idle")}
              style={{
                width: "100%",
                padding: "14px 24px",
                background: "#FFFFFF",
                color: "#8B1E2D",
                border: "1px solid #8B1E2D",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (paymentState === "failed") {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-6 text-center font-sans">
        <div
          style={{
            width: "100%",
            maxWidth: "500px",
            background: "#FFFDF9",
            borderRadius: "16px",
            boxShadow: "0 8px 30px rgba(139, 30, 45, 0.08)",
            border: "1px solid rgba(139, 30, 45, 0.15)",
            overflow: "hidden",
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              color: "#374151",
              padding: "36px 20px 28px",
              position: "relative",
              borderBottom: "1px solid #E5E7EB"
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#FFFDF9",
                border: "2px solid #EF4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: "28px",
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.15)",
              }}
            >
              ❌
            </div>
            <h1 style={{ fontSize: "24px", fontWeight: 900, margin: "0 0 8px", letterSpacing: "-0.01em", color: "#111827" }}>
              Payment Not Completed
            </h1>
            <p style={{ fontSize: "15px", color: "#4B5563", margin: 0, fontWeight: 500 }}>
              Your payment could not be completed.
            </p>
          </div>

          <div style={{ padding: "32px 24px", color: "#374151", lineHeight: 1.6 }}>
            <button
              onClick={() => setPaymentState("idle")}
              style={{
                width: "100%",
                padding: "14px 24px",
                background: "#8B1E2D",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(139, 30, 45, 0.3)",
                transition: "all 0.2s ease-in-out",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
`;

txt = txt.replace('  return (\n    <div className="min-h-screen', uiReplacement + '    <div className="min-h-screen');
fs.writeFileSync(f, txt, 'utf8');
