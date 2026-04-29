import { hammerOfGodCase } from "../lib/case/hammer-of-god";

export default function StoryPane() {
  const paragraphs = hammerOfGodCase.storyText
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section className="story-pane" aria-labelledby="case-title">
      <div className="story-header">
        <p className="story-source">{hammerOfGodCase.source.title}</p>
        <h1 id="case-title">{hammerOfGodCase.title}</h1>
        <p className="story-chapter">第一章 案发现场</p>
      </div>

      <div className="story-text">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
