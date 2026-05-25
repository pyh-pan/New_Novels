#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import JSZip from "jszip";

const usage = "Usage: node check_case_package_refs.mjs <case-package.json|case-package-directory|case-package.zip>";
const filePath = process.argv[2];

if (!filePath) {
  process.stderr.write(`${usage}\n`);
  process.exit(1);
}

const readJson = (targetPath) => JSON.parse(fs.readFileSync(targetPath, "utf8"));
const readText = (targetPath) => fs.readFileSync(targetPath, "utf8");
const requiredDirectoryFiles = [
  "manifest.json",
  "case.json",
  "story/chapters.json",
  "agents/global-context.json",
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

async function unzipToTemp(targetPath) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "new-novels-case-"));
  const zip = await JSZip.loadAsync(fs.readFileSync(targetPath));

  await Promise.all(
    Object.values(zip.files)
      .filter((entry) => !entry.dir)
      .map(async (entry) => {
        const parts = entry.name.split("/").filter(Boolean);
        const topLevel = new Set([
          "manifest.json",
          "case.json",
          "story",
          "agents",
          "facts",
          "acts",
          "scenes",
          "clues",
          "relationships",
          "propagation",
          "contradictions",
          "truth",
          "victims",
          "accusation"
        ]);
        const relativePath =
          parts.length > 1 && !topLevel.has(parts[0]) ? parts.slice(1).join("/") : parts.join("/");
        const absolutePath = path.join(tempRoot, relativePath);
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, await entry.async("nodebuffer"));
      })
  );

  return tempRoot;
}

async function readPackage(targetPath) {
  const resolved = path.resolve(targetPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Package path not found: ${targetPath}`);
  }
  if (resolved.endsWith(".zip")) {
    const tempRoot = await unzipToTemp(resolved);
    try {
      return await readPackage(tempRoot);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }
  if (!fs.statSync(resolved).isDirectory()) {
    return readJson(resolved);
  }

  for (const file of requiredDirectoryFiles) {
    const absolutePath = path.join(resolved, file);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Missing required package file: ${file}`);
    }
  }

  const caseFile = readJson(path.join(resolved, "case.json"));
  const chapterIndex = readJson(path.join(resolved, "story/chapters.json"));
  const agentFiles = fs
    .readdirSync(path.join(resolved, "agents"))
    .filter((fileName) => fileName.endsWith(".json") && fileName !== "global-context.json")
    .sort();

  return {
    manifest: readJson(path.join(resolved, "manifest.json")),
    caseFile: {
      ...caseFile,
      globalContext: readJson(path.join(resolved, "agents/global-context.json")),
      chapters: chapterIndex.map((chapter) => ({
        ...chapter,
        body: readText(path.join(resolved, chapter.body))
      })),
      acts: readJson(path.join(resolved, "acts/acts.json")),
      actGates: readJson(path.join(resolved, "acts/gates.json")),
      scenes: readJson(path.join(resolved, "scenes/scenes.json")),
      facts: readJson(path.join(resolved, "facts/facts.json")),
      relationships: readJson(path.join(resolved, "relationships/relationships.json")),
      propagationRules: readJson(path.join(resolved, "propagation/rules.json")),
      contradictions: readJson(path.join(resolved, "contradictions/contradictions.json")),
      truth: readJson(path.join(resolved, "truth/truth.json")),
      victims: readJson(path.join(resolved, "victims/victims.json")),
      agents: agentFiles.map((fileName) => readJson(path.join(resolved, "agents", fileName))),
      clues: readJson(path.join(resolved, "clues/clues.json")),
      accusation: {
        ...caseFile.accusation,
        questions: readJson(path.join(resolved, "accusation/questions.json"))
      }
    }
  };
}

const pkg = await readPackage(filePath);
const issues = [];

const add = (pathLabel, message) => issues.push(`${pathLabel}: ${message}`);
const ids = (items = []) => new Set(items.map((item) => item.id));
const has = (set, id) => set.has(id);
const checkUnique = (items = [], label) => {
  const seen = new Set();
  for (const item of items) {
    if (!item?.id) {
      add(label, "item is missing id");
      continue;
    }
    if (seen.has(item.id)) {
      add(label, `duplicate id '${item.id}'`);
    }
    seen.add(item.id);
  }
};

if (!pkg.manifest) add("manifest", "missing manifest");
if (!pkg.caseFile) add("caseFile", "missing caseFile");

const manifest = pkg.manifest ?? {};
const caseFile = pkg.caseFile ?? {};

