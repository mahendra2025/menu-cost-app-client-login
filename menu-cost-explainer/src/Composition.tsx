import {Composition, Folder} from "remotion";
import {MenuCostExplainer} from "./MenuCostExplainer";
import {CostScene} from "./scenes/CostScene";
import {HookScene} from "./scenes/HookScene";
import {OrganizeScene} from "./scenes/OrganizeScene";
import {ProfitScene} from "./scenes/ProfitScene";
import {QuoteScene} from "./scenes/QuoteScene";
import {UploadScene} from "./scenes/UploadScene";
import {MenuCostingReel} from "./reel/MenuCostingReel";

export const MyComposition: React.FC = () => {
  return (
    <>
      <Folder name="Explainer-Scenes">
        <Composition id="Scene-01-Hook" component={HookScene} durationInFrames={135} fps={30} width={1920} height={1080} />
        <Composition id="Scene-02-Upload" component={UploadScene} durationInFrames={165} fps={30} width={1920} height={1080} />
        <Composition id="Scene-03-Organize" component={OrganizeScene} durationInFrames={165} fps={30} width={1920} height={1080} />
        <Composition id="Scene-04-Costs" component={CostScene} durationInFrames={165} fps={30} width={1920} height={1080} />
        <Composition id="Scene-05-Profit" component={ProfitScene} durationInFrames={165} fps={30} width={1920} height={1080} />
        <Composition id="Scene-06-Quote" component={QuoteScene} durationInFrames={150} fps={30} width={1920} height={1080} />
      </Folder>
      <Composition
        id="Menu-Costing-Explainer"
        component={MenuCostExplainer}
        durationInFrames={870}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Menu-Costing-Reel"
        component={MenuCostingReel}
        durationInFrames={720}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
