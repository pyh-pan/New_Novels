import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST } from "../app/api/cases/preview/route";
import { clearGeneratedStudioCases, getGeneratedStudioCase } from "../lib/studio/generated-cases";

let dataDir = "";

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), "new-novels-preview-"));
  process.env.NEW_NOVELS_DATA_DIR = dataDir;
  clearGeneratedStudioCases();
});

afterEach(() => {
  clearGeneratedStudioCases();
  delete process.env.NEW_NOVELS_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

async function huntersLodgeZip(): Promise<File> {
  const root = join(process.cwd(), "cases", "hunters-lodge");
  const files = [
    "manifest.json",
    "case.json",
    "story/chapters.json",
    "story/chapter-1.md",
    "story/chapter-2.md",
    "story/chapter-3.md",
    "agents/global-context.json",
    "agents/general.json",
    "agents/japp.json",
    "agents/middleton.json",
    "agents/poirot.json",
    "agents/roger.json",
    "agents/zoe.json",
    "facts/facts.json",
    "acts/acts.json",
    "acts/gates.json",
    "events/story-events.json",
    "scenes/scenes.json",
    "clues/clues.json",
    "relationships/relationships.json",
    "propagation/rules.json",
    "contradictions/contradictions.json",
    "truth/truth.json",
    "victims/victims.json",
    "accusation/questions.json"
  ];
  const zip = new JSZip();

  await Promise.all(
    files.map(async (filePath) => {
      zip.file(`hunters-lodge/${filePath}`, await readFile(join(root, filePath), "utf8"));
    })
  );

  const buffer = await zip.generateAsync({ type: "uint8array" });
  return {
    name: "hunters-lodge.zip",
    arrayBuffer: async () => buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    )
  } as File;
}

function formRequest(file?: File): Request {
  return {
    formData: async () => ({
      get: (key: string) => (key === "file" ? file : undefined)
    })
  } as Request;
}

describe("/api/cases/preview", () => {
  it("validates and summarizes a case package zip", async () => {
    const response = await POST(formRequest(await huntersLodgeZip()));

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      manifest: {
        schemaVersion: "case-package/v1",
        caseId: "hunters-lodge"
      },
      draftCaseId: "import-hunters-lodge",
      status: "draft",
      caseSummary: {
        id: "import-hunters-lodge",
        title: "猎人小屋疑案",
        chapters: 3,
        agents: 6,
        acts: 3
      },
      issues: []
    });
    expect(getGeneratedStudioCase("import-hunters-lodge")).toMatchObject({
      status: "draft",
      caseFile: {
        id: "import-hunters-lodge",
        title: "猎人小屋疑案"
      }
    });

    const draftDir = join(dataDir, "studio-drafts", "import-hunters-lodge");
    expect(existsSync(join(draftDir, "package", "manifest.json"))).toBe(true);
    expect(existsSync(join(draftDir, "validation-report.json"))).toBe(true);
    expect(existsSync(join(draftDir, "adaptation-notes.md"))).toBe(true);
    expect(JSON.parse(readFileSync(join(draftDir, "studio.json"), "utf8"))).toMatchObject({
      origin: "uploaded-package",
      skill: {
        name: "new-novels-case-adapter"
      }
    });
  });

  it("returns structured issues when no zip file is uploaded", async () => {
    const response = await POST(formRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      issues: [
        {
          severity: "fatal",
          code: "missing-file",
          filePath: "upload"
        }
      ]
    });
  });
});
