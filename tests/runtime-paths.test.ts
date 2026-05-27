import { afterEach, describe, expect, it } from "vitest";
import { withRuntimeBasePath } from "../lib/app/runtime-paths";

const originalUrl = window.location.href;

afterEach(() => {
  window.history.pushState({}, "", originalUrl);
});

describe("runtime path helpers", () => {
  it("keeps local app paths unchanged without a platform prefix", () => {
    window.history.pushState({}, "", "/");

    expect(withRuntimeBasePath("/cases/hunters-lodge")).toBe("/cases/hunters-lodge");
    expect(withRuntimeBasePath("/api/investigate")).toBe("/api/investigate");
  });

  it("keeps internal links inside the Cowork subapp prefix", () => {
    window.history.pushState({}, "", "/s/3950c829/");

    expect(withRuntimeBasePath("/cases/hunters-lodge")).toBe(
      "/s/3950c829/cases/hunters-lodge"
    );
    expect(withRuntimeBasePath("/api/investigate")).toBe("/s/3950c829/api/investigate");
    expect(withRuntimeBasePath("/")).toBe("/s/3950c829/");
  });

  it("does not rewrite already-prefixed, relative, or external paths", () => {
    window.history.pushState({}, "", "/s/3950c829/cases/hunters-lodge");

    expect(withRuntimeBasePath("/s/3950c829/studio")).toBe("/s/3950c829/studio");
    expect(withRuntimeBasePath("cases/hunters-lodge")).toBe("cases/hunters-lodge");
    expect(withRuntimeBasePath("https://example.com/cases/hunters-lodge")).toBe(
      "https://example.com/cases/hunters-lodge"
    );
  });
});
