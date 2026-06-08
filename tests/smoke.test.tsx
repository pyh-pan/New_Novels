import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import InvestigationDesk from "../components/InvestigationDesk";
import NotebookDrawer, {
  type NotebookNote,
  type NoteFilter
} from "../components/NotebookDrawer";
import Page from "../app/page";
import {
  createInitialPlayState,
  PLAY_STATE_STORAGE_KEY,
  serializePlayState
} from "../lib/game/play-state";

function openInvestigationDesk() {
  const toggle = screen.queryByRole("button", { name: "打开调查台" });
  if (toggle) {
    fireEvent.click(toggle);
  }
}

test("renders the scaffolded home page", () => {
  render(<Page />);

  expect(screen.getByRole("heading", { name: "推理故事书架" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "猎人小屋疑案 封面" })).toHaveAttribute(
    "href",
    "/cases/hunters-lodge"
  );
  expect(screen.getByRole("link", { name: "创作者工作台" })).toHaveAttribute(
    "href",
    "/studio"
  );
});

test("notebook focuses on tagged notes without separate hypothesis workspaces", () => {
  window.localStorage.clear();
  render(<InvestigationDesk storySlot={() => <section>Story</section>} />);

  fireEvent.click(screen.getByRole("button", { name: "打开侦探笔记" }));

  expect(screen.queryByText("推理假设")).not.toBeInTheDocument();
  expect(screen.queryByText("已识别矛盾")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "批注" })).toBeInTheDocument();
});

