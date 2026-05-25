import { z } from "zod";

export const nonEmptyString = z.string().trim().min(1);

export const noteTagSchema = z.enum(["clue", "testimony", "doubt", "contradiction"]);
export const revealModeSchema = z.enum(["direct", "reluctant", "evasive", "partial"]);
export const factVisibilitySchema = z.enum(["public", "private", "truth", "unlocked"]);
export const lieStrategySchema = z.enum([
  "deny",
  "deflect",
  "minimize",
  "blame_other",
  "moralize",
  "partial_truth"
]);

export const runtimeConditionSchema = z.object({
  requiresAllClues: z.array(nonEmptyString).default([]),
  requiresAnyClues: z.array(nonEmptyString).default([]),
  requiresFacts: z.array(nonEmptyString).default([]),
  requiresContradictions: z.array(nonEmptyString).default([]),
  requiresAct: nonEmptyString.optional()
});

export const agentPermissionSchema = z.object({
  canSeeTruth: z.boolean(),
  canSeeOtherAgentsPrivateFacts: z.boolean(),
  canRevealUnsolvedClues: z.boolean(),
  canCreateNewFacts: z.literal(false),
  canReferencePlayerNotes: z.boolean()
});

export const clueSchema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  text: nonEmptyString,
  tag: noteTagSchema,
  source: nonEmptyString,
  unlockHints: z.array(nonEmptyString).min(1),
  unlock: z
    .object({
      type: z.enum(["agent-response", "story", "manual", "system"]),
      agentId: nonEmptyString.optional(),
      topics: z.array(nonEmptyString).default([]),
      factIds: z.array(nonEmptyString).default([])
    })
    .optional()
});

export const factSchema = z.object({
  id: nonEmptyString,
  text: nonEmptyString,
  visibility: factVisibilitySchema,
  ownerAgentIds: z.array(nonEmptyString),
  relatedClueIds: z.array(nonEmptyString).default([]),
  actId: nonEmptyString.optional(),
  keywords: z.array(nonEmptyString).default([])
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

export const pressureRuleSchema = z.object({
  id: nonEmptyString,
  topics: z.array(nonEmptyString).default([]),
  clueIds: z.array(nonEmptyString).default([]),
  factIds: z.array(nonEmptyString).default([]),
  contradictionIds: z.array(nonEmptyString).default([]),
  delta: z.number().int().min(1),
  reason: nonEmptyString
});

export const pressureProfileSchema = z.object({
  baseline: z.number().int().min(0).default(0),
  thresholds: z.object({
    guarded: z.number().int().min(0),
    cornered: z.number().int().min(0)
  }),
  increaseRules: z.array(pressureRuleSchema).default([])
});

export const emotionalArcSchema = z.object({
  calm: nonEmptyString,
  guarded: nonEmptyString,
  cornered: nonEmptyString
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
  id: nonEmptyString,
  factId: nonEmptyString,
  fact: nonEmptyString,
  requiresClues: z.array(nonEmptyString).default([]),
  requiresAllClues: z.array(nonEmptyString).default([]),
  requiresAnyClues: z.array(nonEmptyString).default([]),
  requiresTopics: z.array(nonEmptyString).optional(),
  requiresPressureAtLeast: z.number().int().min(0).optional(),
  requiresAct: nonEmptyString.optional(),
  requiresContradictions: z.array(nonEmptyString).default([]),
  revealMode: revealModeSchema
});

const agentBaseSchema = z.object({
  id: nonEmptyString,
  aliases: z.array(nonEmptyString).default([]),
  name: nonEmptyString,
  role: nonEmptyString,
  promptVersion: nonEmptyString,
  permissions: agentPermissionSchema,
  lieStrategy: z.array(lieStrategySchema).default([]),
  pressureProfile: pressureProfileSchema,
  emotionalArc: emotionalArcSchema,
  confrontationTriggers: z.array(nonEmptyString).default([]),
  confessionBoundary: z.array(nonEmptyString).default([]),
  styleAnchors: z.array(nonEmptyString).default([]),
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
  currentActId: nonEmptyString.default("act-opening"),
  discoveredClueIds: z.array(nonEmptyString).default([]),
  discoveredFactIds: z.array(nonEmptyString).default([]),
  heardTestimonyIds: z.array(nonEmptyString).default([]),
  knownContradictionIds: z.array(nonEmptyString).default([]),
  sceneInteractionIds: z.array(nonEmptyString).default([]),
  confrontedAgentIds: z.array(nonEmptyString).default([]),
  askedTopics: z.array(nonEmptyString).default([]),
  hypotheses: z.array(nonEmptyString).default([])
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

export const storyChapterSchema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  subtitle: nonEmptyString.optional(),
  body: nonEmptyString,
  availableFromStart: z.boolean().default(false),
  previousChapterId: nonEmptyString.optional(),
  nextChapterId: nonEmptyString.optional()
});

export const actSchema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  availableAgentIds: z.array(nonEmptyString),
  visibleClueIds: z.array(nonEmptyString).default([]),
  lockedFactIds: z.array(nonEmptyString).default([]),
  entryConditions: z.array(runtimeConditionSchema).default([]),
  exitConditions: z.array(runtimeConditionSchema).default([])
});

