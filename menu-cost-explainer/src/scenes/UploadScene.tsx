import {Easing, Interactive, interpolate, useCurrentFrame} from "remotion";
import {Brand, BrowserFrame, Headline, Pill, SceneBackground} from "../shared";

export const UploadScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <SceneBackground>
    <div style={{position: "absolute", left: 90, top: 72}}><Brand /></div>
    <div style={{position: "absolute", left: 90, top: 248}}>
      <Headline eyebrow="Start in seconds" sub="PDF, menu photo, or pasted text—no rebuilding the menu line by line.">Upload the<br />complete menu.</Headline>
      <div style={{marginTop: 40, opacity: interpolate(frame, [45, 65], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}><Pill>✦ Smart menu detection</Pill></div>
    </div>
    <Interactive.Div name="Menu upload interface" style={{position: "absolute", right: -70, top: 174, rotate: "-2deg", scale: interpolate(frame, [18, 52], [.82, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({damping: 180}), output: "perceptual-scale"}), translate: interpolate(frame, [18, 52], ["70px 40px", "0px 0px"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(.16,1,.3,1)})}}>
      <BrowserFrame title="menu-costing.com/app/event" width={1020} height={740}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "start"}}>
          <div><div style={{fontSize: 18, fontWeight: 900, color: "#007aff", textTransform: "uppercase", letterSpacing: 2}}>Step 1 of 6</div><div style={{fontSize: 42, fontWeight: 900, letterSpacing: -2, marginTop: 10}}>Event & menu</div></div>
          <div style={{padding: "12px 18px", borderRadius: 999, background: "#eaf4ff", color: "#0067d8", fontSize: 17, fontWeight: 850}}>300 guests</div>
        </div>
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 30}}>
          {[['01','Upload PDF or photo','We detect menu text automatically'],['02','Paste menu text','Use an email or WhatsApp menu']].map(([no,title,sub], i) => <div key={no} style={{padding: 22, minHeight: 128, borderRadius: 22, border: i === 0 ? "2px solid rgba(0,122,255,.42)" : "1px dashed rgba(15,23,42,.18)", background: i === 0 ? "linear-gradient(145deg,#eaf4ff,#fff)" : "white", opacity: interpolate(frame, [38 + i * 12, 56 + i * 12], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}><div style={{fontSize: 14, color: "#007aff", fontWeight: 900}}>{no}</div><div style={{fontSize: 23, fontWeight: 850, marginTop: 10}}>{title}</div><div style={{fontSize: 16, color: "#667085", marginTop: 8}}>{sub}</div></div>)}
        </div>
        <div style={{marginTop: 20, padding: 24, borderRadius: 24, background: "white", border: "1px solid rgba(15,23,42,.08)"}}>
          <div style={{fontSize: 15, color: "#667085", fontWeight: 800}}>DETECTED MENU</div>
          <div style={{display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16}}>{['Paneer Tikka','Hara Bhara Kebab','Dal Fry','Jeera Rice','Butter Naan','Gulab Jamun'].map((dish, i) => <div key={dish} style={{padding: "10px 14px", borderRadius: 999, background: i < 4 ? "#eef6ff" : "#f2f4f7", color: "#344054", fontSize: 16, fontWeight: 750, opacity: interpolate(frame, [65 + i * 6, 80 + i * 6], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), scale: interpolate(frame, [65 + i * 6, 82 + i * 6], [.75, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({damping: 160}), output: "perceptual-scale"})}}>{dish}</div>)}</div>
        </div>
      </BrowserFrame>
    </Interactive.Div>
  </SceneBackground>;
};
