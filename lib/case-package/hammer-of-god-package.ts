import { hammerOfGodCase } from "../case/hammer-of-god";
import { casePackageSchema } from "./schema";

export const hammerOfGodPackage = casePackageSchema.parse({
  manifest: {
    schemaVersion: "case-package/v1",
    caseId: "hammer-of-god",
    title: "钟楼下的锤击案",
    language: "zh-CN",
    entryChapterId: "chapter-1",
    createdBy: "new-novels-case-runtime",
    source: {
      title: "The Hammer of God",
      author: "G. K. Chesterton",
      rightsNote: "Public domain source adaptation"
    }
  },
  caseFile: hammerOfGodCase
});
