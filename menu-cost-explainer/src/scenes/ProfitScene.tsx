import {Easing, Interactive, interpolate, useCurrentFrame} from "remotion";
import {Brand, BrowserFrame, Headline, SceneBackground} from "../shared";

const stats = [
  {label: "COST / COVER", value: "₹450", note: "Total ₹2,02,500", color: "#007aff"},
  {label: "SELLING / COVER", value: "₹650", note: "Total ₹2,92,500", color: "#7c3aed"},
  {label: "TOTAL PROFIT", value: "₹90,000", note: "31% margin", color: "#34c759"},
];

export const ProfitScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <SceneBackground>
    <div style={{position: "absolute", left: 90, top: 72}}><Brand /></div>
    <div style={{position: "absolute", left: 90, top: 254}}><Headline eyebrow="Know before you quote" sub="Set the selling price, see your cost per cover, and protect your expected margin.">Price with<br />confidence.</Headline></div>
    <Interactive.Div name="Final costing interface" style={{position: "absolute", right: -50, top: 174, rotate: "-1.5deg", opacity: interpolate(frame, [16, 38], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), translate: interpolate(frame, [16, 46], ["100px 40px", "0px 0px"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(.16,1,.3,1)})}}>
      <BrowserFrame title="menu-costing.com/app/final-costing" width={1080} height={750}>
        <div style={{padding: 25, borderRadius: 28, background: "linear-gradient(135deg,#eaf8ee,#fff)", border: "1px solid rgba(52,199,89,.2)", display: "flex", justifyContent: "space-between", alignItems: "center"}}><div><div style={{fontSize: 15, color: "#16813a", fontWeight: 900, letterSpacing: 1.5}}>FINAL PRICE</div><div style={{fontSize: 34, fontWeight: 900, marginTop: 8}}>Final costing is complete</div></div><div style={{textAlign: "right"}}><div style={{fontSize: 16, color: "#667085", fontWeight: 750}}>TOTAL EVENT COST</div><div style={{fontSize: 40, fontWeight: 900, marginTop: 5}}>₹2,02,500</div></div></div>
        <div style={{display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 15, marginTop: 22}}>{stats.map((stat, i) => <div key={stat.label} style={{height: 190, padding: 22, borderRadius: 24, background: "white", border: "1px solid rgba(15,23,42,.08)", boxShadow: "0 10px 28px rgba(15,23,42,.06)", opacity: interpolate(frame, [42 + i * 14, 60 + i * 14], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), translate: interpolate(frame, [42 + i * 14, 64 + i * 14], ["0px 34px", "0px 0px"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(.16,1,.3,1)})}}><div style={{fontSize: 14, fontWeight: 900, letterSpacing: 1.2, color: stat.color}}>{stat.label}</div><div style={{fontSize: 42, fontWeight: 900, marginTop: 20, letterSpacing: -1.5}}>{stat.value}</div><div style={{fontSize: 16, color: "#667085", marginTop: 10, fontWeight: 700}}>{stat.note}</div></div>)}</div>
        <div style={{marginTop: 22, height: 155, padding: 24, borderRadius: 24, background: "white", border: "1px solid rgba(15,23,42,.08)"}}><div style={{display: "flex", justifyContent: "space-between"}}><div style={{fontSize: 18, fontWeight: 850}}>Expected profit margin</div><div style={{fontSize: 24, fontWeight: 900, color: "#16813a"}}>31%</div></div><div style={{height: 22, borderRadius: 999, background: "#edf0f4", marginTop: 24, overflow: "hidden"}}><div style={{height: "100%", width: `${interpolate(frame, [75, 115], [0, 76], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}%`, borderRadius: 999, background: "linear-gradient(90deg,#007aff,#34c759)"}} /></div></div>
      </BrowserFrame>
    </Interactive.Div>
  </SceneBackground>;
};