test("notebook notes can be edited, retagged, and filtered with selected semantics", () => {
  let notes: NotebookNote[] = [
    {
      id: "note-1",
      title: "Initial title",
      text: "Initial note text",
      tag: "clue",
      source: "现场调查",
      createdAt: "2026-04-29T00:00:00.000Z",
      updatedAt: "2026-04-29T00:00:00.000Z"
    }
  ];
  let activeTag: NoteFilter = "all";

  const renderNotebook = () =>
    render(
      <NotebookDrawer
        isOpen
        notes={notes}
        activeTag={activeTag}
        onToggle={() => undefined}
        onFilterChange={(tag) => {
          activeTag = tag;
        }}
        onUpdateNote={(id, updates) => {
          notes = notes.map((note) => (note.id === id ? { ...note, ...updates } : note));
        }}
        onCreateNote={() => undefined}
        onDeleteNote={() => undefined}
      />
    );

  const { rerender } = renderNotebook();

  expect(screen.getByRole("button", { name: "全部" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  expect(screen.queryByLabelText("笔记标题")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("笔记正文"), {
    target: { value: "Changed note text" }
  });
  fireEvent.change(screen.getByLabelText("笔记标签"), {
    target: { value: "contradiction" }
  });

  rerender(
    <NotebookDrawer
      isOpen
      notes={notes}
      activeTag="all"
      onToggle={() => undefined}
      onFilterChange={(tag) => {
        activeTag = tag;
      }}
      onUpdateNote={(id, updates) => {
        notes = notes.map((note) => (note.id === id ? { ...note, ...updates } : note));
      }}
      onCreateNote={() => undefined}
      onDeleteNote={() => undefined}
    />
  );

  expect(screen.getByDisplayValue("Changed note text")).toBeInTheDocument();
  expect(screen.getByLabelText("笔记标签")).toHaveValue("contradiction");

  fireEvent.click(screen.getByRole("button", { name: "矛盾" }));
  rerender(
    <NotebookDrawer
      isOpen
      notes={notes}
      activeTag={activeTag}
      onToggle={() => undefined}
      onFilterChange={(tag) => {
        activeTag = tag;
      }}
      onUpdateNote={(id, updates) => {
        notes = notes.map((note) => (note.id === id ? { ...note, ...updates } : note));
      }}
      onCreateNote={() => undefined}
      onDeleteNote={() => undefined}
    />
  );

  expect(screen.getByRole("button", { name: "矛盾" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  expect(screen.getByDisplayValue("Changed note text")).toBeInTheDocument();
});

test("empty conversation modules only rotate the toggle without opening a blank panel", () => {
  window.localStorage.clear();
  render(<InvestigationDesk storySlot={() => <section>Story</section>} />);
  openInvestigationDesk();

  const jappButton = screen.getByRole("button", { name: /贾普探长/ });
  const jappModule = jappButton.closest("article");

  fireEvent.click(jappButton);

  expect(jappButton).toHaveAttribute("aria-expanded", "false");
  expect(jappModule).toHaveClass("is-empty-toggled");
  expect(jappModule).not.toHaveClass("is-expanded");
});

test("general investigation questions stay in the general module", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({ content: "左轮失踪和开窗逃走的说法需要一起核对。" })
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<InvestigationDesk storySlot={() => <section>Story</section>} />);
  openInvestigationDesk();

  const input = screen.getByLabelText("调查问题");
  fireEvent.change(input, { target: { value: "我想看看左轮和窗户的关系" } });

  const form = input.closest("form");
  if (!form) {
    throw new Error("Expected investigation form");
  }

  fireEvent.submit(form);

  await waitFor(() => {
    expect(screen.getByText("左轮失踪和开窗逃走的说法需要一起核对。")).toBeInTheDocument();
  });

  expect(fetchMock).toHaveBeenLastCalledWith(
    "/api/investigate",
    expect.objectContaining({
      body: expect.stringContaining('"targetId":"general"')
    })
  );
});

test("mention menu inserts an agent and routes the message to that conversation", async () => {
  window.localStorage.clear();
  const fetchMock = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({ content: "我把那位黑胡子访客领进了枪房。" })
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<InvestigationDesk storySlot={() => <section>Story</section>} />);
  openInvestigationDesk();

  const input = screen.getByLabelText("调查问题");
  fireEvent.change(input, { target: { value: "@" } });

  expect(screen.getByRole("listbox", { name: "选择对话角色" })).toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole("option", { name: "米德尔顿太太" }));
  expect(input).toHaveValue("@米德尔顿太太 ");

  fireEvent.change(input, { target: { value: "@米德尔顿太太 你在哪里？" } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);

  await waitFor(() => {
    expect(screen.getByText("我把那位黑胡子访客领进了枪房。")).toBeInTheDocument();
  });

  expect(fetchMock).toHaveBeenCalledWith(
    "/api/investigate",
    expect.objectContaining({
      body: expect.stringContaining('"targetId":"middleton"')
    })
  );
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/investigate",
    expect.objectContaining({
      body: expect.stringContaining('"message":"你在哪里？"')
    })
  );
});

test("investigation patches player state, agent session, and unlocked act narrative", async () => {
  window.localStorage.clear();
  const fetchMock = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({
        content: "枪房、左轮和近距离枪伤需要放在一起看。",
        agentSession: {
          caseId: "hunters-lodge",
          agentId: "general",
          conversationId: "general",
          pressureLevel: 0,
          revealedFactIds: ["fact-missing-revolver"],
          lastTopics: ["左轮"],
          triggeredPressureRules: [],
          currentActAgentState: "calm",
          mood: "calm"
        },
        playerState: {
          currentActId: "act-testimony",
          discoveredClueIds: [
            "clue-middleton-testimony",
            "clue-locked-door-window",
            "clue-missing-revolver",
            "clue-close-shot"
          ],
          discoveredFactIds: [
            "fact-middleton-visitor-story",
            "fact-locked-door-open-window",
            "fact-missing-revolver",
            "fact-close-shot-behind"
          ],
          heardTestimonyIds: [],
          knownContradictionIds: [],
          sceneInteractionIds: ["scene-gun-room:尸体", "scene-gun-room:左轮手枪"],
          confrontedAgentIds: [],
          askedTopics: ["我想看看左轮和枪房的关系"],
          hypotheses: []
        },
        actGate: {
          nextActId: "act-testimony",
          nextChapterId: "chapter-2",
          unlockNarratives: [
            "你已经掌握现场、访客证词、左轮和枪伤方向。案件进入证词核查阶段。"
          ]
        }
      })
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<InvestigationDesk storySlot={({ currentChapterId }) => <section>{currentChapterId}</section>} />);
  openInvestigationDesk();

  const input = screen.getByLabelText("调查问题");
  fireEvent.change(input, { target: { value: "我想看看左轮和枪房的关系" } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);

  await waitFor(() => {
    expect(screen.getByText("枪房、左轮和近距离枪伤需要放在一起看。")).toBeInTheDocument();
  });

  expect(
    screen.getByText("你已经掌握现场、访客证词、左轮和枪伤方向。案件进入证词核查阶段。")
  ).toBeInTheDocument();
  expect(screen.getByText("chapter-2")).toBeInTheDocument();

  await waitFor(() => {
    const saved = JSON.parse(window.localStorage.getItem("new-novels.play-state.v1") ?? "{}");
    expect(saved.playerState.currentActId).toBe("act-testimony");
    expect(saved.agentSessions.general.revealedFactIds).toContain("fact-missing-revolver");
  });
});

test("npc session mood appears as player-facing state without exposing rules", async () => {
  window.localStorage.clear();
  const fetchMock = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({
        content: "我只是按吩咐办事。",
        agentSession: {
          caseId: "hunters-lodge",
          agentId: "middleton",
          conversationId: "middleton",
          pressureLevel: 6,
          revealedFactIds: [],
          lastTopics: ["介绍所"],
          triggeredPressureRules: ["middleton-origin-pressure"],
          currentActAgentState: "guarded",
          mood: "guarded"
        },
        playerState: {
          currentActId: "act-opening",
          discoveredClueIds: [],
          discoveredFactIds: [],
          heardTestimonyIds: [],
          knownContradictionIds: [],
          sceneInteractionIds: [],
          confrontedAgentIds: ["middleton"],
          askedTopics: ["问米德尔顿太太怎么来的"],
          hypotheses: []
        }
      })
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<InvestigationDesk storySlot={() => <section>Story</section>} />);
  openInvestigationDesk();

  const input = screen.getByLabelText("调查问题");
  fireEvent.change(input, { target: { value: "@米德尔顿太太 你怎么来的" } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);

  await waitFor(() => {
    expect(screen.getByText("状态：谨慎")).toBeInTheDocument();
  });

  expect(screen.queryByText(/middleton-origin-pressure/)).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/investigate",
    expect.objectContaining({
      body: expect.stringContaining('"targetId":"middleton"')
    })
  );
});

test("unknown mentions fall back to the general assistant", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({ content: "我会先从已知信息里整理这个问题。" })
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<InvestigationDesk storySlot={() => <section>Story</section>} />);
  openInvestigationDesk();

  const input = screen.getByLabelText("调查问题");
  fireEvent.change(input, { target: { value: "@村长 他看到了什么" } });

  const form = input.closest("form");
  if (!form) {
    throw new Error("Expected investigation form");
  }

  fireEvent.submit(form);

  await waitFor(() => {
    expect(screen.getByText("我会先从已知信息里整理这个问题。")).toBeInTheDocument();
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/investigate",
    expect.objectContaining({
      body: expect.stringContaining('"targetId":"general"')
    })
  );
});

