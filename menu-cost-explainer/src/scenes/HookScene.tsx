import {Easing, Interactive, interpolate, useCurrentFrame} from "remotion";
import {Brand, SceneBackground} from "../shared";

const Sheet: React.FC<{label: string; color: string; x: number; y: number; rotate: number; delay: number}> = ({label, color, x, y, rotate, delay}) => {
  const frame = useCurrentFrame();
  return <Interactive.Div name={`${label} sheet`} style={{position: "absolute", left: x, top: y, width: 400, height: 260, padding: 30, borderRadius: 28, backgroundColor: "rgba(255,255,255,.95)", boxShadow: "0 30px 80px rgba(0,0,0,.28)", rotate: `${rotate}deg`, scale: interpolate(frame, [delay, delay + 22], [0.72, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({damping: 150}), output: "perceptual-scale"}), opacity: interpolate(frame, [delay, delay + 12], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}>
    <div style={{fontSize: 21, textTransform: "uppercase", letterSpacing: 3, color, fontWeight: 900}}>{label}</div>
    <div style={{height: 18, width: "74%", borderRadius: 8, background: "#e8edf4", marginTop: 30}} />
    <div style={{height: 18, width: "92%", borderRadius: 8, background: "#e8edf4", marginTop: 16}} />
    <div style={{height: 18, width: "61%", borderRadius: 8, background: "#e8edf4", marginTop: 16}} />
    <div style={{fontSize: 42, color: "#111827", fontWeight: 900, marginTop: 28}}>₹ ?</div>
  </Interactive.Div>;
};

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <SceneBackground dark>
    <div style={{position: "absolute", left: 90, top: 76}}><Brand light /></div>
    <div style={{position: "absolute", left: 90, top: 270, width: 940}}>
      <Interactive.Div name="Hook line one" style={{fontSize: 100, lineHeight: .98, letterSpacing: -6, fontWeight: 900, color: "white", opacity: interpolate(frame, [0, 22], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), translate: interpolate(frame, [0, 24], ["0px 40px", "0px 0px"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(.16,1,.3,1)})}}>Still guessing<br />your event cost?</Interactive.Div>
      <Interactive.Div name="Hook answer" style={{marginTop: 38, fontSize: 38, color: "#aebbd0", fontWeight: 560, opacity: interpolate(frame, [22, 42], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}>Spreadsheets hide the real margin.</Interactive.Div>
    </div>
    <div style={{position: "absolute", right: 20, top: 70, width: 790, height: 890, rotate: "-4deg"}}>
      <Sheet label="Food" color="#007aff" x={40} y={130} rotate={-8} delay={12} />
      <Sheet label="Manpower" color="#ff9500" x={260} y={300} rotate={7} delay={22} />
      <Sheet label="Extras" color="#34c759" x={110} y={520} rotate={-3} delay={32} />
    </div>
  </SceneBackground>;
};
