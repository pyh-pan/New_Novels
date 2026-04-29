import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import InvestigationDesk from "../components/InvestigationDesk";

test("mobile bottom tabs switch primary workspace without losing state", () => {
  window.localStorage.clear();
  render(<InvestigationDesk storySlot={() => <section>Story workspace</section>} />);

  expect(screen.getByText("Story workspace")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "故事" })).toHaveAttribute(
    "aria-selected",
    "true"
  );

  fireEvent.click(screen.getByRole("tab", { name: "调查" }));
  expect(screen.getByRole("tab", { name: "调查" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  expect(screen.getByRole("heading", { name: "调查台" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: "笔记" }));
  expect(screen.getByRole("tab", { name: "笔记" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  expect(screen.getByRole("heading", { name: "侦探笔记" })).toBeInTheDocument();
});
