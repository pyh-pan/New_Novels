import { NextResponse } from "next/server";
import { z } from "zod";

import { guardInvestigationOutput } from "../../../lib/api/investigate-guard";
import { parseJsonRequest } from "../../../lib/api/request";
import { getModelName, getOpenAIClient } from "../../../lib/ai/openai";
import { buildAgentPrompt, defaultPlayerKnowledgeState } from "../../../lib/ai/prompts";
import {
  buildRuntimeContext,
  createAgentRuntime,
  parseAgentResponseContract,
  updateSessionForUserMessage
} from "../../../lib/agent-runtime";
import { hammerOfGodCase } from "../../../lib/case/hammer-of-god";
import { playerKnowledgeStateSchema } from "../../../lib/case/schema";

const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1)
});

const requestSchema = z.object({
  targetId: z.string().trim().min(1),
  message: z.string().trim().min(1),
  history: z.array(historyMessageSchema).default([]),
  playerState: playerKnowledgeStateSchema.default(defaultPlayerKnowledgeState)
});

const runtime = createAgentRuntime(hammerOfGodCase);

export async function POST(request: Request) {
  const parsed = await parseJsonRequest(request, requestSchema);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { targetId, message, history, playerState } = parsed.data;
  if (targetId === "unsupported") {
    return NextResponse.json({ error: "Investigation target unsupported." }, { status: 501 });
  }

  const target = runtime.getAgent(targetId);

  if (!target) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const session = updateSessionForUserMessage({
    runtime,
    session: runtime.getSession(targetId),
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
    globalContext: hammerOfGodCase.globalContext,
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

    const guardedContent = guardInvestigationOutput(
      responseContract.reply,
      runtime,
      runtimeContext
    );
    const payload: {
      content: string;
      revealedFactIds?: string[];
      suggestedClueIds?: string[];
      emotionalState?: string;
    } = { content: guardedContent };

    if (responseContract.revealedFactIds.length > 0) {
      payload.revealedFactIds = responseContract.revealedFactIds;
    }
    if (responseContract.suggestedClueIds.length > 0) {
      payload.suggestedClueIds = responseContract.suggestedClueIds;
    }
    if (responseContract.emotionalState !== "unknown") {
      payload.emotionalState = responseContract.emotionalState;
    }

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "AI response unavailable." }, { status: 503 });
  }
}