export const actGateSchema = z.object({
  id: nonEmptyString,
  fromActId: nonEmptyString,
  toActId: nonEmptyString,
  requiredClueIds: z.array(nonEmptyString).default([]),
  requiredFactIds: z.array(nonEmptyString).default([]),
  requiredContradictionIds: z.array(nonEmptyString).default([]),
  requiredNpcInteractions: z.array(nonEmptyString).default([]),
  requiredSceneInteractions: z.array(nonEmptyString).default([]),
  unlockNarrative: nonEmptyString
});

export const sceneSchema = z.object({
  id: nonEmptyString,
  actId: nonEmptyString,
  location: nonEmptyString,
  observableFactIds: z.array(nonEmptyString).default([]),
  interactableObjects: z.array(nonEmptyString).default([]),
  ambientText: z.array(nonEmptyString).default([])
});

export const agentRelationshipSchema = z.object({
  from: nonEmptyString,
  to: nonEmptyString,
  attitude: z.enum(["protective", "hostile", "fearful", "indifferent"]),
  knownFactsAboutOther: z.array(nonEmptyString).default([])
});

export const informationPropagationRuleSchema = z.object({
  fromAgentId: nonEmptyString,
  toAgentId: nonEmptyString,
  factId: nonEmptyString,
  condition: runtimeConditionSchema,
  mode: z.enum(["rumor", "direct", "observed"])
});

