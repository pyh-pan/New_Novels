import { readFile } from "node:fs/promises";
import { join } from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { POST } from "../app/api/cases/preview/route";

async function hammerZip(): Promise<File> {
  const root = join(process.cwd(), "cases", "hammer-of-god");
  const files = [
    "manifest.json",
    "case.json",
    "story/chapters.json",
    "story/chapter-1.md",
    "story/chapter-2.md",
    "story/chapter-3.md",
    "agents/global-context.json",
    "agents/general.json",
    "agents/wilfred.json",
    "agents/simeon.json",
    "agents/elizabeth.json",
    "agents/joe.json",
    "facts/facts.json",
    "acts/acts.json",
    "acts/gates.json",
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
      zip.file(`hammer-of-god/${filePath}`, await readFile(join(root, filePath), "utf8"));
    })
  );

  const buffer = await zip.generateAsync({ type: "uint8array" });
  return {
    name: "hammer-of-god.zip",
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
    const response = await POST(formRequest(await hammerZip()));

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      manifest: {
        schemaVersion: "case-package/v1",
        caseId: "hammer-of-god"
      },
      caseSummary: {
        id: "hammer-of-god",
        title: "钟楼下的锤击案",
        chapters: 3,
        agents: 5,
        acts: 3
      },
      issues: []
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
