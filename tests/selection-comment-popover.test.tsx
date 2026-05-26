import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import SelectionCommentPopover, {
  SelectionAnnotationPreview
} from "../components/SelectionCommentPopover";

test("selection comment popover keeps the selected quote out of the input UI", () => {
  const onSubmit = vi.fn();
  const registry = new Map<string, unknown>();
  const range = document.createRange();
  const textNode = document.createTextNode("这段原文应该只进入笔记引用。");
  const sourceContainer = document.createElement("div");
  sourceContainer.appendChild(textNode);
  document.body.appendChild(sourceContainer);
  range.setStart(textNode, 0);
  range.setEnd(textNode, textNode.textContent?.length ?? 0);

  class TestHighlight {
    ranges: Range[];

    constructor(...ranges: Range[]) {
      this.ranges = ranges;
    }
  }

  Object.defineProperty(window, "Highlight", {
    configurable: true,
    value: TestHighlight
  });
  Object.defineProperty(window, "CSS", {
    configurable: true,
    value: {
      highlights: {
        set: (name: string, value: unknown) => registry.set(name, value),
        delete: (name: string) => registry.delete(name)
      }
    }
  });

  render(
    <SelectionCommentPopover
      target={{
        quote: "这段原文应该只进入笔记引用。",
        source: "第一章",
        x: 240,
        y: 240,
        range
      }}
      onSubmit={onSubmit}
      onClose={() => undefined}
    />
  );

  expect(
    within(screen.getByRole("form", { name: "选中文本批注" })).queryByText(
      /这段原文应该只进入笔记引用/
    )
  ).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("批注内容"), {
    target: { value: "这里是我的评论。" }
  });
  fireEvent.click(screen.getByRole("button", { name: "发送批注" }));

  expect(onSubmit).toHaveBeenCalledWith({
    quote: "这段原文应该只进入笔记引用。",
    comment: "这里是我的评论。",
    source: "第一章"
  });
  expect(registry.has("comment-annotations")).toBe(true);
});

test("hovering a saved annotation shows the submitted comment", async () => {
  const sourceContainer = document.createElement("div");
  const textNode = document.createTextNode("一段已经添加评论的原文。");
  sourceContainer.appendChild(textNode);
  document.body.appendChild(sourceContainer);

  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, textNode.textContent?.length ?? 0);
  Object.defineProperty(range, "getClientRects", {
    configurable: true,
    value: () => [
      {
        left: 10,
        right: 210,
        top: 20,
        bottom: 42,
        width: 200,
        height: 22,
        x: 10,
        y: 20,
        toJSON: () => undefined
      }
    ]
  });

  render(
    <>
      <SelectionCommentPopover
        target={{
          quote: "一段已经添加评论的原文。",
          source: "第一章",
          x: 240,
          y: 240,
          range
        }}
        onSubmit={() => undefined}
        onClose={() => undefined}
      />
      <SelectionAnnotationPreview />
    </>
  );

  fireEvent.change(screen.getByLabelText("批注内容"), {
    target: { value: "这条评论应该悬浮展示。" }
  });
  fireEvent.click(screen.getByRole("button", { name: "发送批注" }));
  fireEvent.mouseMove(window, { clientX: 50, clientY: 30 });

  await waitFor(() => {
    expect(screen.getByRole("dialog", { name: "批注内容" })).toHaveTextContent(
      "这条评论应该悬浮展示。"
    );
  });
});