export const contradictionSchema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  factIds: z.array(nonEmptyString).min(2),
  clueIds: z.array(nonEmptyString).default([]),
  agentIds: z.array(nonEmptyString).default([])
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
  chapters: z.array(storyChapterSchema).min(1),
  acts: z.array(actSchema).min(1),
  actGates: z.array(actGateSchema).default([]),
  scenes: z.array(sceneSchema).min(1),
  facts: z.array(factSchema).min(1),
  relationships: z.array(agentRelationshipSchema).default([]),
  propagationRules: z.array(informationPropagationRuleSchema).default([]),
  contradictions: z.array(contradictionSchema).default([]),
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
  const factIds = caseFile.facts.map((fact) => fact.id);
  const actIds = caseFile.acts.map((act) => act.id);
  const sceneIds = caseFile.scenes.map((scene) => scene.id);
  const actGateIds = caseFile.actGates.map((gate) => gate.id);
  const chapterIds = caseFile.chapters.map((chapter) => chapter.id);
  const questionIds = caseFile.accusation.questions.map((question) => question.id);
  const victimIds = caseFile.victims.map((victim) => victim.id);

  if (hasDuplicates(agentIds)) {
    addDuplicateIssue(context, ["agents"], "Agent");
  }

  if (hasDuplicates(clueIds)) {
    addDuplicateIssue(context, ["clues"], "Clue");
  }

  if (hasDuplicates(factIds)) {
    addDuplicateIssue(context, ["facts"], "Fact");
  }

  if (hasDuplicates(actIds)) {
    addDuplicateIssue(context, ["acts"], "Act");
  }

  if (hasDuplicates(sceneIds)) {
    addDuplicateIssue(context, ["scenes"], "Scene");
  }

  if (hasDuplicates(actGateIds)) {
    addDuplicateIssue(context, ["actGates"], "Act gate");
  }

  if (hasDuplicates(chapterIds)) {
    addDuplicateIssue(context, ["chapters"], "Chapter");
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

  const checkClueRef = (path: (string | number)[], clueId: string) => {
    if (!clueIds.includes(clueId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: "Clue references must match clue ids"
      });
    }
  };

  const checkFactRef = (path: (string | number)[], factId: string) => {
    if (!factIds.includes(factId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: "Fact references must match fact ids"
      });
    }
  };

  const checkAgentRef = (path: (string | number)[], agentId: string) => {
    if (!agentIds.includes(agentId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: "Agent references must match agent ids"
      });
    }
  };

  const checkActRef = (path: (string | number)[], actId: string) => {
    if (!actIds.includes(actId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: "Act references must match act ids"
      });
    }
  };

  caseFile.chapters.forEach((chapter, chapterIndex) => {
    if (chapter.previousChapterId && !chapterIds.includes(chapter.previousChapterId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["chapters", chapterIndex, "previousChapterId"],
        message: "Chapter navigation references must match chapter ids"
      });
    }

    if (chapter.nextChapterId && !chapterIds.includes(chapter.nextChapterId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["chapters", chapterIndex, "nextChapterId"],
        message: "Chapter navigation references must match chapter ids"
      });
    }
  });

  caseFile.facts.forEach((fact, factIndex) => {
    fact.ownerAgentIds.forEach((agentId, agentIndex) => {
      checkAgentRef(["facts", factIndex, "ownerAgentIds", agentIndex], agentId);
    });
    fact.relatedClueIds.forEach((clueId, clueIndex) => {
      checkClueRef(["facts", factIndex, "relatedClueIds", clueIndex], clueId);
    });
    if (fact.actId) {
      checkActRef(["facts", factIndex, "actId"], fact.actId);
    }
  });

  caseFile.acts.forEach((act, actIndex) => {
    act.availableAgentIds.forEach((agentId, agentIndex) => {
      checkAgentRef(["acts", actIndex, "availableAgentIds", agentIndex], agentId);
    });
    act.visibleClueIds.forEach((clueId, clueIndex) => {
      checkClueRef(["acts", actIndex, "visibleClueIds", clueIndex], clueId);
    });
    act.lockedFactIds.forEach((factId, factIndex) => {
      checkFactRef(["acts", actIndex, "lockedFactIds", factIndex], factId);
    });
  });

  caseFile.actGates.forEach((gate, gateIndex) => {
    checkActRef(["actGates", gateIndex, "fromActId"], gate.fromActId);
    checkActRef(["actGates", gateIndex, "toActId"], gate.toActId);
    gate.requiredClueIds.forEach((clueId, clueIndex) => {
      checkClueRef(["actGates", gateIndex, "requiredClueIds", clueIndex], clueId);
    });
    gate.requiredFactIds.forEach((factId, factIndex) => {
      checkFactRef(["actGates", gateIndex, "requiredFactIds", factIndex], factId);
    });
    gate.requiredContradictionIds.forEach((contradictionId, contradictionIndex) => {
      if (!caseFile.contradictions.some((item) => item.id === contradictionId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["actGates", gateIndex, "requiredContradictionIds", contradictionIndex],
          message: "Act gate contradiction references must match contradiction ids"
        });
      }
    });
    gate.requiredNpcInteractions.forEach((agentId, agentIndex) => {
      checkAgentRef(["actGates", gateIndex, "requiredNpcInteractions", agentIndex], agentId);
    });
  });

  caseFile.scenes.forEach((scene, sceneIndex) => {
    checkActRef(["scenes", sceneIndex, "actId"], scene.actId);
    scene.observableFactIds.forEach((factId, factIndex) => {
      checkFactRef(["scenes", sceneIndex, "observableFactIds", factIndex], factId);
    });
  });

  caseFile.relationships.forEach((relationship, relationshipIndex) => {
    checkAgentRef(["relationships", relationshipIndex, "from"], relationship.from);
    checkAgentRef(["relationships", relationshipIndex, "to"], relationship.to);
    relationship.knownFactsAboutOther.forEach((factId, factIndex) => {
      checkFactRef(["relationships", relationshipIndex, "knownFactsAboutOther", factIndex], factId);
    });
  });

  caseFile.propagationRules.forEach((rule, ruleIndex) => {
    checkAgentRef(["propagationRules", ruleIndex, "fromAgentId"], rule.fromAgentId);
    checkAgentRef(["propagationRules", ruleIndex, "toAgentId"], rule.toAgentId);
    checkFactRef(["propagationRules", ruleIndex, "factId"], rule.factId);
  });

  caseFile.contradictions.forEach((contradiction, contradictionIndex) => {
    contradiction.factIds.forEach((factId, factIndex) => {
      checkFactRef(["contradictions", contradictionIndex, "factIds", factIndex], factId);
    });
    contradiction.clueIds.forEach((clueId, clueIndex) => {
      checkClueRef(["contradictions", contradictionIndex, "clueIds", clueIndex], clueId);
    });
    contradiction.agentIds.forEach((agentId, agentIndex) => {
      checkAgentRef(["contradictions", contradictionIndex, "agentIds", agentIndex], agentId);
    });
  });

  caseFile.clues.forEach((clue, clueIndex) => {
    clue.unlock?.factIds.forEach((factId, factIndex) => {
      checkFactRef(["clues", clueIndex, "unlock", "factIds", factIndex], factId);
    });
    if (clue.unlock?.agentId) {
      checkAgentRef(["clues", clueIndex, "unlock", "agentId"], clue.unlock.agentId);
    }
  });

  caseFile.agents.forEach((agent, agentIndex) => {
    agent.pressureProfile.increaseRules.forEach((rule, ruleIndex) => {
      rule.clueIds.forEach((clueId, clueIndex) => {
        checkClueRef(
          ["agents", agentIndex, "pressureProfile", "increaseRules", ruleIndex, "clueIds", clueIndex],
          clueId
        );
      });
      rule.factIds.forEach((factId, factIndex) => {
        checkFactRef(
          ["agents", agentIndex, "pressureProfile", "increaseRules", ruleIndex, "factIds", factIndex],
          factId
        );
      });
      rule.contradictionIds.forEach((contradictionId, contradictionIndex) => {
        if (!caseFile.contradictions.some((item) => item.id === contradictionId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [
              "agents",
              agentIndex,
              "pressureProfile",
              "increaseRules",
              ruleIndex,
              "contradictionIds",
              contradictionIndex
            ],
            message: "Pressure rule contradiction references must match contradiction ids"
          });
        }
      });
    });
    agent.revealRules.forEach((rule, ruleIndex) => {
      checkFactRef(["agents", agentIndex, "revealRules", ruleIndex, "factId"], rule.factId);
      if (rule.requiresAct) {
        checkActRef(["agents", agentIndex, "revealRules", ruleIndex, "requiresAct"], rule.requiresAct);
      }
      rule.requiresClues.forEach((clueId, clueIndex) => {
        checkClueRef(["agents", agentIndex, "revealRules", ruleIndex, "requiresClues", clueIndex], clueId);
      });
      rule.requiresAllClues.forEach((clueId, clueIndex) => {
        checkClueRef(["agents", agentIndex, "revealRules", ruleIndex, "requiresAllClues", clueIndex], clueId);
      });
      rule.requiresAnyClues.forEach((clueId, clueIndex) => {
        checkClueRef(["agents", agentIndex, "revealRules", ruleIndex, "requiresAnyClues", clueIndex], clueId);
      });
    });
  });
});

