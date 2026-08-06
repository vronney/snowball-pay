import Image from "next/image";

interface DashboardLoadingScreenProps {
  label?: string;
}

export default function DashboardLoadingScreen({
  label = "Loading your dashboard...",
}: DashboardLoadingScreenProps) {
  return (
    <>
      <style>{`
        @keyframes db-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes db-fade-up {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes db-pulse-soft {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.05); }
        }
        @keyframes db-bar-shimmer {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(120%); }
        }
        @keyframes db-dot {
          0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, #fbfdff 0%, #f4f7fb 48%, #eef3f8 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            borderRadius: "28px",
            padding: "8px",
            border: "1px solid rgba(15,23,42,0.08)",
            background: "rgba(255,255,255,0.72)",
            boxShadow: "0 18px 44px rgba(15,23,42,0.1)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            position: "relative",
            zIndex: 1,
            animation: "db-fade-up 0.75s cubic-bezier(0.32,0.72,0,1)",
          }}
        >
          <div
            style={{
              borderRadius: "22px",
              background: "#ffffff",
              border: "1px solid rgba(15,23,42,0.1)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
              padding: "30px 24px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <Image src="/logo-dark.svg" alt="SnowballPay" width={154} height={30} priority />

            <div style={{ height: "16px" }} />

            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "999px",
                border: "3px solid rgba(37,99,235,0.18)",
                borderTopColor: "#2563eb",
                animation: "db-spin 0.85s linear infinite",
                flexShrink: 0,
              }}
            />

            <p
              style={{
                margin: "14px 0 0",
                fontSize: "14px",
                fontWeight: 700,
                color: "#334155",
                letterSpacing: "0.01em",
              }}
            >
              {label}
            </p>

            <div
              style={{
                marginTop: "16px",
                width: "100%",
                maxWidth: "220px",
                height: "8px",
                borderRadius: "999px",
                background: "rgba(15,23,42,0.08)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "45%",
                  borderRadius: "999px",
                  background: "linear-gradient(90deg, #2563eb, #1d4ed8)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
                  animation: "db-bar-shimmer 1.5s linear infinite",
                }}
              />
            </div>

            <div
              style={{
                marginTop: "14px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "999px",
                  background: "#2563eb",
                  animation: "db-dot 1s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "999px",
                  background: "#2563eb",
                  animation: "db-dot 1s ease-in-out 0.15s infinite",
                }}
              />
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "999px",
                  background: "#2563eb",
                  animation: "db-dot 1s ease-in-out 0.3s infinite",
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "20px",
            fontSize: "12px",
            color: "#94a3b8",
            fontWeight: 600,
            letterSpacing: "0.04em",
            zIndex: 1,
          }}
        >
          Secure session check in progress
        </div>
      </div>
    </>
  );
}
