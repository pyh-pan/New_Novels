import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import InvestigationDesk from "../components/InvestigationDesk";
import NotebookDrawer, {
  type NotebookNote,
  type NoteFilter
} from "../components/NotebookDrawer";
import Page from "../app/page";

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

  fireEvent.change(screen.getByLabelText("笔记标题"), {
    target: { value: "Changed title" }
  });
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

  expect(screen.getByDisplayValue("Changed title")).toBeInTheDocument();
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
  expect(screen.getByDisplayValue("Changed title")).toBeInTheDocument();
});

test("general investigation questions stay in the general module", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({ content: "小锤很轻，和伤口严重程度不相称。" })
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<InvestigationDesk storySlot={() => <section>Story</section>} />);
  openInvestigationDesk();

  const input = screen.getByLabelText("调查问题");
  fireEvent.change(input, { target: { value: "我想看看锤子和伤口的关系" } });

  const form = input.closest("form");
  if (!form) {
    throw new Error("Expected investigation form");
  }

  fireEvent.submit(form);

  await waitFor(() => {
    expect(screen.getByText("小锤很轻，和伤口严重程度不相称。")).toBeInTheDocument();
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
    json: async () => ({ content: "我当时在钟楼下面。" })
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<InvestigationDesk storySlot={() => <section>Story</section>} />);
  openInvestigationDesk();

  const input = screen.getByLabelText("调查问题");
  fireEvent.change(input, { target: { value: "@" } });

  expect(screen.getByRole("listbox", { name: "选择对话角色" })).toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole("option", { name: "威尔弗里德牧师" }));
  expect(input).toHaveValue("@威尔弗里德牧师 ");

  fireEvent.change(input, { target: { value: "@威尔弗里德牧师 你在哪里？" } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);

  await waitFor(() => {
    expect(screen.getByText("我当时在钟楼下面。")).toBeInTheDocument();
  });

  expect(fetchMock).toHaveBeenCalledWith(
    "/api/investigate",
    expect.objectContaining({
      body: expect.stringContaining('"targetId":"wilfred"')
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
        content: "小锤很轻，钟楼高度让这个矛盾变得重要。",
        agentSession: {
          caseId: "hammer-of-god",
          agentId: "general",
          conversationId: "general",
          pressureLevel: 0,
          revealedFactIds: ["fact-small-hammer-weight"],
          lastTopics: ["小锤"],
          triggeredPressureRules: [],
          currentActAgentState: "calm",
          mood: "calm"
        },
        playerState: {
          currentActId: "act-testimony",
          discoveredClueIds: ["small-hammer", "tower-height"],
          discoveredFactIds: ["fact-small-hammer-weight", "fact-tower-overlooks-scene"],
          heardTestimonyIds: [],
          knownContradictionIds: ["contradiction-hammer-force"],
          sceneInteractionIds: ["scene-smithy-road:small-hammer"],
          confrontedAgentIds: [],
          askedTopics: ["我想看看锤子和伤口的关系"],
          hypotheses: []
        },
        actGate: {
          nextActId: "act-testimony",
          nextChapterId: "chapter-2",
          unlockNarratives: [
            "你已经发现小锤重量与伤势力度的矛盾，可以开始追问各人的证词。"
          ]
        }
      })
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<InvestigationDesk storySlot={({ currentChapterId }) => <section>{currentChapterId}</section>} />);
  openInvestigationDesk();

  const input = screen.getByLabelText("调查问题");
  fireEvent.change(input, { target: { value: "我想看看锤子和伤口的关系" } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);

  await waitFor(() => {
    expect(screen.getByText("小锤很轻，钟楼高度让这个矛盾变得重要。")).toBeInTheDocument();
  });

  expect(
    screen.getByText("你已经发现小锤重量与伤势力度的矛盾，可以开始追问各人的证词。")
  ).toBeInTheDocument();
  expect(screen.getByText("chapter-2")).toBeInTheDocument();

  await waitFor(() => {
    const saved = JSON.parse(window.localStorage.getItem("new-novels.play-state.v1") ?? "{}");
    expect(saved.playerState.currentActId).toBe("act-testimony");
    expect(saved.agentSessions.general.revealedFactIds).toContain("fact-small-hammer-weight");
  });
});

test("npc session mood appears as player-facing state without exposing rules", async () => {
  window.localStorage.clear();
  const fetchMock = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({
        content: "我只是在下面祈祷。",
        agentSession: {
          caseId: "hammer-of-god",
          agentId: "wilfred",
          conversationId: "wilfred",
          pressureLevel: 3,
          revealedFactIds: [],
          lastTopics: ["钟楼"],
          triggeredPressureRules: ["wilfred-tower-contradiction"],
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
          confrontedAgentIds: ["wilfred"],
          askedTopics: ["问威尔弗里德他在哪里"],
          hypotheses: []
        }
      })
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<InvestigationDesk storySlot={() => <section>Story</section>} />);
  openInvestigationDesk();

  const input = screen.getByLabelText("调查问题");
  fireEvent.change(input, { target: { value: "@威尔弗里德牧师 他在哪里" } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);

  await waitFor(() => {
    expect(screen.getByText("状态：谨慎")).toBeInTheDocument();
  });

  expect(screen.queryByText(/wilfred-tower-contradiction/)).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/investigate",
    expect.objectContaining({
      body: expect.stringContaining('"targetId":"wilfred"')
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
  fireEvent.change(input, { target: { value: "询问威尔弗里德在哪里" } });

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
    json: async () => ({ content: "锤柄上没有明显血迹。" })
  });
  vi.stubGlobal("fetch", fetchMock);

  const { unmount } = render(<InvestigationDesk storySlot={() => <section>Story</section>} />);
  openInvestigationDesk();

  const input = screen.getByLabelText("调查问题");
  fireEvent.change(input, { target: { value: "看看锤柄" } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);

  await waitFor(() => {
    expect(screen.getByText("锤柄上没有明显血迹。")).toBeInTheDocument();
  });

  unmount();
  render(<InvestigationDesk storySlot={() => <section>Story</section>} />);
  openInvestigationDesk();
  expect(screen.getByText("锤柄上没有明显血迹。")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "重新开始" }));
  expect(screen.getByRole("dialog", { name: "重新开始调查？" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "取消" }));
  expect(screen.getByText("锤柄上没有明显血迹。")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "重新开始" }));
  fireEvent.click(screen.getByRole("button", { name: "确认重置" }));
  expect(screen.queryByText("锤柄上没有明显血迹。")).not.toBeInTheDocument();
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

test("conversation input supports keyboard submit without inline note extraction controls", async () => {
  window.localStorage.clear();
  const fetchMock = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({ content: "现场没有明显拖拽痕迹。" })
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<InvestigationDesk storySlot={() => <section>Story</section>} />);
  openInvestigationDesk();

  const input = screen.getByLabelText("调查问题");
  fireEvent.change(input, { target: { value: "现场有没有拖拽痕迹" } });
  fireEvent.keyDown(input, { key: "Enter", metaKey: true });

  await waitFor(() => {
    expect(screen.getByText("现场没有明显拖拽痕迹。")).toBeInTheDocument();
  });

  expect(screen.queryByRole("button", { name: "摘录这条回复" })).not.toBeInTheDocument();
});
