import { describe, expect, it } from "vitest";

import {
  buildSourceAdaptationMessages,
  createCasePackageFromSource,
  extractSourceDocument,
  type CaseAdaptationModelOutput
} from "../lib/studio/source-adaptation";

function sourceFile(content: string, name: string, type = "text/plain"): File {
  return {
    name,
    type,
    arrayBuffer: async () => new TextEncoder().encode(content).buffer
  } as File;
}

function modelOutput(): CaseAdaptationModelOutput {
  return {
    sourceProfile: {
      title: "雨夜疑案",
      author: "匿名作者",
      language: "zh-CN",
      narrativeForm: "第三人称封闭空间推理",
      structureNotes: ["正文包含案发、调查、逼问和真相段落。"],
      adaptationStrategy: [
        "保留案发前后的文学叙述。",
        "隐藏侦探发现钥匙矛盾的段落，转为玩家调查路线。"
      ],
      rightsNote: "用户上传文本，需由上传者确认发行权利。"
    },
    segmentation: [
      {
        id: "seg-opening",
        label: "story-keep",
        sourceExcerpt: "雨夜里，书房门从里面反锁。",
        reason: "这是必要的案发背景。",
        destination: "story/chapter-1.md",
        playerDiscoveryRoute: "直接阅读"
      },
      {
        id: "seg-key",
        label: "investigation-hide",
        sourceExcerpt: "侦探发现备用钥匙上没有雨水。",
        reason: "这是可探索线索，应由玩家自己发现。",
        destination: "clues/clues.json",
        playerDiscoveryRoute: "调查书房门锁"
      },
      {
        id: "seg-solution",
        label: "solution-lock",
        sourceExcerpt: "管家调换了钥匙。",
        reason: "真相必须留到最终指认后。",
        destination: "truth/truth.json",
        playerDiscoveryRoute: "最终指认"
      }
    ],
    qualityReport: [
      {
        severity: "warning",
        title: "版权确认",
        detail: "发行前需要上传者确认文本授权。"
      }
    ],
    caseFile: {
      id: "generated-rain-room",
      title: "雨夜疑案",
      source: {
        title: "雨夜疑案",
        author: "匿名作者",
        publicDomainNote: "用户上传文本，需由上传者确认发行权利。"
      },
      storyText: "雨夜里，书房门从里面反锁。死者倒在书桌旁，屋内只有一枚干燥的备用钥匙。",
      globalContext: {
        fairPlayRules: ["玩家必须能通过线索推导真相。"],
        conversationRules: ["回答必须简洁，并遵守角色知识边界。"],
        spoilerRules: ["最终指认前不得说出完整真相。"],
        fabricationRules: ["不得编造原文没有支撑的证据。"],
        toneRules: ["保持中文文学推理的克制语气。"]
      },
      chapters: [
        {
          id: "chapter-1",
          title: "第一章 雨夜书房",
          body: "雨夜里，书房门从里面反锁。死者倒在书桌旁，屋内只有一枚干燥的备用钥匙。",
          availableFromStart: true
        }
      ],
      acts: [
        {
          id: "act-opening",
          title: "案发现场",
          availableAgentIds: ["general", "butler"],
          visibleClueIds: ["clue-locked-room"],
          lockedFactIds: ["fact-key-swapped"]
        }
      ],
      actGates: [],
      storyEvents: [
        {
          id: "event-check-key-record",
          kind: "instant-result",
          title: "核对钥匙保管记录",
          description: "玩家要求核对备用钥匙登记时，直接获得记录结果。",
          timing: "none",
          trigger: {
            agentId: "general",
            topics: ["钥匙", "登记"]
          },
          effects: {
            revealedFactIds: ["fact-locked-room"],
            revealedClueIds: ["clue-locked-room"],
            targetAgentIds: ["general"],
            narrative: "钥匙保管记录可以立即核对，不推进故事时间。"
          },
          designRationale: "单纯记录核查的价值在于玩家提出方向，不在等待。"
        }
      ],
      scenes: [
        {
          id: "scene-study",
          actId: "act-opening",
          location: "书房",
          observableFactIds: ["fact-locked-room"],
          interactableObjects: ["门锁", "备用钥匙"],
          ambientText: ["雨声压过了走廊脚步。"]
        }
      ],
      facts: [
        {
          id: "fact-locked-room",
          text: "书房门从里面反锁。",
          visibility: "public",
          ownerAgentIds: ["general"],
          relatedClueIds: ["clue-locked-room"],
          actId: "act-opening"
        },
        {
          id: "fact-key-swapped",
          text: "备用钥匙被管家调换过。",
          visibility: "truth",
          ownerAgentIds: ["butler"],
          relatedClueIds: ["clue-dry-key"],
          actId: "act-opening"
        }
      ],
      relationships: [],
      propagationRules: [],
      contradictions: [
        {
          id: "contradiction-rain-key",
          title: "雨夜与干燥钥匙",
          factIds: ["fact-locked-room", "fact-key-swapped"],
          clueIds: ["clue-dry-key"],
          agentIds: ["butler"]
        }
      ],
      truth: {
        culprit: "butler",
        victim: "victim",
        motive: "隐瞒盗窃账册。",
        method: "调换备用钥匙，制造反锁假象。",
        decisiveEvidence: ["fact-key-swapped"]
      },
      victims: [{ id: "victim", name: "书房主人" }],
      agents: [
        {
          id: "general",
          type: "general",
          aliases: ["调查助手"],
          name: "调查助手",
          role: "帮助玩家整理已知信息。",
          promptVersion: "generated-v1",
          permissions: {
            canSeeTruth: false,
            canSeeOtherAgentsPrivateFacts: false,
            canRevealUnsolvedClues: false,
            canCreateNewFacts: false,
            canReferencePlayerNotes: true
          },
          lieStrategy: [],
          pressureProfile: {
            baseline: 0,
            thresholds: { guarded: 2, cornered: 4 },
            increaseRules: []
          },
          emotionalArc: {
            calm: "冷静整理事实。",
            guarded: "提醒玩家证据不足。",
            cornered: "仍不剧透真相。"
          },
          confrontationTriggers: [],
          confessionBoundary: ["不能代替玩家完成最终指认。"],
          styleAnchors: ["简洁", "克制"],
          personality: {
            speechStyle: "清晰、克制、只整理已知事实。",
            emotionalBaseline: "冷静。",
            stressResponse: "提醒玩家回到证据。",
            evasiveHabits: ["证据不足时拒绝定论。"]
          },
          knowledge: {
            publicFacts: ["书房门从里面反锁。"],
            privateFacts: ["真相只能在最终指认后完整揭示。"],
            beliefs: ["玩家需要先检查门锁和钥匙。"]
          },
          revealRules: [],
          knowledgeScope: "unlocked-only",
          allowedTopics: ["现场", "线索", "证词", "推理方向"],
          forbiddenClaims: ["最终指认前不得说管家是真凶。"]
        },
        {
          id: "butler",
          type: "npc",
          aliases: ["管家"],
          name: "管家",
          role: "掌管书房钥匙的人。",
          promptVersion: "generated-v1",
          permissions: {
            canSeeTruth: false,
            canSeeOtherAgentsPrivateFacts: false,
            canRevealUnsolvedClues: false,
            canCreateNewFacts: false,
            canReferencePlayerNotes: false
          },
          lieStrategy: ["deny", "partial_truth"],
          pressureProfile: {
            baseline: 1,
            thresholds: { guarded: 2, cornered: 4 },
            increaseRules: [
              {
                id: "pressure-dry-key",
                clueIds: ["clue-dry-key"],
                factIds: ["fact-key-swapped"],
                contradictionIds: ["contradiction-rain-key"],
                topics: ["钥匙"],
                delta: 3,
                reason: "玩家指出备用钥匙不该保持干燥。"
              }
            ]
          },
          emotionalArc: {
            calm: "礼貌而谨慎。",
            guarded: "开始缩短回答。",
            cornered: "承认自己保管钥匙有漏洞。"
          },
          confrontationTriggers: ["钥匙", "雨水", "书房门锁"],
          confessionBoundary: ["最终指认前不得主动承认真凶身份。"],
          styleAnchors: ["恭敬", "回避"],
          personality: {
            speechStyle: "恭敬、谨慎、容易绕开关键细节。",
            emotionalBaseline: "紧张但保持礼貌。",
            stressResponse: "被问到钥匙时明显防御。",
            evasiveHabits: ["把责任推给混乱的雨夜。"]
          },
          knowledge: {
            publicFacts: ["他负责保管备用钥匙。"],
            privateFacts: ["他调换了备用钥匙。"],
            beliefs: ["只要没人注意钥匙干燥，就能蒙混过去。"]
          },
          boundaries: {
            hides: ["调换备用钥匙。"],
            liesAbout: ["钥匙一直在原处。"],
            forbiddenClaims: ["最终指认前不得说自己是真凶。"]
          },
          revealRules: [
            {
              id: "reveal-key-swap",
              factId: "fact-key-swapped",
              fact: "备用钥匙被调换过。",
              requiresClues: ["clue-dry-key"],
              requiresAllClues: ["clue-dry-key"],
              requiresAnyClues: [],
              requiresTopics: ["钥匙"],
              requiresPressureAtLeast: 4,
              requiresAct: "act-opening",
              requiresContradictions: ["contradiction-rain-key"],
              revealMode: "reluctant"
            }
          ]
        }
      ],
      clues: [
        {
          id: "clue-locked-room",
          title: "反锁书房",
          text: "书房门看上去从里面反锁。",
          tag: "clue",
          source: "story-keep",
          unlockHints: ["阅读第一章即可知道。"],
          unlock: {
            type: "story",
            topics: ["书房", "门锁"],
            factIds: ["fact-locked-room"]
          }
        },
        {
          id: "clue-dry-key",
          title: "干燥钥匙",
          text: "雨夜中备用钥匙没有水痕。",
          tag: "contradiction",
          source: "investigation-hide",
          unlockHints: ["调查书房门锁和备用钥匙。"],
          unlock: {
            type: "agent-response",
            agentId: "general",
            topics: ["钥匙", "门锁"],
            factIds: ["fact-key-swapped"]
          }
        }
      ],
      accusation: {
        questions: [
          {
            id: "question-culprit",
            prompt: "谁制造了书房反锁假象？",
            acceptedAnswers: ["管家"],
            explanation: "只有管家能接触并调换备用钥匙。"
          }
        ]
      }
    }
  };
}

