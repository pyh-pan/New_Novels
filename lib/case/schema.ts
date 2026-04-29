import { z } from "zod";

export const nonEmptyString = z.string().trim().min(1);

export const noteTagSchema = z.enum(["clue", "testimony", "doubt", "contradiction"]);
export const revealModeSchema = z.enum(["direct", "reluctant", "evasive", "partial"]);

export const clueSchema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  text: nonEmptyString,
  tag: noteTagSchema,
  source: nonEmptyString,
  unlockHints: z.array(nonEmptyString).min(1)
});

export const globalContextSchema = z.object({
  fairPlayRules: z.array(nonEmptyString).min(1),
  conversationRules: z.array(nonEmptyString).min(1),
  spoilerRules: z.array(nonEmptyString).min(1),
  fabricationRules: z.array(nonEmptyString).min(1),
  toneRules: z.array(nonEmptyString).min(1)
});

export const agentPersonalitySchema = z.object({
  speechStyle: nonEmptyString,
  emotionalBaseline: nonEmptyString,
  stressResponse: nonEmptyString,
  evasiveHabits: z.array(nonEmptyString).min(1)
});

export const agentKnowledgeSchema = z.object({
  publicFacts: z.array(nonEmptyString).min(1),
  privateFacts: z.array(nonEmptyString).min(1),
  beliefs: z.array(nonEmptyString).min(1)
});

export const agentBoundariesSchema = z.object({
  hides: z.array(nonEmptyString).min(1),
  liesAbout: z.array(nonEmptyString).min(1),
  forbiddenClaims: z.array(nonEmptyString).min(1)
});

export const revealRuleSchema = z.object({
  fact: nonEmptyString,
  requiresClues: z.array(nonEmptyString),
  requiresTopics: z.array(nonEmptyString).optional(),
  revealMode: revealModeSchema
});

const agentBaseSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  role: nonEmptyString,
  personality: agentPersonalitySchema,
  knowledge: agentKnowledgeSchema,
  revealRules: z.array(revealRuleSchema)
});

export const generalAgentSchema = agentBaseSchema.extend({
  type: z.literal("general"),
  knowledgeScope: z.literal("unlocked-only"),
  allowedTopics: z.array(nonEmptyString).min(1),
  forbiddenClaims: z.array(nonEmptyString).min(1)
});

export const npcAgentSchema = agentBaseSchema.extend({
  type: z.literal("npc"),
  boundaries: agentBoundariesSchema
});

export const agentSchema = z.discriminatedUnion("type", [
  generalAgentSchema,
  npcAgentSchema
]);

export const playerKnowledgeStateSchema = z.object({
  discoveredClueIds: z.array(nonEmptyString).default([]),
  heardTestimonyIds: z.array(nonEmptyString).default([]),
  knownContradictionIds: z.array(nonEmptyString).default([]),
  confrontedAgentIds: z.array(nonEmptyString).default([]),
  askedTopics: z.array(nonEmptyString).default([])
});

export const accusationQuestionSchema = z.object({
  id: nonEmptyString,
  prompt: nonEmptyString,
  acceptedAnswers: z.array(nonEmptyString).min(1),
  explanation: nonEmptyString
});

export const victimSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString
});

const baseCaseSchema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  globalContext: globalContextSchema,
  source: z.object({
    title: nonEmptyString,
    author: nonEmptyString,
    publicDomainNote: nonEmptyString
  }),
  storyText: nonEmptyString,
  truth: z.object({
    culprit: nonEmptyString,
    victim: nonEmptyString,
    motive: nonEmptyString,
    method: nonEmptyString,
    decisiveEvidence: z.array(nonEmptyString).min(1)
  }),
  victims: z.array(victimSchema).min(1),
  agents: z.array(agentSchema).min(1),
  clues: z.array(clueSchema).min(1),
  accusation: z.object({
    questions: z.array(accusationQuestionSchema).min(1)
  })
});

const addDuplicateIssue = (
  context: z.RefinementCtx,
  path: (string | number)[],
  label: string
) => {
  context.addIssue({
    code: z.ZodIssueCode.custom,
    path,
    message: `${label} ids must be unique`
  });
};

const hasDuplicates = (ids: string[]) => new Set(ids).size !== ids.length;

export const caseSchema = baseCaseSchema.superRefine((caseFile, context) => {
  const agentIds = caseFile.agents.map((agent) => agent.id);
  const clueIds = caseFile.clues.map((clue) => clue.id);
  const questionIds = caseFile.accusation.questions.map((question) => question.id);
  const victimIds = caseFile.victims.map((victim) => victim.id);

  if (hasDuplicates(agentIds)) {
    addDuplicateIssue(context, ["agents"], "Agent");
  }

  if (hasDuplicates(clueIds)) {
    addDuplicateIssue(context, ["clues"], "Clue");
  }

  if (hasDuplicates(questionIds)) {
    addDuplicateIssue(context, ["accusation", "questions"], "Accusation question");
  }

  if (hasDuplicates(victimIds)) {
    addDuplicateIssue(context, ["victims"], "Victim");
  }

  const generalAgent = caseFile.agents.find((agent) => agent.id === "general");
  if (generalAgent?.type !== "general") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["agents"],
      message: "Case must include a general agent with id general"
    });
  }

  if (!agentIds.includes(caseFile.truth.culprit)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["truth", "culprit"],
      message: "truth.culprit must match an agent id"
    });
  }

  if (!victimIds.includes(caseFile.truth.victim)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["truth", "victim"],
      message: "truth.victim must match a victim id"
    });
  }

  caseFile.agents.forEach((agent, agentIndex) => {
    agent.revealRules.forEach((rule, ruleIndex) => {
      rule.requiresClues.forEach((clueId, clueIndex) => {
        if (!clueIds.includes(clueId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["agents", agentIndex, "revealRules", ruleIndex, "requiresClues", clueIndex],
            message: "Reveal rule clue references must match clue ids"
          });
        }
      });
    });
  });
});

export type NoteTag = z.infer<typeof noteTagSchema>;
export type RevealMode = z.infer<typeof revealModeSchema>;
export type GlobalContext = z.infer<typeof globalContextSchema>;
export type CaseFile = z.infer<typeof caseSchema>;
export type AgentPersonality = z.infer<typeof agentPersonalitySchema>;
export type AgentKnowledge = z.infer<typeof agentKnowledgeSchema>;
export type AgentBoundaries = z.infer<typeof agentBoundariesSchema>;
export type RevealRule = z.infer<typeof revealRuleSchema>;
export type GeneralAgent = z.infer<typeof generalAgentSchema>;
export type NpcAgent = z.infer<typeof npcAgentSchema>;
export type CaseAgent = z.infer<typeof agentSchema>;
export type PlayerKnowledgeState = z.infer<typeof playerKnowledgeStateSchema>;
export type Clue = z.infer<typeof clueSchema>;
export type AccusationQuestion = z.infer<typeof accusationQuestionSchema>;
export type Victim = z.infer<typeof victimSchema>;
