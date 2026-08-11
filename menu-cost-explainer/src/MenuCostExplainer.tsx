import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { CostScene } from "./scenes/CostScene";
import { HookScene } from "./scenes/HookScene";
import { OrganizeScene } from "./scenes/OrganizeScene";
import { ProfitScene } from "./scenes/ProfitScene";
import { QuoteScene } from "./scenes/QuoteScene";
import { UploadScene } from "./scenes/UploadScene";

export const MenuCostExplainer: React.FC = () => {
  return (
    <TransitionSeries
      style={{
        scale: 2.057,
      }}
    >
      <TransitionSeries.Sequence durationInFrames={135} name="The problem">
        <HookScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={165} name="Upload a menu">
        <UploadScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence
        durationInFrames={165}
        name="Organize functions"
      >
        <OrganizeScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={165} name="See every cost">
        <CostScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={165} name="Review profit">
        <ProfitScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={150} name="Create the quote">
        <QuoteScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
