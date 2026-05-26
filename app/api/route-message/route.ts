import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJsonRequest } from "../../../lib/api/request";
import { getModelName, getOpenAIClient } from "../../../lib/ai/openai";
import { getDefaultCaseId, getRuntimeForCase } from "../../../lib/case/default-case";
import {
  getRouteableTargets,
  isRouteableTarget,
  labelForTarget,
  routeMessage
} from "../../../lib/game/routing";
import type { ConversationTarget, RoutedMessage } from "../../../lib/game/types";

const requestSchema = z.object({
  caseId: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1)
});

const semanticRouteSchema = z.object({
  targetId: z.string().trim().min(1),
  confidence: z.number().min(0).max(1),
  reason: z.string().trim().min(1)
});

const semanticConfidenceThreshold = 0.65;

function routingPrompt(message: string, runtime: ReturnType<typeof getRuntimeForCase>) {
  const targetDescriptions = runtime.caseFile.agents
    .map((agent) => {
      const aliases = agent.aliases.length ? `；别名：${agent.aliases.join("、")}` : "";
      return `- ${agent.id}：${agent.name}，${agent.role}${aliases}`;
    })
    .join("\n");

  return [
    {
      role: "system" as const,
      content: `你是互动推理游戏的语义路由器。只输出 JSON，不要输出解释文本。

可选 targetId：
${targetDescriptions}
- unsupported：没有配置的对象或无法识别的调查对象

输出格式：
{"targetId":"general","confidence":0.9,"reason":"简短原因"}`
    },
    {
      role: "user" as const,
      content: message
    }
  ];
}

function extractJson(content: string | null | undefined): unknown {
  const trimmed = content?.trim() ?? "";
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

function withLabel(
  route: z.infer<typeof semanticRouteSchema>,
  runtime: ReturnType<typeof getRuntimeForCase>
): RoutedMessage {
  return {
    targetId: route.targetId as ConversationTarget,
    label: labelForTarget(route.targetId as ConversationTarget, runtime),
    confidence: route.confidence,
    reason: route.reason
  };
}

async function semanticRouteMessage(
  message: string,
  runtime: ReturnType<typeof getRuntimeForCase>
): Promise<RoutedMessage | undefined> {
  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: getModelName(),
      messages: routingPrompt(message, runtime),
      temperature: 0
    });
    const parsed = semanticRouteSchema.safeParse(
      extractJson(completion.choices[0]?.message.content)
    );

    if (!parsed.success || parsed.data.confidence < semanticConfidenceThreshold) {
      return undefined;
    }

    if (
      !getRouteableTargets(runtime).includes(parsed.data.targetId) ||
      !isRouteableTarget(parsed.data.targetId, runtime)
    ) {
      return undefined;
    }

    return withLabel(parsed.data, runtime);
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  const parsed = await parseJsonRequest(request, requestSchema);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let runtime: ReturnType<typeof getRuntimeForCase>;
  try {
    runtime = getRuntimeForCase(parsed.data.caseId ?? getDefaultCaseId());
  } catch {
    return NextResponse.json({ error: "Unknown case." }, { status: 404 });
  }

  const semanticRoute = await semanticRouteMessage(parsed.data.message, runtime);

  return NextResponse.json(semanticRoute ?? routeMessage(parsed.data.message, runtime));
}
