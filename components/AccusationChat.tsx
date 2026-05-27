"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import AppLink from "./AppLink";
import { fetchAppPath } from "../lib/app/runtime-paths";

type AccusationMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type AccusationState = "answering" | "wrong" | "solved";

type AccuseGetResponse = {
  questionIndex: number;
  prompt: string;
};

type AccusePostResponse =
  | { status: "wrong" }
  | {
      status: "solved";
      truth?: {
        culpritName: string;
        method: string;
        motive: string;
        decisiveEvidence: string[];
      };
    }
  | { status: "next"; questionIndex: number; prompt: string };

function createMessage(role: AccusationMessage["role"], content: string): AccusationMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content
  };
}

type AccusationChatProps = {
  caseId?: string;
  continueHref?: string;
  endHref?: string;
};

export default function AccusationChat({
  caseId,
  continueHref = caseId ? `/cases/${caseId}` : "/",
  endHref = "/"
}: AccusationChatProps) {
  const [messages, setMessages] = useState<AccusationMessage[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<AccusationState>("answering");
  const [truth, setTruth] = useState<
    Extract<AccusePostResponse, { status: "solved" }>["truth"] | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const submitInFlightRef = useRef(false);

  useEffect(() => {
    let isActive = true;

    async function loadFirstQuestion() {
      try {
        const url = caseId ? `/api/accuse?caseId=${encodeURIComponent(caseId)}` : "/api/accuse";
        const response = await fetchAppPath(url);
        if (!response.ok) {
          throw new Error("Failed to load accusation question.");
        }

        const data = (await response.json()) as AccuseGetResponse;
        if (!isActive) {
          return;
        }

        setQuestionIndex(data.questionIndex);
        setMessages([createMessage("assistant", data.prompt)]);
      } catch {
        if (isActive) {
          setError("无法载入最终质询。请返回调查后再试。");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadFirstQuestion();

    return () => {
      isActive = false;
    };
  }, [caseId]);

  async function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer || isLoading || state !== "answering" || submitInFlightRef.current) {
      return;
    }

    submitInFlightRef.current = true;
    setIsLoading(true);
    setError("");
    setAnswer("");

    try {
      const response = await fetchAppPath("/api/accuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, questionIndex, answer: trimmedAnswer })
      });

      if (!response.ok) {
        throw new Error("Failed to submit accusation answer.");
      }

      const result = (await response.json()) as AccusePostResponse;

      if (result.status === "wrong") {
        setMessages((current) => [...current, createMessage("user", trimmedAnswer)]);
        setState("wrong");
        return;
      }

      if (result.status === "solved") {
        setMessages((current) => [...current, createMessage("user", trimmedAnswer)]);
        setTruth(result.truth ?? null);
        setState("solved");
        return;
      }

      setQuestionIndex(result.questionIndex);
      setMessages((current) => [
        ...current,
        createMessage("user", trimmedAnswer),
        createMessage("assistant", result.prompt)
      ]);
    } catch {
      setAnswer(trimmedAnswer);
      setError("回答提交失败。请稍后再试。");
    } finally {
      submitInFlightRef.current = false;
      setIsLoading(false);
    }
  }

  return (
    <main className="accusation-shell">
      <section className="accusation-card" aria-labelledby="accusation-title">
        <header className="accusation-header">
          <h1 id="accusation-title">最终指认</h1>
        </header>

        <div className="accusation-messages" aria-live="polite">
          {messages.map((message) => (
            <div
              className={`accusation-bubble accusation-bubble-${message.role}`}
              key={message.id}
            >
              <p>{message.content}</p>
            </div>
          ))}

          {isLoading && messages.length === 0 ? (
            <div className="accusation-bubble accusation-bubble-assistant">
              <p>正在整理最后的问题...</p>
            </div>
          ) : null}
        </div>

        {error ? <p className="accusation-error">{error}</p> : null}

        {state === "wrong" ? (
          <div className="accusation-result accusation-result-wrong" role="alertdialog">
            <h2>回答错误</h2>
            <p>这项指控还缺少可靠证据。回到案卷，重新核对证词与现场细节。</p>
            <AppLink className="accusation-action" href={continueHref}>
              继续调查
            </AppLink>
          </div>
        ) : null}

        {state === "solved" ? (
          <div className="accusation-result accusation-result-solved">
            <h2>真相大白</h2>
            <p>所有关键问题都已答对，最后的推理成立。</p>
            {truth ? (
              <div className="truth-summary" aria-label="案件真相摘要">
                <dl>
                  <div>
                    <dt>真凶</dt>
                    <dd>{truth.culpritName}</dd>
                  </div>
                  <div>
                    <dt>手法</dt>
                    <dd>{truth.method}</dd>
                  </div>
                  <div>
                    <dt>动机</dt>
                    <dd>{truth.motive}</dd>
                  </div>
                </dl>
                <ul>
                  {truth.decisiveEvidence.map((evidence) => (
                    <li key={evidence}>{evidence}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <AppLink className="accusation-action" href={endHref}>
              结束游戏
            </AppLink>
          </div>
        ) : null}

        {state === "answering" ? (
          <form className="accusation-form" onSubmit={submitAnswer}>
            <label className="sr-only" htmlFor="accusation-answer">
              回答
            </label>
            <div className="accusation-input-row">
              <textarea
                id="accusation-answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                disabled={isLoading}
                placeholder="回答"
                rows={3}
              />
              <button type="submit" disabled={isLoading || answer.trim().length === 0}>
                提交
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </main>
  );
}
