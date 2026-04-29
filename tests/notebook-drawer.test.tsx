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
      text: "小锤很轻",
      tag: "clue",
      source: "调查助手",
      createdAt: "2026-04-29T00:00:00.000Z",
      updatedAt: "2026-04-29T00:00:00.000Z"
    }
  ]);

  fireEvent.click(screen.getByRole("button", { name: "删除笔记：线索" }));
  expect(screen.getByRole("dialog", { name: "删除这条笔记？" })).toBeInTheDocument();
  expect(view.handlers.onDeleteNote).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "确认删除" }));
  expect(view.handlers.onDeleteNote).toHaveBeenCalledWith("note-1");
});
