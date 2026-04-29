import { NextResponse } from "next/server";
import { z } from "zod";

import { guardInvestigationOutput } from "../../../lib/api/investigate-guard";
import { parseJsonRequest } from "../../../lib/api/request";
import { getModelName, getOpenAIClient } from "../../../lib/ai/openai";
import { buildAgentPrompt, defaultPlayerKnowledgeState } from "../../../lib/ai/prompts";
import { hammerOfGodCase } from "../../../lib/case/hammer-of-god";
import { playerKnowledgeStateSchema } from "../../../lib/case/schema";

const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1)
});

const requestSchema = z.object({
  targetId: z.enum(["general", "wilfred", "simeon", "elizabeth", "joe", "unsupported"]),
  message: z.string().trim().min(1),
  history: z.array(historyMessageSchema).default([]),
  playerState: playerKnowledgeStateSchema.default(defaultPlayerKnowledgeState)
});

export async function POST(request: Request) {
  const parsed = await parseJsonRequest(request, requestSchema);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { targetId, message, history, playerState } = parsed.data;
  if (targetId === "unsupported") {
    return NextResponse.json({ error: "Investigation target unsupported." }, { status: 501 });
  }

  const target = hammerOfGodCase.agents.find((candidate) => candidate.id === targetId);

  if (!target) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const promptMessages = buildAgentPrompt({
    globalContext: hammerOfGodCase.globalContext,
    agent: target,
    playerState,
    history,
    message
  });

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: getModelName(),
      messages: promptMessages,
      temperature: 0.6
    });

    return NextResponse.json({
      content: guardInvestigationOutput(completion.choices[0]?.message.content, target)
    });
  } catch {
    return NextResponse.json({ error: "AI response unavailable." }, { status: 503 });
  }
}