if (manifest.schemaVersion !== "case-package/v1") {
  add("manifest.schemaVersion", "must equal case-package/v1");
}
if (manifest.caseId !== caseFile.id) {
  add("manifest.caseId", "must match caseFile.id");
}

const agentIds = ids(caseFile.agents);
const clueIds = ids(caseFile.clues);
const factIds = ids(caseFile.facts);
const actIds = ids(caseFile.acts);
const actGateIds = ids(caseFile.actGates);
const chapterIds = ids(caseFile.chapters);
const victimIds = ids(caseFile.victims);
const contradictionIds = ids(caseFile.contradictions);

checkUnique(caseFile.agents, "agents");
checkUnique(caseFile.clues, "clues");
checkUnique(caseFile.facts, "facts");
checkUnique(caseFile.acts, "acts");
checkUnique(caseFile.actGates, "actGates");
checkUnique(caseFile.scenes, "scenes");
checkUnique(caseFile.chapters, "chapters");
checkUnique(caseFile.victims, "victims");
checkUnique(caseFile.contradictions, "contradictions");
checkUnique(caseFile.accusation?.questions, "accusation.questions");

const general = (caseFile.agents ?? []).find((agent) => agent.id === "general");
if (!general || general.type !== "general") {
  add("agents", "must include a general agent with id 'general' and type 'general'");
}

if (!has(chapterIds, manifest.entryChapterId)) {
  add("manifest.entryChapterId", "must match a chapter id");
}
if (!has(agentIds, caseFile.truth?.culprit)) {
  add("truth.culprit", "must match an agent id");
}
if (!has(victimIds, caseFile.truth?.victim)) {
  add("truth.victim", "must match a victim id");
}
if ((caseFile.accusation?.questions ?? []).length < 3) {
  add("accusation.questions", "should cover culprit, method/evidence, and motive with at least 3 questions");
}

const nonFinalActs = (caseFile.acts ?? []).slice(0, -1);
for (const act of nonFinalActs) {
  const hasGate = (caseFile.actGates ?? []).some((gate) => gate.fromActId === act.id);
  if (!hasGate) {
    add("actGates", `non-final act '${act.id}' should have an unlock gate`);
  }
}

const checkRef = (set, id, pathLabel, kind) => {
  if (id && !has(set, id)) add(pathLabel, `unknown ${kind} id '${id}'`);
};

(caseFile.chapters ?? []).forEach((chapter, index) => {
  checkRef(chapterIds, chapter.previousChapterId, `chapters[${index}].previousChapterId`, "chapter");
  checkRef(chapterIds, chapter.nextChapterId, `chapters[${index}].nextChapterId`, "chapter");
});

(caseFile.facts ?? []).forEach((fact, index) => {
  (fact.ownerAgentIds ?? []).forEach((id) => checkRef(agentIds, id, `facts[${index}].ownerAgentIds`, "agent"));
  (fact.relatedClueIds ?? []).forEach((id) => checkRef(clueIds, id, `facts[${index}].relatedClueIds`, "clue"));
  checkRef(actIds, fact.actId, `facts[${index}].actId`, "act");
});

(caseFile.acts ?? []).forEach((act, index) => {
  (act.availableAgentIds ?? []).forEach((id) => checkRef(agentIds, id, `acts[${index}].availableAgentIds`, "agent"));
  (act.visibleClueIds ?? []).forEach((id) => checkRef(clueIds, id, `acts[${index}].visibleClueIds`, "clue"));
  (act.lockedFactIds ?? []).forEach((id) => checkRef(factIds, id, `acts[${index}].lockedFactIds`, "fact"));
});

(caseFile.actGates ?? []).forEach((gate, index) => {
  checkRef(actGateIds, gate.id, `actGates[${index}].id`, "actGate");
  checkRef(actIds, gate.fromActId, `actGates[${index}].fromActId`, "act");
  checkRef(actIds, gate.toActId, `actGates[${index}].toActId`, "act");
  (gate.requiredClueIds ?? []).forEach((id) => checkRef(clueIds, id, `actGates[${index}].requiredClueIds`, "clue"));
  (gate.requiredFactIds ?? []).forEach((id) => checkRef(factIds, id, `actGates[${index}].requiredFactIds`, "fact"));
  (gate.requiredContradictionIds ?? []).forEach((id) => checkRef(contradictionIds, id, `actGates[${index}].requiredContradictionIds`, "contradiction"));
  (gate.requiredNpcInteractions ?? []).forEach((id) => checkRef(agentIds, id, `actGates[${index}].requiredNpcInteractions`, "agent"));
});

