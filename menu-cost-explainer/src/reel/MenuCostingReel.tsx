import {TransitionSeries, linearTiming} from "@remotion/transitions";
import {fade} from "@remotion/transitions/fade";
import {slide} from "@remotion/transitions/slide";
import {ReelCostScene} from "./scenes/ReelCostScene";
import {ReelCtaScene} from "./scenes/ReelCtaScene";
import {ReelHookScene} from "./scenes/ReelHookScene";
import {ReelProfitScene} from "./scenes/ReelProfitScene";
import {ReelUploadScene} from "./scenes/ReelUploadScene";

export const MenuCostingReel: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={150} name="Hook">
      <ReelHookScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
    <TransitionSeries.Sequence durationInFrames={150} name="Upload menu">
      <ReelUploadScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({direction: "from-right"})} timing={linearTiming({durationInFrames: 15})} />
    <TransitionSeries.Sequence durationInFrames={150} name="Complete costing">
      <ReelCostScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
    <TransitionSeries.Sequence durationInFrames={150} name="Profit review">
      <ReelProfitScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({direction: "from-bottom"})} timing={linearTiming({durationInFrames: 15})} />
    <TransitionSeries.Sequence durationInFrames={180} name="Call to action">
      <ReelCtaScene />
    </TransitionSeries.Sequence>
  </TransitionSeries>
);
