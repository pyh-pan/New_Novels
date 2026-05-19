#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const usage = "Usage: node check_case_package_refs.mjs <case-package.json>";
const filePath = process.argv[2];

if (!filePath) {
  process.stderr.write(`${usage}\n`);
  process.exit(1);
}

const readJson = (targetPath) => JSON.parse(fs.readFileSync(targetPath, "utf8"));
const pkg = readJson(path.resolve(filePath));
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
const chapterIds = ids(caseFile.chapters);
const victimIds = ids(caseFile.victims);
const contradictionIds = ids(caseFile.contradictions);

checkUnique(caseFile.agents, "agents");
checkUnique(caseFile.clues, "clues");
checkUnique(caseFile.facts, "facts");
checkUnique(caseFile.acts, "acts");
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
