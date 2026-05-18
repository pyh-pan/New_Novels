import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJsonRequest } from "../../../lib/api/request";
import { getModelName, getOpenAIClient } from "../../../lib/ai/openai";
import { createAgentRuntime } from "../../../lib/agent-runtime";
import { hammerOfGodCase } from "../../../lib/case/hammer-of-god";
import {
  labelForTarget,
  routeMessage,
  routeableTargets
} from "../../../lib/game/routing";
import type { ConversationTarget, RoutedMessage } from "../../../lib/game/types";

const requestSchema = z.object({
  message: z.string().trim().min(1)
});

const semanticRouteSchema = z.object({
  targetId: z.enum(["general", "wilfred", "simeon", "elizabeth", "joe", "unsupported"]),
  confidence: z.number().min(0).max(1),
  reason: z.string().trim().min(1)
});

const semanticConfidenceThreshold = 0.65;
const runtime = createAgentRuntime(hammerOfGodCase);

function routingPrompt(message: string) {
  return [
    {
      role: "system" as const,
      content: `你是互动推理游戏的语义路由器。只输出 JSON，不要输出解释文本。

可选 targetId：
- general：现场、线索、物证、关系、推理方向、整理已知信息
- wilfred：威尔弗里德、牧师、神职人员、死者弟弟
- simeon：铁匠、西米恩
- elizabeth：伊丽莎白、铁匠妻子
- joe：疯乔
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

function withLabel(route: z.infer<typeof semanticRouteSchema>): RoutedMessage {
  return {
    targetId: route.targetId as ConversationTarget,
    label: labelForTarget(route.targetId as ConversationTarget),
    confidence: route.confidence,
    reason: route.reason
  };
}

async function semanticRouteMessage(message: string): Promise<RoutedMessage | undefined> {
  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: getModelName(),
      messages: routingPrompt(message),
      temperature: 0
    });
    const parsed = semanticRouteSchema.safeParse(
      extractJson(completion.choices[0]?.message.content)
    );

    if (!parsed.success || parsed.data.confidence < semanticConfidenceThreshold) {
      return undefined;
    }

    if (
      !routeableTargets.includes(parsed.data.targetId) ||
      (parsed.data.targetId !== "unsupported" && !runtime.getAgent(parsed.data.targetId))
    ) {
      return undefined;
    }

    return withLabel(parsed.data);
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  const parsed = await parseJsonRequest(request, requestSchema);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const semanticRoute = await semanticRouteMessage(parsed.data.message);

  return NextResponse.json(semanticRoute ?? routeMessage(parsed.data.message));
}
