import {Easing, Interactive, interpolate, useCurrentFrame} from "remotion";
import {Brand, Headline, Pill, SceneBackground} from "../shared";

const costs = [
  {icon: "◒", label: "Food", value: "₹1,48,500", color: "#007aff", delay: 28},
  {icon: "♟", label: "Manpower", value: "₹32,400", color: "#ff9500", delay: 42},
  {icon: "↗", label: "Transport", value: "₹12,000", color: "#7c3aed", delay: 56},
  {icon: "＋", label: "Event extras", value: "₹9,600", color: "#34c759", delay: 70},
];

export const CostScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <SceneBackground dark>
    <div style={{position: "absolute", left: 90, top: 72}}><Brand light /></div>
    <div style={{position: "absolute", left: 90, top: 254}}><Headline light eyebrow="Complete event costing" sub="Food, staffing, transport, fuel, disposables, and every event expense in one workflow.">See every cost.<br />Miss nothing.</Headline><div style={{marginTop: 38, opacity: interpolate(frame, [48, 70], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}><Pill tone="green">✓ Built for real catering events</Pill></div></div>
    <div style={{position: "absolute", right: 90, top: 168, width: 790, height: 750}}>
      {costs.map((item, i) => <Interactive.Div key={item.label} name={`${item.label} cost card`} style={{position: "absolute", left: i % 2 === 0 ? 0 : 400, top: Math.floor(i / 2) * 286, width: 370, height: 250, padding: 30, borderRadius: 30, backgroundColor: "rgba(255,255,255,.96)", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 28px 70px rgba(0,0,0,.26)", opacity: interpolate(frame, [item.delay, item.delay + 16], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), scale: interpolate(frame, [item.delay, item.delay + 24], [.65, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({damping: 160}), output: "perceptual-scale"}), translate: interpolate(frame, [item.delay, item.delay + 26], ["0px 40px", "0px 0px"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(.16,1,.3,1)})}}>
        <div style={{width: 66, height: 66, borderRadius: 20, display: "grid", placeItems: "center", background: `${item.color}18`, color: item.color, fontSize: 32, fontWeight: 900}}>{item.icon}</div>
        <div style={{fontSize: 20, color: "#667085", fontWeight: 800, marginTop: 22}}>{item.label}</div>
        <div style={{fontSize: 38, color: "#101828", fontWeight: 900, marginTop: 8, letterSpacing: -1.5}}>{item.value}</div>
      </Interactive.Div>)}
      <Interactive.Div name="Total cost" style={{position: "absolute", left: 80, bottom: 6, width: 630, height: 150, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 34px", borderRadius: 30, backgroundColor: "#007aff", color: "white", boxShadow: "0 26px 70px rgba(0,122,255,.38)", opacity: interpolate(frame, [92, 110], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), scale: interpolate(frame, [92, 116], [.8, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({damping: 180}), output: "perceptual-scale"})}}><div><div style={{fontSize: 18, fontWeight: 800, opacity: .8}}>TOTAL EVENT COST</div><div style={{fontSize: 24, fontWeight: 750, marginTop: 6}}>All expenses included</div></div><div style={{fontSize: 52, fontWeight: 900}}>₹2,02,500</div></Interactive.Div>
    </div>
  </SceneBackground>;
};
