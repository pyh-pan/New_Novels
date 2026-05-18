import { z } from "zod";

import { caseSchema, nonEmptyString } from "../case/schema";

export const casePackageManifestSchema = z.object({
  schemaVersion: z.literal("case-package/v1"),
  caseId: nonEmptyString,
  title: nonEmptyString,
  language: nonEmptyString,
  entryChapterId: nonEmptyString,
  createdBy: nonEmptyString,
  source: z.object({
    title: nonEmptyString,
    author: nonEmptyString,
    rightsNote: nonEmptyString
  })
});

export const casePackageSchema = z
  .object({
    manifest: casePackageManifestSchema,
    caseFile: caseSchema
  })
  .superRefine((pkg, context) => {
    if (pkg.manifest.caseId !== pkg.caseFile.id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["manifest", "caseId"],
        message: "manifest.caseId must match caseFile.id"
      });
    }

    if (!pkg.caseFile.chapters.some((chapter) => chapter.id === pkg.manifest.entryChapterId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["manifest", "entryChapterId"],
        message: "entryChapterId must match a chapter id"
      });
    }
  });

export type CasePackageManifest = z.infer<typeof casePackageManifestSchema>;
export type CasePackage = z.infer<typeof casePackageSchema>;
