import {Easing, Interactive, interpolate, useCurrentFrame} from "remotion";
import {BottomCaption, ReelBackground, ReelBrand} from "../ReelShared";

export const ReelHookScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <ReelBackground accent="orange">
      <ReelBrand />
      <div style={{position: "absolute", left: 80, right: 80, top: 330}}>
        <Interactive.Div name="Problem hook" style={{fontSize: 96, lineHeight: 1.02, letterSpacing: -5, fontWeight: 900, opacity: interpolate(frame, [0, 22], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), translate: interpolate(frame, [0, 25], ["0px 50px", "0px 0px"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(.16,1,.3,1)})}}>₹20 ki costing<br />mistake...</Interactive.Div>
        <Interactive.Div name="Guest multiplier" style={{fontSize: 48, color: "#aebbd0", marginTop: 42, fontWeight: 720, opacity: interpolate(frame, [22, 40], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}>1,000 guests ke event par</Interactive.Div>
      </div>
      <Interactive.Div name="Costing loss card" style={{position: "absolute", left: 80, right: 80, top: 780, height: 420, borderRadius: 48, display: "grid", placeItems: "center", backgroundColor: "#111a26", border: "1px solid rgba(255,255,255,.11)", boxShadow: "0 40px 100px rgba(0,0,0,.34)", opacity: interpolate(frame, [28, 46], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), scale: interpolate(frame, [28, 58], [.72, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({damping: 160}), output: "perceptual-scale"})}}>
        <div style={{textAlign: "center"}}>
          <div style={{fontSize: 34, color: "#9eacbd", fontWeight: 800}}>₹20 × 1,000 guests</div>
          <div style={{width: 700, height: 2, background: "rgba(255,255,255,.09)", margin: "34px auto"}} />
          <div style={{fontSize: 90, color: "#ff9f43", fontWeight: 950, letterSpacing: -4}}>₹20,000</div>
          <div style={{fontSize: 34, marginTop: 16, color: "#ffd29f", fontWeight: 800}}>ka difference</div>
        </div>
      </Interactive.Div>
      <BottomCaption>Quote bhejne se pehle real cost jaaniye.</BottomCaption>
    </ReelBackground>
  );
};