export type NoteTag = z.infer<typeof noteTagSchema>;
export type RevealMode = z.infer<typeof revealModeSchema>;
export type FactVisibility = z.infer<typeof factVisibilitySchema>;
export type LieStrategy = z.infer<typeof lieStrategySchema>;
export type GlobalContext = z.infer<typeof globalContextSchema>;
export type CaseFile = z.infer<typeof caseSchema>;
export type CaseFileInput = z.input<typeof caseSchema>;
export type CaseFact = z.infer<typeof factSchema>;
export type StoryChapter = z.infer<typeof storyChapterSchema>;
export type CaseAct = z.infer<typeof actSchema>;
export type ActGate = z.infer<typeof actGateSchema>;
export type CaseScene = z.infer<typeof sceneSchema>;
export type AgentRelationship = z.infer<typeof agentRelationshipSchema>;
export type InformationPropagationRule = z.infer<typeof informationPropagationRuleSchema>;
export type CaseContradiction = z.infer<typeof contradictionSchema>;
export type AgentPersonality = z.infer<typeof agentPersonalitySchema>;
export type PressureProfile = z.infer<typeof pressureProfileSchema>;
export type PressureRule = z.infer<typeof pressureRuleSchema>;
export type EmotionalArc = z.infer<typeof emotionalArcSchema>;
export type AgentKnowledge = z.infer<typeof agentKnowledgeSchema>;
export type AgentBoundaries = z.infer<typeof agentBoundariesSchema>;
export type AgentPermission = z.infer<typeof agentPermissionSchema>;
export type RevealRule = z.infer<typeof revealRuleSchema>;
export type GeneralAgent = z.infer<typeof generalAgentSchema>;
export type NpcAgent = z.infer<typeof npcAgentSchema>;
export type CaseAgent = z.infer<typeof agentSchema>;
export type PlayerKnowledgeState = z.infer<typeof playerKnowledgeStateSchema>;
export type Clue = z.infer<typeof clueSchema>;
export type AccusationQuestion = z.infer<typeof accusationQuestionSchema>;
export type Victim = z.infer<typeof victimSchema>;
