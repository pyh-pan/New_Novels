import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import InvestigationDesk from "../components/InvestigationDesk";

test("compact sidebar toggles reveal side workspaces without losing story state", () => {
  window.localStorage.clear();
  render(<InvestigationDesk storySlot={() => <section>Story workspace</section>} />);

  expect(screen.getByText("Story workspace")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "打开调查台" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "打开侦探笔记" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "打开调查台" }));
  expect(screen.getByRole("heading", { name: "调查台" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "收起调查台" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  fireEvent.click(screen.getByRole("button", { name: "打开侦探笔记" }));
  expect(screen.getByRole("heading", { name: "侦探笔记" })).toBeInTheDocument();
  expect(screen.getByText("Story workspace")).toBeInTheDocument();
});
