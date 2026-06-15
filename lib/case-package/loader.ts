import { readdirSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { ZodError } from "zod";

import type { CaseAgent, CaseFileInput, StoryChapter } from "../case/schema";
import { casePackageSchema, type CasePackage } from "./schema";

export type CasePackageIssue = {
  severity: "fatal" | "warning" | "suggestion";
  code: string;
  filePath: string;
  fieldPath?: string;
  message: string;
  suggestion: string;
};

export type CasePackageValidationReport = {
  ok: boolean;
  issues: CasePackageIssue[];
};

type CasePackageFileReader = {
  readJson<T>(filePath: string): T;
  readText(filePath: string): string;
  listFiles(directory: string): string[];
};

class DirectoryCasePackageReader implements CasePackageFileReader {
  constructor(private readonly directory: string) {}

  readJson<T>(filePath: string): T {
    return readJsonFileSync(this.directory, filePath);
  }

  readText(filePath: string): string {
    return readTextFileSync(this.directory, filePath);
  }

  listFiles(directory: string): string[] {
    return readdirSync(join(this.directory, directory));
  }
}

class MemoryCasePackageReader implements CasePackageFileReader {
  constructor(private readonly files: Map<string, string>) {}

  readJson<T>(filePath: string): T {
    const raw = this.files.get(filePath);
    if (raw === undefined) {
      throw new Error(`Missing required package file: ${filePath}`);
    }
    return JSON.parse(raw) as T;
  }

  readText(filePath: string): string {
    const raw = this.files.get(filePath);
    if (raw === undefined) {
      throw new Error(`Missing required package file: ${filePath}`);
    }
    return raw;
  }

  listFiles(directory: string): string[] {
    const prefix = `${directory.replace(/\/$/u, "")}/`;
    return [...this.files.keys()]
      .filter((filePath) => filePath.startsWith(prefix))
      .map((filePath) => filePath.slice(prefix.length))
      .filter((fileName) => fileName.length > 0 && !fileName.includes("/"));
  }
}

async function readJsonFile<T>(directory: string, filePath: string): Promise<T> {
  const raw = await readFile(join(directory, filePath), "utf8");
  return JSON.parse(raw) as T;
}

async function readTextFile(directory: string, filePath: string): Promise<string> {
  return readFile(join(directory, filePath), "utf8");
}

function readJsonFileSync<T>(directory: string, filePath: string): T {
  const raw = readFileSync(join(directory, filePath), "utf8");
  return JSON.parse(raw) as T;
}

function readTextFileSync(directory: string, filePath: string): string {
  return readFileSync(join(directory, filePath), "utf8");
}

function missingFileIssue(filePath: string): CasePackageIssue {
  return {
    severity: "fatal",
    code: "missing-file",
    filePath,
    message: `Required file ${filePath} was not found.`,
    suggestion: `Add ${filePath} to the case package directory.`
  };
}

function schemaIssues(error: ZodError): CasePackageIssue[] {
  return error.issues.map((issue) => ({
    severity: "fatal",
    code: issue.code,
    filePath: "case.json",
    fieldPath: issue.path.join("."),
    message: issue.message,
    suggestion: "Update the package data so it satisfies case-package/v1."
  }));
}

function parseUnknownError(error: unknown, directory: string): CasePackageIssue {
  const message = error instanceof Error ? error.message : "Unknown package loading error.";
  const fileMatch = message.match(/open '([^']+)'/);
  const filePath = fileMatch?.[1] ? relative(directory, fileMatch[1]) : "case.json";

  if (message.includes("ENOENT")) {
    return missingFileIssue(filePath);
  }

  return {
    severity: "fatal",
    code: "read-error",
    filePath,
    message,
    suggestion: "Check that the case package file exists and contains valid JSON."
  };
}

export async function loadCasePackageFromDirectory(directory: string): Promise<CasePackage> {
  const manifest = await readJsonFile(directory, "manifest.json");
  const caseFile = await loadCaseFileFromSplitDirectory(directory);

  return casePackageSchema.parse({ manifest, caseFile });
}

export function loadCasePackageFromDirectorySync(directory: string): CasePackage {
  return loadCasePackageFromReader(new DirectoryCasePackageReader(directory));
}

export function loadCasePackageFromFiles(files: Map<string, string>): CasePackage {
  return loadCasePackageFromReader(new MemoryCasePackageReader(files));
}

function loadCasePackageFromReader(reader: CasePackageFileReader): CasePackage {
  const manifest = reader.readJson("manifest.json");
  const caseFile = loadCaseFileFromReader(reader);

  return casePackageSchema.parse({ manifest, caseFile });
}

