import { describe, expect, it } from "vitest";
import { routeMessage } from "../lib/game/routing";

describe("routeMessage", () => {
  it("routes general investigation questions to the general agent", () => {
    expect(routeMessage("我想看看现场有哪些血迹").targetId).toBe("general");
    expect(routeMessage("锤子上有没有指纹").targetId).toBe("general");
    expect(routeMessage("我想看看锤子和伤口的关系").targetId).toBe("general");
  });

  it("routes named NPC questions to that NPC", () => {
    expect(routeMessage("我想问威尔弗里德他为什么怀疑铁匠").targetId).toBe("wilfred");
    expect(routeMessage("问问铁匠西米恩他看到了什么").targetId).toBe("simeon");
    expect(routeMessage("我想问铁匠妻子伊丽莎白").targetId).toBe("elizabeth");
    expect(routeMessage("我想问疯乔钟楼方向有没有异常").targetId).toBe("joe");
  });

  it("does not route unrelated single-character joe mentions to joe", () => {
    expect(routeMessage("他乔装成别人了吗").targetId).toBe("unsupported");
  });

  it("returns unsupported when no target is clear", () => {
    const route = routeMessage("我想问一个路过的村民有没有听见钟声");
    expect(route.targetId).toBe("unsupported");
    expect(route.label).toBe("未配置调查对象");
  });
});
