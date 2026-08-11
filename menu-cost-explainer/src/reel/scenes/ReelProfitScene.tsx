import {Easing, Interactive, interpolate, useCurrentFrame} from "remotion";
import {BottomCaption, PhonePanel, ReelBackground, ReelBrand, ReelTitle} from "../ReelShared";

export const ReelProfitScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <ReelBackground>
      <ReelBrand />
      <ReelTitle eyebrow="Before you quote" sub="Selling price set karein aur expected margin turant dekhein.">Profit clearly<br />dekhein.</ReelTitle>
      <PhonePanel title="menu-costing.com/app/final-costing">
        <div style={{padding: 26, borderRadius: 28, background: "linear-gradient(135deg,#eaf8ee,#fff)", border: "1px solid rgba(52,199,89,.22)"}}><div style={{fontSize: 18, color: "#16813a", fontWeight: 900}}>FINAL COSTING COMPLETE</div><div style={{display: "flex", justifyContent: "space-between", marginTop: 16}}><span style={{fontSize: 26, fontWeight: 850}}>Event cost</span><strong style={{fontSize: 35}}>₹2,02,500</strong></div></div>
        <div style={{display: "grid", gap: 18, marginTop: 24}}>
          {[{label:"COST / COVER",value:"₹450",color:"#1478f2",delay:34},{label:"SELLING / COVER",value:"₹650",color:"#7c3aed",delay:48},{label:"EXPECTED PROFIT",value:"₹90,000",color:"#16813a",delay:62}].map((stat) => <Interactive.Div key={stat.label} name={`${stat.label} stat`} style={{height: 150, borderRadius: 26, padding: "24px 28px", backgroundColor: "white", border: "1px solid #e3e7ed", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: interpolate(frame, [stat.delay, stat.delay + 18], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), translate: interpolate(frame, [stat.delay, stat.delay + 24], ["40px 0px", "0px 0px"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(.16,1,.3,1)})}}><div style={{fontSize: 20, color: stat.color, fontWeight: 900, letterSpacing: 1}}>{stat.label}</div><div style={{fontSize: 43, fontWeight: 950}}>{stat.value}</div></Interactive.Div>)}
        </div>
        <div style={{marginTop: 26, padding: 28, borderRadius: 28, background: "white", border: "1px solid #e3e7ed"}}><div style={{display: "flex", justifyContent: "space-between", fontSize: 22, fontWeight: 850}}><span>Expected margin</span><strong style={{fontSize: 28, color: "#16813a"}}>31%</strong></div><div style={{height: 24, borderRadius: 999, background: "#eef1f5", marginTop: 24, overflow: "hidden"}}><div style={{height: "100%", width: `${interpolate(frame, [72, 112], [0, 76], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}%`, borderRadius: 999, background: "linear-gradient(90deg,#1478f2,#45db8a)"}} /></div></div>
      </PhonePanel>
      <BottomCaption>Cost clear. Margin clear. Quote confident.</BottomCaption>
    </ReelBackground>
  );
};
