import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import NotebookDrawer, {
  type NotebookNote,
  type NoteFilter
} from "../components/NotebookDrawer";

function renderNotebook(initialNotes: NotebookNote[] = []) {
  let notes = initialNotes;
  let activeTag: NoteFilter = "all";

  const handlers = {
    onToggle: vi.fn(),
    onFilterChange: vi.fn((tag: NoteFilter) => {
      activeTag = tag;
    }),
    onUpdateNote: vi.fn((id: string, updates: Partial<NotebookNote>) => {
      notes = notes.map((note) =>
        note.id === id ? { ...note, ...updates, updatedAt: "updated" } : note
      );
    }),
    onCreateNote: vi.fn(() => {
      notes = [
        {
          id: "created-note",
          title: "新笔记",
          text: "",
          tag: "clue",
          source: "手动记录",
          createdAt: "2026-04-29T00:00:00.000Z",
          updatedAt: "2026-04-29T00:00:00.000Z"
        },
        ...notes
      ];
    }),
    onDeleteNote: vi.fn((id: string) => {
      notes = notes.filter((note) => note.id !== id);
    })
  };

  const view = render(
    <NotebookDrawer
      isOpen
      notes={notes}
      activeTag={activeTag}
      {...handlers}
    />
  );

  return { ...view, handlers, getNotes: () => notes, getActiveTag: () => activeTag };
}

test("creates a manual note from the notebook", () => {
  const view = renderNotebook();

  fireEvent.click(screen.getByRole("button", { name: "新建笔记" }));

  expect(view.handlers.onCreateNote).toHaveBeenCalledTimes(1);
});

test("deletes notes only after confirmation", () => {
  const view = renderNotebook([
    {
      id: "note-1",
      title: "线索",
      text: "左轮少了一支",
      tag: "clue",
      source: "调查助手",
      createdAt: "2026-04-29T00:00:00.000Z",
      updatedAt: "2026-04-29T00:00:00.000Z"
    }
  ]);

  const deleteButton = screen.getByRole("button", { name: "删除笔记：线索，调查助手" });
  expect(deleteButton).not.toHaveTextContent("删除");

  fireEvent.click(deleteButton);
  expect(screen.getByRole("dialog", { name: "删除这条笔记？" })).toBeInTheDocument();
  expect(view.handlers.onDeleteNote).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "确认删除" }));
  expect(view.handlers.onDeleteNote).toHaveBeenCalledWith("note-1");
});

test("renders quoted source text as a collapsible reference", () => {
  renderNotebook([
    {
      id: "note-quote",
      title: "阅读批注",
      text: "这里可能是时间线的关键。",
      tag: "comment",
      source: "第一章",
      quote: "黑斯廷斯在病榻上收到请托。",
      createdAt: "2026-04-29T00:00:00.000Z",
      updatedAt: "2026-04-29T00:00:00.000Z"
    }
  ]);

  expect(screen.getByDisplayValue("这里可能是时间线的关键。")).toBeInTheDocument();
  expect(screen.getByText("第一章")).toBeInTheDocument();
  expect(screen.getByText("黑斯廷斯在病榻上收到请托。")).toBeInTheDocument();
});

test("note body textarea grows to match edited content", () => {
  const view = renderNotebook([
    {
      id: "note-auto-height",
      title: "线索",
      text: "一行",
      tag: "clue",
      source: "手动记录",
      createdAt: "2026-04-29T00:00:00.000Z",
      updatedAt: "2026-04-29T00:00:00.000Z"
    }
  ]);
  const textarea = screen.getByLabelText("笔记正文") as HTMLTextAreaElement;
  Object.defineProperty(textarea, "scrollHeight", {
    configurable: true,
    value: 72
  });

  expect(textarea).toHaveAttribute("rows", "1");

  fireEvent.change(textarea, { target: { value: "第一行\n第二行\n第三行" } });

  expect(textarea.style.height).toBe("72px");
  expect(view.handlers.onUpdateNote).toHaveBeenCalledWith("note-auto-height", {
    text: "第一行\n第二行\n第三行"
  });
});