describe("source adaptation", () => {
  it("extracts plain text and markdown files as source documents", async () => {
    const content = "第一章\n雨夜。".repeat(30);

    await expect(extractSourceDocument(sourceFile(content, "rain.md"))).resolves.toMatchObject({
      fileName: "rain.md",
      kind: "markdown",
      text: content
    });
  });

  it("builds a strict, flexible adaptation prompt instead of a fixed template prompt", () => {
    const messages = buildSourceAdaptationMessages({
      fileName: "rain.txt",
      kind: "text",
      text: "雨夜里，书房门从里面反锁。侦探发现备用钥匙上没有雨水。"
    });
    const joined = messages.map((message) => message.content).join("\n");

    expect(joined).toContain("sourceProfile");
    expect(joined).toContain("segmentation");
    expect(joined).toContain("story-keep");
    expect(joined).toContain("investigation-hide");
    expect(joined).toContain("storyEvents");
    expect(joined).toContain("instant-result");
    expect(joined).toContain("agent-state-change");
    expect(joined).toContain("story-beat");
    expect(joined).toContain("不能套用固定幕数");
    expect(joined).toContain("case-package/v1");
  });

  it("turns model output into a schema-valid case package with review metadata", async () => {
    const generated = await createCasePackageFromSource(
      {
        fileName: "rain.txt",
        kind: "text",
        text: "雨夜里，书房门从里面反锁。侦探发现备用钥匙上没有雨水。"
      },
      {
        generateText: async () => JSON.stringify(modelOutput())
      }
    );

    expect(generated.package.manifest.schemaVersion).toBe("case-package/v1");
    expect(generated.package.manifest.caseId).toBe("generated-rain-room");
    expect(generated.package.caseFile.agents.map((agent) => agent.id)).toEqual([
      "general",
      "butler"
    ]);
    expect(generated.package.caseFile.storyEvents.map((event) => event.kind)).toEqual([
      "instant-result"
    ]);
    expect(generated.segmentation.map((segment) => segment.label)).toEqual([
      "story-keep",
      "investigation-hide",
      "solution-lock"
    ]);
    expect(generated.validation.issues).toEqual([]);
  });
});
