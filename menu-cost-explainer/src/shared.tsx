import {AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame} from "remotion";

export const SceneBackground: React.FC<{children: React.ReactNode; dark?: boolean}> = ({children, dark = false}) => (
  <AbsoluteFill style={{background: dark ? "radial-gradient(circle at 14% 8%, #133966 0%, #0b111b 38%, #07090d 82%)" : "radial-gradient(circle at 10% 0%, #dceeff 0%, #f7f8fb 38%, #eef1f6 100%)", color: dark ? "#f8fbff" : "#111827", overflow: "hidden"}}>
    <div style={{position: "absolute", width: 520, height: 520, borderRadius: 999, right: -140, top: -190, background: dark ? "rgba(0,122,255,.13)" : "rgba(0,122,255,.11)", filter: "blur(4px)"}} />
    <div style={{position: "absolute", width: 390, height: 390, borderRadius: 999, left: -170, bottom: -210, background: "rgba(255,149,0,.12)"}} />
    {children}
  </AbsoluteFill>
);

export const Brand: React.FC<{light?: boolean}> = ({light = false}) => (
  <div style={{display: "flex", alignItems: "center", gap: 16, color: light ? "white" : "#111827"}}>
    <div style={{width: 58, height: 58, display: "grid", placeItems: "center", borderRadius: 18, background: "linear-gradient(135deg,#111827,#007aff)", color: "white", fontSize: 24, fontWeight: 900, boxShadow: "0 14px 30px rgba(0,122,255,.26)"}}>MC</div>
    <div style={{fontSize: 28, fontWeight: 850, letterSpacing: -1}}>Menu Costing</div>
  </div>
);

export const BrowserFrame: React.FC<{children: React.ReactNode; title: string; width?: number; height?: number}> = ({children, title, width = 1040, height = 690}) => (
  <div style={{width, height, borderRadius: 34, overflow: "hidden", background: "rgba(255,255,255,.94)", border: "1px solid rgba(15,23,42,.1)", boxShadow: "0 40px 100px rgba(15,23,42,.2)"}}>
    <div style={{height: 68, display: "flex", alignItems: "center", gap: 12, padding: "0 24px", background: "rgba(248,250,252,.96)", borderBottom: "1px solid rgba(15,23,42,.08)"}}>
      <i style={{width: 14, height: 14, borderRadius: 99, background: "#ff5f57"}} />
      <i style={{width: 14, height: 14, borderRadius: 99, background: "#ffbd2e"}} />
      <i style={{width: 14, height: 14, borderRadius: 99, background: "#28c840"}} />
      <div style={{marginLeft: 18, flex: 1, height: 38, borderRadius: 12, background: "#eef2f7", display: "grid", placeItems: "center", color: "#667085", fontSize: 16, fontStyle: "normal", fontWeight: 700}}>{title}</div>
    </div>
    <div style={{height: height - 68, padding: 34, background: "linear-gradient(145deg,#fbfbfd,#f3f5f8)"}}>{children}</div>
  </div>
);

export const Headline: React.FC<{eyebrow: string; children: React.ReactNode; sub?: string; light?: boolean}> = ({eyebrow, children, sub, light = false}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{maxWidth: 820}}>
      <Interactive.Div name="Eyebrow" style={{fontSize: 24, fontWeight: 900, color: "#1682ff", textTransform: "uppercase", letterSpacing: 4, opacity: interpolate(frame, [0, 16], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}>{eyebrow}</Interactive.Div>
      <Interactive.Div name="Headline" style={{marginTop: 20, fontSize: 92, lineHeight: 0.98, letterSpacing: -5, fontWeight: 900, color: light ? "#fff" : "#101828", opacity: interpolate(frame, [5, 26], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(.16,1,.3,1)}), translate: interpolate(frame, [5, 26], ["0px 34px", "0px 0px"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(.16,1,.3,1)})}}>{children}</Interactive.Div>
      {sub ? <Interactive.Div name="Supporting text" style={{marginTop: 28, maxWidth: 720, fontSize: 36, lineHeight: 1.3, color: light ? "#aebbd0" : "#667085", fontWeight: 520, opacity: interpolate(frame, [18, 40], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}>{sub}</Interactive.Div> : null}
    </div>
  );
};

export const Pill: React.FC<{children: React.ReactNode; tone?: "blue" | "green" | "orange"}> = ({children, tone = "blue"}) => (
  <div style={{display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 999, background: tone === "green" ? "rgba(52,199,89,.12)" : tone === "orange" ? "rgba(255,149,0,.12)" : "rgba(0,122,255,.11)", color: tone === "green" ? "#16813a" : tone === "orange" ? "#a35b00" : "#0067d8", fontWeight: 850, fontSize: 19}}>{children}</div>
);
