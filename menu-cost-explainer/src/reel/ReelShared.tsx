import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";

export const ReelBackground: React.FC<{children: React.ReactNode; accent?: "blue" | "orange"}> = ({children, accent = "blue"}) => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(circle at 85% 8%, #143861 0%, #0b111b 32%, #07090d 78%)",
      color: "#f8fbff",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      overflow: "hidden",
    }}
  >
    <div style={{position: "absolute", width: 620, height: 620, borderRadius: 999, right: -260, top: -210, background: accent === "orange" ? "rgba(255,149,0,.16)" : "rgba(0,122,255,.18)", filter: "blur(18px)"}} />
    <div style={{position: "absolute", width: 520, height: 520, borderRadius: 999, left: -290, bottom: -250, background: "rgba(255,149,0,.10)", filter: "blur(12px)"}} />
    {children}
  </AbsoluteFill>
);

export const ReelBrand: React.FC = () => (
  <Interactive.Div name="Menu Costing brand" style={{position: "absolute", left: 80, top: 92, display: "flex", alignItems: "center", gap: 18}}>
    <div style={{width: 74, height: 74, borderRadius: 22, display: "grid", placeItems: "center", background: "white", color: "#075cb8", fontSize: 31, fontWeight: 900, boxShadow: "0 16px 40px rgba(0,0,0,.24)"}}>MC</div>
    <div>
      <div style={{fontSize: 30, fontWeight: 900, letterSpacing: -1}}>MENU COSTING</div>
      <div style={{fontSize: 17, marginTop: 5, color: "#8fa0b7", fontWeight: 750, letterSpacing: 1.1}}>FOR CATERERS</div>
    </div>
  </Interactive.Div>
);

export const ReelTitle: React.FC<{eyebrow: string; children: React.ReactNode; sub: string}> = ({eyebrow, children, sub}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: "absolute", left: 80, right: 80, top: 245}}>
      <Interactive.Div name="Eyebrow" style={{fontSize: 24, fontWeight: 900, color: "#5da9ff", letterSpacing: 2.4, textTransform: "uppercase", opacity: interpolate(frame, [0, 12], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}>{eyebrow}</Interactive.Div>
      <Interactive.Div name="Headline" style={{fontSize: 92, lineHeight: 1.02, letterSpacing: -4.5, fontWeight: 900, marginTop: 22, opacity: interpolate(frame, [4, 24], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(.16,1,.3,1)}), translate: interpolate(frame, [4, 24], ["0px 34px", "0px 0px"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(.16,1,.3,1)})}}>{children}</Interactive.Div>
      <Interactive.Div name="Supporting caption" style={{fontSize: 38, lineHeight: 1.3, color: "#aebbd0", fontWeight: 650, marginTop: 28, opacity: interpolate(frame, [18, 38], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}>{sub}</Interactive.Div>
    </div>
  );
};

export const BottomCaption: React.FC<{children: React.ReactNode}> = ({children}) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div name="Bottom caption" style={{position: "absolute", left: 80, right: 80, bottom: 105, minHeight: 118, borderRadius: 30, display: "grid", placeItems: "center", padding: "24px 34px", textAlign: "center", backgroundColor: "rgba(10,18,29,.92)", border: "1px solid rgba(255,255,255,.12)", boxShadow: "0 24px 70px rgba(0,0,0,.34)", fontSize: 34, lineHeight: 1.25, fontWeight: 850, opacity: interpolate(frame, [35, 52], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), translate: interpolate(frame, [35, 55], ["0px 36px", "0px 0px"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(.16,1,.3,1)})}}>{children}</Interactive.Div>
  );
};

export const PhonePanel: React.FC<{children: React.ReactNode; title: string}> = ({children, title}) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div name={`${title} app screen`} style={{position: "absolute", left: 80, right: 80, top: 650, height: 980, borderRadius: 52, overflow: "hidden", backgroundColor: "#f7f9fc", color: "#101828", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 44px 120px rgba(0,0,0,.42)", opacity: interpolate(frame, [15, 34], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), scale: interpolate(frame, [15, 42], [.9, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({damping: 180}), output: "perceptual-scale"}), translate: interpolate(frame, [15, 42], ["0px 70px", "0px 0px"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(.16,1,.3,1)})}}>
      <div style={{height: 78, display: "flex", alignItems: "center", gap: 12, padding: "0 28px", background: "white", borderBottom: "1px solid #e6eaf0"}}>
        <i style={{width: 14, height: 14, borderRadius: 99, background: "#ff5f57"}} />
        <i style={{width: 14, height: 14, borderRadius: 99, background: "#ffbd2e"}} />
        <i style={{width: 14, height: 14, borderRadius: 99, background: "#28c840"}} />
        <div style={{marginLeft: 12, fontSize: 19, color: "#667085", fontWeight: 800}}>{title}</div>
      </div>
      <div style={{padding: 36}}>{children}</div>
    </Interactive.Div>
  );
};
