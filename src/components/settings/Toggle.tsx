export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: "40px",
        height: "22px",
        borderRadius: "999px",
        border: "none",
        cursor: "pointer",
        padding: "2px",
        display: "flex",
        alignItems: "center",
        transition: "background 0.2s",
        background: checked ? "#2563eb" : "rgba(15,23,42,0.12)",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          background: "#ffffff",
          boxShadow: "0 1px 3px rgba(15,23,42,0.2)",
          transition: "transform 0.2s",
          transform: checked ? "translateX(18px)" : "translateX(0)",
          display: "block",
        }}
      />
    </button>
  );
}
