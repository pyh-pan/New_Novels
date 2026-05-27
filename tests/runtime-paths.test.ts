import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { createElement } from "react";
import AppLink from "../components/AppLink";
import { getRuntimeBasePath, withRuntimeBasePath } from "../lib/app/runtime-paths";

const originalUrl = window.location.href;

afterEach(() => {
  document.querySelector("base")?.remove();
  document.querySelector('meta[name="new-novels-entry-path"]')?.remove();
  window.history.pushState({}, "", originalUrl);
});

describe("runtime path helpers", () => {
  it("keeps local app paths unchanged without a platform prefix", () => {
    window.history.pushState({}, "", "/");

    expect(withRuntimeBasePath("/cases/hunters-lodge")).toBe("/cases/hunters-lodge");
    expect(withRuntimeBasePath("/api/investigate")).toBe("/api/investigate");
  });

  it("uses the current entry page as the app base when no route suffix is present", () => {
    window.history.pushState({}, "", "/workspace/app-123/");

    expect(getRuntimeBasePath()).toBe("/workspace/app-123");
    expect(withRuntimeBasePath("/cases/hunters-lodge")).toBe(
      "/workspace/app-123/cases/hunters-lodge"
    );
    expect(withRuntimeBasePath("/api/investigate")).toBe(
      "/workspace/app-123/api/investigate"
    );
    expect(withRuntimeBasePath("/")).toBe("/workspace/app-123/");
  });

  it("infers the same app base from nested story routes", () => {
    window.history.pushState({}, "", "/workspace/app-123/cases/hunters-lodge");

    expect(getRuntimeBasePath()).toBe("/workspace/app-123");
    expect(withRuntimeBasePath("/studio")).toBe("/workspace/app-123/studio");
  });

  it("prefers the platform-provided base element when available", () => {
    const base = document.createElement("base");
    base.href = "/mounted/entry/";
    document.head.appendChild(base);
    window.history.pushState({}, "", "/mounted/entry/cases/hunters-lodge");

    expect(getRuntimeBasePath()).toBe("/mounted/entry");
    expect(withRuntimeBasePath("/api/investigate")).toBe("/mounted/entry/api/investigate");
  });

  it("prefers the server-provided entry path over route inference", () => {
    const meta = document.createElement("meta");
    meta.name = "new-novels-entry-path";
    meta.content = "/platform/entry/";
    document.head.appendChild(meta);
    window.history.pushState({}, "", "/platform/entry/cases/hunters-lodge");

    expect(getRuntimeBasePath()).toBe("/platform/entry");
    expect(withRuntimeBasePath("/cases/hunters-lodge")).toBe(
      "/platform/entry/cases/hunters-lodge"
    );
  });

  it("does not rewrite already-prefixed, relative, or external paths", () => {
    window.history.pushState({}, "", "/workspace/app-123/cases/hunters-lodge");

    expect(withRuntimeBasePath("/workspace/app-123/studio")).toBe(
      "/workspace/app-123/studio"
    );
    expect(withRuntimeBasePath("cases/hunters-lodge")).toBe("cases/hunters-lodge");
    expect(withRuntimeBasePath("https://example.com/cases/hunters-lodge")).toBe(
      "https://example.com/cases/hunters-lodge"
    );
  });

  it("renders app links as full document anchors with the entry path", async () => {
    window.history.pushState({}, "", "/workspace/app-123/");

    render(createElement(AppLink, { href: "/cases/hunters-lodge" }, "打开案件"));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "打开案件" })).toHaveAttribute(
        "href",
        "/workspace/app-123/cases/hunters-lodge"
      );
    });
  });
});
