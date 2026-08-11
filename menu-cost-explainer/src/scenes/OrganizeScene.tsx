import {Easing, Interactive, interpolate, useCurrentFrame} from "remotion";
import {Brand, BrowserFrame, Headline, SceneBackground} from "../shared";

const functionData = [
  {time: "DAY 1 · 7:00 PM", title: "Welcome Dinner", guests: "300", dishes: "8 dishes", color: "#007aff"},
  {time: "DAY 2 · 8:00 AM", title: "Wedding Breakfast", guests: "240", dishes: "6 dishes", color: "#ff9500"},
  {time: "DAY 2 · 12:30 PM", title: "Wedding Lunch", guests: "450", dishes: "14 dishes", color: "#34c759"},
];

export const OrganizeScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <SceneBackground>
    <div style={{position: "absolute", left: 90, top: 72}}><Brand /></div>
    <div style={{position: "absolute", left: 90, top: 250}}><Headline eyebrow="One event, clearly organized" sub="Keep every day, meal, guest count, and dish list separate.">From full menu<br />to clear functions.</Headline></div>
    <Interactive.Div name="Functions interface" style={{position: "absolute", right: -40, top: 160, rotate: "1.5deg", opacity: interpolate(frame, [18, 40], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), translate: interpolate(frame, [18, 48], ["100px 0px", "0px 0px"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(.16,1,.3,1)})}}>
      <BrowserFrame title="menu-costing.com/app/event" width={1040} height={760}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}><div><div style={{fontSize: 18, color: "#007aff", fontWeight: 900}}>ROYAL WEDDING · AHMEDABAD</div><div style={{fontSize: 38, fontWeight: 900, marginTop: 8}}>Functions & guest counts</div></div><div style={{fontSize: 18, fontWeight: 850, color: "#16813a", background: "#eaf8ee", borderRadius: 999, padding: "12px 18px"}}>✓ Menu ready</div></div>
        <div style={{display: "grid", gap: 16, marginTop: 28}}>{functionData.map((item, i) => <div key={item.title} style={{height: 148, display: "grid", gridTemplateColumns: "14px 1fr 140px 130px", gap: 22, alignItems: "center", padding: "20px 24px", borderRadius: 24, background: "white", border: "1px solid rgba(15,23,42,.08)", boxShadow: "0 10px 26px rgba(15,23,42,.06)", opacity: interpolate(frame, [35 + i * 18, 54 + i * 18], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), translate: interpolate(frame, [35 + i * 18, 58 + i * 18], ["50px 0px", "0px 0px"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(.16,1,.3,1)})}}>
          <div style={{height: 92, borderRadius: 99, background: item.color}} />
          <div><div style={{fontSize: 14, color: "#667085", fontWeight: 850, letterSpacing: 1.2}}>{item.time}</div><div style={{fontSize: 28, fontWeight: 900, marginTop: 8}}>{item.title}</div></div>
          <div><div style={{fontSize: 14, color: "#667085", fontWeight: 750}}>GUESTS</div><div style={{fontSize: 34, fontWeight: 900, marginTop: 6}}>{item.guests}</div></div>
          <div style={{fontSize: 17, fontWeight: 800, borderRadius: 999, padding: "12px 14px", background: "#f2f4f7", textAlign: "center"}}>{item.dishes}</div>
        </div>)}</div>
      </BrowserFrame>
    </Interactive.Div>
  </SceneBackground>;
};
