import { describe, expect, it } from "vitest";
import { routeMessage } from "../lib/game/routing";

describe("routeMessage", () => {
  it("routes general investigation questions to the general agent", () => {
    expect(routeMessage("我想看看现场有哪些血迹").targetId).toBe("general");
    expect(routeMessage("左轮手枪和窗户有什么关系").targetId).toBe("general");
    expect(routeMessage("我想整理一下现场证词矛盾").targetId).toBe("general");
  });

  it("routes named NPC questions to that NPC", () => {
    expect(routeMessage("我想问佐伊有没有看清访客").targetId).toBe("zoe");
    expect(routeMessage("问问罗杰为什么去了伦敦").targetId).toBe("roger");
    expect(routeMessage("贾普探长怎么看伊灵左轮").targetId).toBe("japp");
    expect(routeMessage("我想问米德尔顿太太黑胡子访客的事").targetId).toBe("middleton");
    expect(routeMessage("波洛为什么关心衣着").targetId).toBe("poirot");
  });

  it("does not route unrelated mentions to a configured agent", () => {
    expect(routeMessage("有没有人佐证这个说法")).toMatchObject({
      targetId: "unsupported"
    });
  });

  it("returns unsupported when no target is clear", () => {
    const route = routeMessage("我想问一个路过的村民有没有听见枪声");
    expect(route.targetId).toBe("unsupported");
    expect(route.label).toBe("未配置调查对象");
  });
});
