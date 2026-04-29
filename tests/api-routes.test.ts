import { describe, expect, it } from "vitest";

import { POST as accusePost } from "../app/api/accuse/route";
import { POST as investigatePost } from "../app/api/investigate/route";
import { POST as routeMessagePost } from "../app/api/route-message/route";

function invalidJsonRequest(): Request {
  return new Request("http://localhost/api", {
    method: "POST",
    body: "{not json"
  });
}

describe("API request parsing", () => {
  it("returns 400 JSON for malformed route-message requests", async () => {
    const response = await routeMessagePost(invalidJsonRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid request body." });
  });

  it("returns 400 JSON for malformed investigate requests", async () => {
    const response = await investigatePost(invalidJsonRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid request body." });
  });

  it("returns 400 JSON for malformed accuse requests", async () => {
    const response = await accusePost(invalidJsonRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid request body." });
  });
});
