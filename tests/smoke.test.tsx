import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import InvestigationDesk from "../components/InvestigationDesk";
import NotebookDrawer, {
  type NotebookNote,
  type NoteFilter
} from "../components/NotebookDrawer";
import Page from "../app/page";

test("renders the scaffolded home page", () => {
  render(<Page />);

  expect(
    screen.getByRole("heading", { name: "New Novels" })
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /通用调查助手/ })).toHaveAttribute(
    "aria-expanded",
    "true"
  );
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
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ targetId: "general", label: "调查助手" })
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: "小锤很轻，和伤口严重程度不相称。" })
    });
  vi.stubGlobal("fetch", fetchMock);

  render(<InvestigationDesk storySlot={<section>Story</section>} />);

  const input = screen.getByLabelText("新的调查问题");
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

test("unsupported routed targets stay in the general module and do not call investigate", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({ targetId: "unsupported", label: "未配置调查对象" })
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<InvestigationDesk storySlot={<section>Story</section>} />);

  const input = screen.getByLabelText("新的调查问题");
  fireEvent.change(input, { target: { value: "问问村长" } });

  const form = input.closest("form");
  if (!form) {
    throw new Error("Expected investigation form");
  }

  fireEvent.submit(form);

  await waitFor(() => {
    expect(screen.getByText("这个对象还没有配置为可询问角色。")).toBeInTheDocument();
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("investigation submit is locked during routing and non-ok API errors use fallback path", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ targetId: "wilfred", label: "威尔弗里德牧师" })
    })
    .mockResolvedValueOnce({
      ok: false,
      json: async () => ({})
    });
  vi.stubGlobal("fetch", fetchMock);

  render(<InvestigationDesk storySlot={<section>Story</section>} />);

  const input = screen.getByLabelText("新的调查问题");
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

  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("investigation state persists across reloads and reset requires confirmation", async () => {
  window.localStorage.clear();
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ targetId: "general", label: "调查助手" })
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: "锤柄上没有明显血迹。" })
    });
  vi.stubGlobal("fetch", fetchMock);

  const { unmount } = render(<InvestigationDesk storySlot={<section>Story</section>} />);

  const input = screen.getByLabelText("新的调查问题");
  fireEvent.change(input, { target: { value: "看看锤柄" } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);

  await waitFor(() => {
    expect(screen.getByText("锤柄上没有明显血迹。")).toBeInTheDocument();
  });

  unmount();
  render(<InvestigationDesk storySlot={<section>Story</section>} />);
  expect(screen.getByText("锤柄上没有明显血迹。")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "重新开始" }));
  expect(screen.getByRole("dialog", { name: "重新开始调查？" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "取消" }));
  expect(screen.getByText("锤柄上没有明显血迹。")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "重新开始" }));
  fireEvent.click(screen.getByRole("button", { name: "确认重置" }));
  expect(screen.queryByText("锤柄上没有明显血迹。")).not.toBeInTheDocument();
});
