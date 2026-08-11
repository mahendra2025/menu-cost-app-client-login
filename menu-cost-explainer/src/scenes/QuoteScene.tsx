import {Easing, Interactive, interpolate, useCurrentFrame} from "remotion";
import {Brand, SceneBackground} from "../shared";

export const QuoteScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <SceneBackground dark>
    <div style={{position: "absolute", left: 90, top: 72}}><Brand light /></div>
    <div style={{position: "absolute", left: 90, top: 250, width: 900}}>
      <Interactive.Div name="Final headline" style={{fontSize: 100, lineHeight: .98, letterSpacing: -6, fontWeight: 900, color: "white", opacity: interpolate(frame, [0, 24], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), translate: interpolate(frame, [0, 28], ["0px 40px", "0px 0px"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(.16,1,.3,1)})}}>Cost clearly.<br />Quote confidently.</Interactive.Div>
      <Interactive.Div name="Final subhead" style={{fontSize: 36, lineHeight: 1.35, color: "#aebbd0", marginTop: 30, maxWidth: 760, opacity: interpolate(frame, [20, 40], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}>Create a client-ready quotation from the same organized costing workflow.</Interactive.Div>
      <Interactive.Div name="Call to action" style={{display: "inline-flex", marginTop: 42, padding: "20px 30px", borderRadius: 999, backgroundColor: "#007aff", color: "white", fontSize: 25, fontWeight: 900, boxShadow: "0 18px 44px rgba(0,122,255,.38)", opacity: interpolate(frame, [42, 60], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), scale: interpolate(frame, [42, 66], [.76, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({damping: 170}), output: "perceptual-scale"})}}>Start your free costing →</Interactive.Div>
      <div style={{fontSize: 20, color: "#718096", marginTop: 24, fontWeight: 700}}>menu-costing.com</div>
    </div>
    <Interactive.Div name="Quotation document" style={{position: "absolute", right: 120, top: 110, width: 650, height: 850, padding: 52, borderRadius: 26, backgroundColor: "#fff", color: "#101828", boxShadow: "0 50px 120px rgba(0,0,0,.42)", rotate: interpolate(frame, [12, 42], ["8deg", "2deg"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(.16,1,.3,1)}), translate: interpolate(frame, [12, 46], ["130px 50px", "0px 0px"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(.16,1,.3,1)}), opacity: interpolate(frame, [12, 34], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}><Brand /><div style={{fontSize: 15, fontWeight: 900, color: "#007aff", letterSpacing: 2}}>QUOTATION</div></div>
      <div style={{height: 1, background: "#e4e7ec", margin: "38px 0"}} />
      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30}}><div><div style={{fontSize: 14, color: "#667085", fontWeight: 800}}>PREPARED FOR</div><div style={{fontSize: 27, fontWeight: 900, marginTop: 8}}>Shah Family</div></div><div><div style={{fontSize: 14, color: "#667085", fontWeight: 800}}>EVENT</div><div style={{fontSize: 27, fontWeight: 900, marginTop: 8}}>Royal Wedding</div></div></div>
      <div style={{marginTop: 42, padding: 26, borderRadius: 22, background: "#f4f7fb"}}><div style={{display: "flex", justifyContent: "space-between", fontSize: 18, color: "#667085"}}><span>450 covers × ₹650</span><span>₹2,92,500</span></div><div style={{height: 1, background: "#dfe5ec", margin: "22px 0"}} /><div style={{display: "flex", justifyContent: "space-between", fontSize: 27, fontWeight: 900}}><span>Grand total</span><span>₹2,92,500</span></div></div>
      <div style={{marginTop: 40}}><div style={{fontSize: 15, fontWeight: 900, color: "#667085"}}>INCLUDES</div>{['Complete wedding menu','Function-wise service','Staffing & event essentials'].map((x, i) => <div key={x} style={{display: "flex", gap: 12, marginTop: 18, fontSize: 19, fontWeight: 750, opacity: interpolate(frame, [54 + i * 10, 68 + i * 10], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}><span style={{color: "#34c759"}}>✓</span>{x}</div>)}</div>
      <div style={{position: "absolute", left: 52, right: 52, bottom: 44, fontSize: 14, color: "#98a2b3", display: "flex", justifyContent: "space-between"}}><span>Valid for 7 days</span><span>Generated with Menu Costing</span></div>
    </Interactive.Div>
  </SceneBackground>;
};
