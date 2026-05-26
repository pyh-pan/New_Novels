import CaseLibrary from "../components/CaseLibrary";
import { getCaseShelfItems } from "../lib/case/catalog";

export default function Page() {
  return <CaseLibrary cases={getCaseShelfItems()} />;
}