test("investigation submit is locked during request and non-ok API errors use fallback path", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({
    ok: false,
    json: async () => ({})
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<InvestigationDesk storySlot={() => <section>Story</section>} />);
  openInvestigationDesk();

  const input = screen.getByLabelText("调查问题");
  fireEvent.change(input, { target: { value: "询问米德尔顿太太怎么来的" } });

  const form = input.closest("form");
  if (!form) {
    throw new Error("Expected investigation form");
  }

  fireEvent.submit(form);
  fireEvent.submit(form);

  await waitFor(() => {
    expect(screen.getByText("请求失败。")).toBeInTheDocument();
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("investigation state persists across reloads and reset requires confirmation", async () => {
  window.localStorage.clear();
  const fetchMock = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({ content: "墙上的左轮少了一支。" })
  });
  vi.stubGlobal("fetch", fetchMock);

  const { unmount } = render(<InvestigationDesk storySlot={() => <section>Story</section>} />);
  openInvestigationDesk();

  const input = screen.getByLabelText("调查问题");
  fireEvent.change(input, { target: { value: "看看左轮" } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);

  await waitFor(() => {
    expect(screen.getByText("墙上的左轮少了一支。")).toBeInTheDocument();
  });

  unmount();
  render(<InvestigationDesk storySlot={() => <section>Story</section>} />);
  openInvestigationDesk();
  expect(screen.getByText("墙上的左轮少了一支。")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "重新开始" }));
  expect(screen.getByRole("dialog", { name: "重新开始调查？" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "取消" }));
  expect(screen.getByText("墙上的左轮少了一支。")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "重新开始" }));
  fireEvent.click(screen.getByRole("button", { name: "确认重置" }));
  expect(screen.queryByText("锤柄上没有明显血迹。")).not.toBeInTheDocument();
});

test("saved comment notes are passed back to the story slot as annotations", async () => {
  const savedState = createInitialPlayState();
  savedState.notes = [
    {
      id: "note-comment",
      title: "批注 1",
      text: "验证高亮恢复",
      tag: "comment",
      source: "猎人小屋疑案 · 第一章 病榻上的委托",
      quote: "波洛病倒在伦敦的时候",
      createdAt: "2026-06-04T00:00:00.000Z",
      updatedAt: "2026-06-04T00:00:00.000Z"
    }
  ];
  window.localStorage.setItem(PLAY_STATE_STORAGE_KEY, serializePlayState(savedState));

  render(
    <InvestigationDesk
      storySlot={({ annotations }) => (
        <section aria-label="Story">{annotations[0]?.quote ?? "no annotation"}</section>
      )}
    />
  );

  await waitFor(() => {
    expect(screen.getByText("波洛病倒在伦敦的时候")).toBeInTheDocument();
  });
});

test("reset utility does not render over the open notebook drawer", () => {
  window.localStorage.clear();
  render(<InvestigationDesk storySlot={() => <section>Story</section>} />);

  expect(screen.queryByRole("button", { name: "重新开始" })).not.toBeInTheDocument();
  openInvestigationDesk();
  expect(screen.getByRole("button", { name: "重新开始" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "打开侦探笔记" }));

  expect(screen.getByRole("button", { name: "新建笔记" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "重新开始" })).toBeInTheDocument();
});

test("conversation input sends with Enter and keeps Shift+Enter for line breaks", async () => {
  window.localStorage.clear();
  const fetchMock = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({ content: "现场没有明显拖拽痕迹。" })
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<InvestigationDesk storySlot={() => <section>Story</section>} />);
  openInvestigationDesk();

  const input = screen.getByLabelText("调查问题");
  fireEvent.change(input, { target: { value: "第一行" } });
  fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
  expect(fetchMock).not.toHaveBeenCalled();

  fireEvent.change(input, { target: { value: "现场有没有拖拽痕迹" } });
  fireEvent.keyDown(input, { key: "Enter" });

  await waitFor(() => {
    expect(screen.getByText("现场没有明显拖拽痕迹。")).toBeInTheDocument();
  });

  expect(screen.queryByRole("button", { name: "摘录这条回复" })).not.toBeInTheDocument();
});
