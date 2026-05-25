import { NextResponse } from "next/server";
import { z } from "zod";

import { guardInvestigationOutput } from "../../../lib/api/investigate-guard";
import { parseJsonRequest } from "../../../lib/api/request";
import { getModelName, getOpenAIClient } from "../../../lib/ai/openai";
import { buildAgentPrompt, defaultPlayerKnowledgeState } from "../../../lib/ai/prompts";
import {
  applyAgentResponseContractToState,
  buildRuntimeContext,
  evaluateActGates,
  type AgentSession,
  parseAgentResponseContract,
  updateSessionForUserMessage
} from "../../../lib/agent-runtime";
import { getDefaultCase, getDefaultRuntime } from "../../../lib/case/default-case";
import { playerKnowledgeStateSchema } from "../../../lib/case/schema";

const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1)
});

const agentSessionSchema = z.object({
  caseId: z.string().trim().min(1),
  agentId: z.string().trim().min(1),
  conversationId: z.string().trim().min(1),
  pressureLevel: z.number().int().min(0),
  revealedFactIds: z.array(z.string()).default([]),
  lastTopics: z.array(z.string()).default([]),
  triggeredPressureRules: z.array(z.string()).default([]),
  currentActAgentState: z.string().optional(),
  mood: z.enum(["calm", "guarded", "cornered"])
});

const requestSchema = z.object({
  targetId: z.string().trim().min(1),
  message: z.string().trim().min(1),
  history: z.array(historyMessageSchema).default([]),
  playerState: playerKnowledgeStateSchema.default(defaultPlayerKnowledgeState),
  agentSession: agentSessionSchema.optional()
});

const caseFile = getDefaultCase();
const runtime = getDefaultRuntime();

function nextChapterIdForAct(nextActId: string): string | undefined {
  const actIndex = caseFile.acts.findIndex((act) => act.id === nextActId);
  return actIndex >= 0 ? caseFile.chapters[actIndex]?.id : undefined;
}

export async function POST(request: Request) {
  const parsed = await parseJsonRequest(request, requestSchema);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { targetId, message, history, playerState, agentSession } = parsed.data;
  if (targetId === "unsupported") {
    return NextResponse.json({ error: "Investigation target unsupported." }, { status: 501 });
  }

  const target = runtime.getAgent(targetId);

  if (!target) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const session = updateSessionForUserMessage({
    runtime,
    session:
      agentSession && agentSession.agentId === targetId
        ? (agentSession as AgentSession)
        : runtime.getSession(targetId),
    message,
    playerState
  });
  const runtimeContext = buildRuntimeContext({
    runtime,
    agentId: targetId,
    playerState,
    session
  });
  const promptMessages = buildAgentPrompt({
    caseTitle: caseFile.title,
    globalContext: caseFile.globalContext,
    agent: target,
    playerState,
    history,
    message,
    runtimeContext
  });

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: getModelName(),
      messages: promptMessages,
      temperature: 0.6
    });

    const responseContract = parseAgentResponseContract(completion.choices[0]?.message.content);

    const applied = applyAgentResponseContractToState({
      runtime,
      agentId: targetId,
      session,
      playerState,
      response: responseContract
    });
    const postResponseContext = buildRuntimeContext({
      runtime,
      agentId: targetId,
      playerState: applied.playerState,
      session: applied.session
    });
    const guardedContent = guardInvestigationOutput(
      responseContract.reply,
      runtime,
      postResponseContext
    );
    const actGate = evaluateActGates({
      runtime,
      playerState: applied.playerState,
      npcInteractionIds: [...new Set([...applied.playerState.confrontedAgentIds, targetId])],
      sceneInteractionIds: applied.playerState.sceneInteractionIds
    });
    const nextChapterId = actGate.nextActId
      ? nextChapterIdForAct(actGate.nextActId)
      : undefined;
    const nextPlayerState = actGate.nextActId
      ? { ...applied.playerState, currentActId: actGate.nextActId }
      : applied.playerState;
    const payload: {
      content: string;
      revealedFactIds?: string[];
      suggestedClueIds?: string[];
      revealedContradictionIds?: string[];
      emotionalState?: string;
      agentSession: AgentSession;
      playerState: typeof nextPlayerState;
      actGate?: {
        unlockedGateIds: string[];
        nextActId: string;
        nextChapterId?: string;
        unlockNarratives: string[];
      };
    } = {
      content: guardedContent,
      agentSession: applied.session,
      playerState: nextPlayerState
    };

    if (responseContract.revealedFactIds.length > 0) {
      payload.revealedFactIds = responseContract.revealedFactIds;
    }
    if (responseContract.suggestedClueIds.length > 0) {
      payload.suggestedClueIds = responseContract.suggestedClueIds;
    }
    if (responseContract.revealedContradictionIds.length > 0) {
      payload.revealedContradictionIds = responseContract.revealedContradictionIds;
    }
    if (responseContract.emotionalState !== "unknown") {
      payload.emotionalState = responseContract.emotionalState;
    }
    if (actGate.nextActId) {
      payload.actGate = {
        unlockedGateIds: actGate.unlockedGateIds,
        nextActId: actGate.nextActId,
        nextChapterId,
        unlockNarratives: actGate.unlockNarratives
      };
    }

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "AI response unavailable." }, { status: 503 });
  }
}
