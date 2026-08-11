import {Easing, Interactive, interpolate, useCurrentFrame} from "remotion";
import {BottomCaption, ReelBackground, ReelBrand, ReelTitle} from "../ReelShared";

const items = [
  {label: "Food cost", value: "₹1,48,500", color: "#4a9cff"},
  {label: "Manpower", value: "₹32,400", color: "#ffb24a"},
  {label: "Transport", value: "₹12,000", color: "#9b7cff"},
  {label: "Event extras", value: "₹9,600", color: "#45db8a"},
];

export const ReelCostScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <ReelBackground>
      <ReelBrand />
      <ReelTitle eyebrow="Complete costing" sub="Food se lekar fuel aur disposables tak—sab ek jagah.">Har cost<br />add karein.</ReelTitle>
      <div style={{position: "absolute", left: 80, right: 80, top: 710, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22}}>
        {items.map((item, i) => <Interactive.Div key={item.label} name={`${item.label} card`} style={{height: 280, padding: 30, borderRadius: 34, backgroundColor: "rgba(255,255,255,.96)", color: "#101828", border: "1px solid rgba(255,255,255,.16)", boxShadow: "0 28px 70px rgba(0,0,0,.24)", opacity: interpolate(frame, [24 + i * 12, 40 + i * 12], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), scale: interpolate(frame, [24 + i * 12, 48 + i * 12], [.72, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({damping: 170}), output: "perceptual-scale"})}}>
          <div style={{width: 66, height: 66, borderRadius: 20, background: `${item.color}22`, display: "grid", placeItems: "center", color: item.color, fontSize: 30, fontWeight: 900}}>₹</div>
          <div style={{fontSize: 23, color: "#667085", fontWeight: 800, marginTop: 27}}>{item.label}</div>
          <div style={{fontSize: 40, fontWeight: 950, marginTop: 12, letterSpacing: -1.5}}>{item.value}</div>
        </Interactive.Div>)}
      </div>
      <Interactive.Div name="Total event cost" style={{position: "absolute", left: 80, right: 80, top: 1320, height: 170, borderRadius: 34, padding: "0 36px", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#1478f2", boxShadow: "0 28px 70px rgba(20,120,242,.34)", opacity: interpolate(frame, [80, 100], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}><div><div style={{fontSize: 20, fontWeight: 900, opacity: .78}}>TOTAL EVENT COST</div><div style={{fontSize: 26, fontWeight: 750, marginTop: 9}}>All expenses included</div></div><div style={{fontSize: 52, fontWeight: 950}}>₹2,02,500</div></Interactive.Div>
      <BottomCaption>Koi hidden expense miss nahi hoga.</BottomCaption>
    </ReelBackground>
  );
};