async function loadCaseFileFromSplitDirectory(directory: string): Promise<CaseFileInput> {
  const baseCase = await readJsonFile<CaseFileInput>(directory, "case.json");
  const chapterIndex = await readJsonFile<
    Array<Omit<StoryChapter, "body"> & { body: string }>
  >(directory, "story/chapters.json");
  const chapters = await Promise.all(
    chapterIndex.map(async (chapter) => ({
      ...chapter,
      body: await readTextFile(directory, chapter.body)
    }))
  );
  const agentFiles = (await readdir(join(directory, "agents")))
    .filter((fileName) => fileName.endsWith(".json") && fileName !== "global-context.json")
    .sort();
  const agents = await Promise.all(
    agentFiles.map((fileName) => readJsonFile<CaseAgent>(directory, `agents/${fileName}`))
  );
  const globalContext = await readJsonFile<CaseFileInput["globalContext"]>(
    directory,
    "agents/global-context.json"
  );
  const acts = await readJsonFile<CaseFileInput["acts"]>(directory, "acts/acts.json");
  const actGates = await readJsonFile<CaseFileInput["actGates"]>(
    directory,
    "acts/gates.json"
  );
  const storyEvents = await readJsonFile<CaseFileInput["storyEvents"]>(
    directory,
    "events/story-events.json"
  );
  const facts = await readJsonFile<CaseFileInput["facts"]>(directory, "facts/facts.json");
  const scenes = await readJsonFile<CaseFileInput["scenes"]>(directory, "scenes/scenes.json");
  const clues = await readJsonFile<CaseFileInput["clues"]>(directory, "clues/clues.json");
  const questions = await readJsonFile<CaseFileInput["accusation"]["questions"]>(
    directory,
    "accusation/questions.json"
  );
  const relationships = await readJsonFile<CaseFileInput["relationships"]>(
    directory,
    "relationships/relationships.json"
  );
  const propagationRules = await readJsonFile<CaseFileInput["propagationRules"]>(
    directory,
    "propagation/rules.json"
  );
  const contradictions = await readJsonFile<CaseFileInput["contradictions"]>(
    directory,
    "contradictions/contradictions.json"
  );
  const truth = await readJsonFile<CaseFileInput["truth"]>(directory, "truth/truth.json");
  const victims = await readJsonFile<CaseFileInput["victims"]>(
    directory,
    "victims/victims.json"
  );

  return {
    ...baseCase,
    globalContext,
    chapters,
    acts,
    actGates,
    storyEvents,
    scenes,
    facts,
    relationships,
    propagationRules,
    contradictions,
    truth,
    victims,
    agents,
    clues,
    accusation: {
      ...baseCase.accusation,
      questions
    }
  };
}

function loadCaseFileFromReader(reader: CasePackageFileReader): CaseFileInput {
  const baseCase = reader.readJson<CaseFileInput>("case.json");
  const chapterIndex = reader.readJson<
    Array<Omit<StoryChapter, "body"> & { body: string }>
  >("story/chapters.json");
  const chapters = chapterIndex.map((chapter) => ({
    ...chapter,
    body: reader.readText(chapter.body)
  }));
  const agentFiles = reader
    .listFiles("agents")
    .filter((fileName) => fileName.endsWith(".json") && fileName !== "global-context.json")
    .sort();

  return {
    ...baseCase,
    globalContext: reader.readJson("agents/global-context.json"),
    chapters,
    acts: reader.readJson("acts/acts.json"),
    actGates: reader.readJson("acts/gates.json"),
    storyEvents: reader.readJson("events/story-events.json"),
    scenes: reader.readJson("scenes/scenes.json"),
    facts: reader.readJson("facts/facts.json"),
    relationships: reader.readJson("relationships/relationships.json"),
    propagationRules: reader.readJson("propagation/rules.json"),
    contradictions: reader.readJson("contradictions/contradictions.json"),
    truth: reader.readJson("truth/truth.json"),
    victims: reader.readJson("victims/victims.json"),
    agents: agentFiles.map((fileName) =>
      reader.readJson<CaseAgent>(`agents/${fileName}`)
    ),
    clues: reader.readJson("clues/clues.json"),
    accusation: {
      ...baseCase.accusation,
      questions: reader.readJson("accusation/questions.json")
    }
  };
}

export async function validateCasePackageDirectory(
  directory: string
): Promise<CasePackageValidationReport> {
  try {
    await loadCasePackageFromDirectory(directory);
    return { ok: true, issues: [] };
  } catch (error) {
    if (error instanceof ZodError) {
      return { ok: false, issues: schemaIssues(error) };
    }

    return { ok: false, issues: [parseUnknownError(error, directory)] };
  }
}
