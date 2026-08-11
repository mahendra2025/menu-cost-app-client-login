import {Interactive, interpolate, useCurrentFrame} from "remotion";
import {BottomCaption, PhonePanel, ReelBackground, ReelBrand, ReelTitle} from "../ReelShared";

export const ReelUploadScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <ReelBackground>
      <ReelBrand />
      <ReelTitle eyebrow="Step 1" sub="PDF, photo ya pasted text—menu dobara type karne ki zaroorat nahi.">Menu upload<br />karein.</ReelTitle>
      <PhonePanel title="menu-costing.com/app/event">
        <div style={{fontSize: 20, color: "#1478f2", fontWeight: 900, letterSpacing: 1.5}}>EVENT & MENU</div>
        <div style={{fontSize: 42, fontWeight: 900, marginTop: 12}}>Royal Wedding</div>
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 30}}>
          <Interactive.Div name="Upload option" style={{height: 190, padding: 24, borderRadius: 26, backgroundColor: "#eaf4ff", border: "2px solid rgba(0,122,255,.36)", opacity: interpolate(frame, [35, 52], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}><div style={{fontSize: 18, color: "#1478f2", fontWeight: 900}}>01</div><div style={{fontSize: 27, marginTop: 16, fontWeight: 900}}>Upload PDF<br />or photo</div></Interactive.Div>
          <Interactive.Div name="Paste option" style={{height: 190, padding: 24, borderRadius: 26, backgroundColor: "white", border: "1px dashed #c9d1dc", opacity: interpolate(frame, [42, 59], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}><div style={{fontSize: 18, color: "#1478f2", fontWeight: 900}}>02</div><div style={{fontSize: 27, marginTop: 16, fontWeight: 900}}>Paste menu<br />text</div></Interactive.Div>
        </div>
        <div style={{marginTop: 24, padding: 26, borderRadius: 28, background: "white", border: "1px solid #e3e7ed"}}>
          <div style={{fontSize: 18, color: "#667085", fontWeight: 900}}>DETECTED DISHES</div>
          <div style={{display: "flex", flexWrap: "wrap", gap: 12, marginTop: 20}}>{["Paneer Tikka","Dal Fry","Jeera Rice","Butter Naan","Gulab Jamun"].map((dish, i) => <div key={dish} style={{padding: "13px 17px", borderRadius: 999, background: i < 3 ? "#eef6ff" : "#f1f3f6", fontSize: 20, fontWeight: 800, opacity: interpolate(frame, [58 + i * 7, 72 + i * 7], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}>{dish}</div>)}</div>
        </div>
      </PhonePanel>
      <BottomCaption>Menu detect hoga. Aap sirf review karein.</BottomCaption>
    </ReelBackground>
  );
};