(caseFile.scenes ?? []).forEach((scene, index) => {
  checkRef(actIds, scene.actId, `scenes[${index}].actId`, "act");
  (scene.observableFactIds ?? []).forEach((id) => checkRef(factIds, id, `scenes[${index}].observableFactIds`, "fact"));
});

(caseFile.clues ?? []).forEach((clue, index) => {
  checkRef(agentIds, clue.unlock?.agentId, `clues[${index}].unlock.agentId`, "agent");
  (clue.unlock?.factIds ?? []).forEach((id) => checkRef(factIds, id, `clues[${index}].unlock.factIds`, "fact"));
});

(caseFile.relationships ?? []).forEach((relationship, index) => {
  checkRef(agentIds, relationship.from, `relationships[${index}].from`, "agent");
  checkRef(agentIds, relationship.to, `relationships[${index}].to`, "agent");
  (relationship.knownFactsAboutOther ?? []).forEach((id) => checkRef(factIds, id, `relationships[${index}].knownFactsAboutOther`, "fact"));
});

(caseFile.propagationRules ?? []).forEach((rule, index) => {
  checkRef(agentIds, rule.fromAgentId, `propagationRules[${index}].fromAgentId`, "agent");
  checkRef(agentIds, rule.toAgentId, `propagationRules[${index}].toAgentId`, "agent");
  checkRef(factIds, rule.factId, `propagationRules[${index}].factId`, "fact");
});

(caseFile.contradictions ?? []).forEach((contradiction, index) => {
  (contradiction.factIds ?? []).forEach((id) => checkRef(factIds, id, `contradictions[${index}].factIds`, "fact"));
  (contradiction.clueIds ?? []).forEach((id) => checkRef(clueIds, id, `contradictions[${index}].clueIds`, "clue"));
  (contradiction.agentIds ?? []).forEach((id) => checkRef(agentIds, id, `contradictions[${index}].agentIds`, "agent"));
});

(caseFile.agents ?? []).forEach((agent, agentIndex) => {
  if (!agent.pressureProfile) {
    add(`agents[${agentIndex}].pressureProfile`, "missing runtime pressure profile");
  }
  if (agent.type === "npc" && (agent.pressureProfile?.increaseRules ?? []).length === 0) {
    add(`agents[${agentIndex}].pressureProfile.increaseRules`, "NPC should have at least one source-specific pressure rule");
  }
  if (!agent.emotionalArc?.calm || !agent.emotionalArc?.guarded || !agent.emotionalArc?.cornered) {
    add(`agents[${agentIndex}].emotionalArc`, "must define calm, guarded, and cornered speech states");
  }
  if ((agent.styleAnchors ?? []).length === 0) {
    add(`agents[${agentIndex}].styleAnchors`, "should include at least one source-specific voice anchor");
  }
  if (agent.type === "npc" && (agent.confrontationTriggers ?? []).length === 0) {
    add(`agents[${agentIndex}].confrontationTriggers`, "NPC should define confrontation triggers");
  }

  (agent.pressureProfile?.increaseRules ?? []).forEach((rule, ruleIndex) => {
    const base = `agents[${agentIndex}].pressureProfile.increaseRules[${ruleIndex}]`;
    (rule.clueIds ?? []).forEach((id) => checkRef(clueIds, id, `${base}.clueIds`, "clue"));
    (rule.factIds ?? []).forEach((id) => checkRef(factIds, id, `${base}.factIds`, "fact"));
    (rule.contradictionIds ?? []).forEach((id) => checkRef(contradictionIds, id, `${base}.contradictionIds`, "contradiction"));
  });

  (agent.revealRules ?? []).forEach((rule, ruleIndex) => {
    const base = `agents[${agentIndex}].revealRules[${ruleIndex}]`;
    checkRef(factIds, rule.factId, `${base}.factId`, "fact");
    checkRef(actIds, rule.requiresAct, `${base}.requiresAct`, "act");
    (rule.requiresClues ?? []).forEach((id) => checkRef(clueIds, id, `${base}.requiresClues`, "clue"));
    (rule.requiresAllClues ?? []).forEach((id) => checkRef(clueIds, id, `${base}.requiresAllClues`, "clue"));
    (rule.requiresAnyClues ?? []).forEach((id) => checkRef(clueIds, id, `${base}.requiresAnyClues`, "clue"));
    (rule.requiresContradictions ?? []).forEach((id) => checkRef(contradictionIds, id, `${base}.requiresContradictions`, "contradiction"));
  });
});

if (issues.length > 0) {
  process.stderr.write(`Found ${issues.length} issue(s):\n`);
  for (const issue of issues) process.stderr.write(`- ${issue}\n`);
  process.exit(1);
}

process.stdout.write("Case package reference check passed.\n");
