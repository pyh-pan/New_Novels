import InvestigationDesk from "../components/InvestigationDesk";
import StoryReader from "../components/StoryReader";

export default function Page() {
  return (
    <InvestigationDesk
      storySlot={(storyProps) => <StoryReader {...storyProps} />}
    />
  );
}
