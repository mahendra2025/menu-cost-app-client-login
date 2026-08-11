import {Easing, Interactive, interpolate, useCurrentFrame} from "remotion";
import {ReelBackground} from "../ReelShared";

export const ReelCtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <ReelBackground>
      <Interactive.Div name="Large logo" style={{position: "absolute", left: 410, top: 250, width: 260, height: 260, borderRadius: 76, display: "grid", placeItems: "center", backgroundColor: "white", color: "#075cb8", fontSize: 102, fontWeight: 950, boxShadow: "0 36px 100px rgba(0,122,255,.28)", opacity: interpolate(frame, [0, 22], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), scale: interpolate(frame, [0, 30], [.62, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({damping: 160}), output: "perceptual-scale"})}}>MC</Interactive.Div>
      <div style={{position: "absolute", left: 80, right: 80, top: 610, textAlign: "center"}}>
        <Interactive.Div name="CTA headline" style={{fontSize: 92, lineHeight: 1.02, fontWeight: 950, letterSpacing: -4.5, opacity: interpolate(frame, [18, 40], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), translate: interpolate(frame, [18, 42], ["0px 40px", "0px 0px"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(.16,1,.3,1)})}}>Apna next quote<br />cost karke bhejein.</Interactive.Div>
        <Interactive.Div name="Free offer" style={{fontSize: 42, color: "#b8c4d4", lineHeight: 1.35, marginTop: 38, fontWeight: 750, opacity: interpolate(frame, [38, 58], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}>First 5 costings FREE<br />No card required</Interactive.Div>
      </div>
      <Interactive.Div name="WhatsApp CTA" style={{position: "absolute", left: 80, right: 80, top: 1160, minHeight: 230, borderRadius: 42, display: "grid", placeItems: "center", textAlign: "center", backgroundColor: "#1478f2", boxShadow: "0 30px 90px rgba(20,120,242,.35)", opacity: interpolate(frame, [56, 76], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), scale: interpolate(frame, [56, 84], [.78, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({damping: 170}), output: "perceptual-scale"})}}><div><div style={{fontSize: 34, fontWeight: 900}}>WhatsApp “DEMO”</div><div style={{fontSize: 55, fontWeight: 950, marginTop: 16, letterSpacing: 2}}>73573 01137</div></div></Interactive.Div>
      <Interactive.Div name="Website and price" style={{position: "absolute", left: 80, right: 80, bottom: 160, textAlign: "center", fontSize: 30, color: "#8fa0b7", fontWeight: 800, opacity: interpolate(frame, [74, 94], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}>menu-costing.com · Pro ₹999/month</Interactive.Div>
    </ReelBackground>
  );
};
