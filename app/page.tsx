import InvestigationDesk from "../components/InvestigationDesk";
import StoryPane from "../components/StoryPane";

export default function Page() {
  return <InvestigationDesk storySlot={<StoryPane />} />;
}
