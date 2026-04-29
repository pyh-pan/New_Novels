import { layout, prepare } from "@chenglou/pretext";

export type PreparedChapterLayout = {
  prepared: unknown;
  lineCount: number;
  height: number;
  failed: boolean;
};

export function prepareChapterLayout(
  paragraphs: string[],
  width: number,
  lineHeight: number
): PreparedChapterLayout {
  if (
    typeof navigator !== "undefined" &&
    navigator.userAgent.toLowerCase().includes("jsdom")
  ) {
    return {
      prepared: null,
      lineCount: paragraphs.length,
      height: paragraphs.length * lineHeight,
      failed: true
    };
  }

  try {
    const text = paragraphs.join("\n\n");
    const prepared = prepare(text, "18px Georgia", { whiteSpace: "pre-wrap" });
    const laidOut = layout(prepared, width, lineHeight);

    return {
      prepared,
      lineCount: laidOut.lineCount,
      height: laidOut.height,
      failed: false
    };
  } catch {
    return {
      prepared: null,
      lineCount: paragraphs.length,
      height: paragraphs.length * lineHeight,
      failed: true
    };
  }
}
