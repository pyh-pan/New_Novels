import AppLink from "./AppLink";
import type { CaseShelfItem } from "../lib/case/catalog";

type CaseLibraryProps = {
  cases: CaseShelfItem[];
};

export default function CaseLibrary({ cases }: CaseLibraryProps) {
  return (
    <main className="library-shell">
      <header className="library-header">
        <div>
          <h1>推理故事书架</h1>
        </div>
        <AppLink className="icon-action" href="/studio" aria-label="创作者工作台" title="创作者工作台">
          ✎
        </AppLink>
      </header>

      <section className="case-grid" aria-label="可玩故事">
        {cases.map((caseItem) => (
          <article className="case-card" key={caseItem.id}>
            <AppLink className="case-cover-link" href={`/cases/${caseItem.id}`}>
              <div
                className="case-cover"
                aria-label={caseItem.cover?.alt}
                style={{
                  background: caseItem.cover?.palette.background,
                  color: caseItem.cover?.palette.foreground
                }}
              >
                <span>{caseItem.sourceTitle}</span>
                <strong>{caseItem.title}</strong>
                <small>{caseItem.author}</small>
              </div>
            </AppLink>
            <div className="case-card-body">
              <span className="case-difficulty">{caseItem.difficulty}</span>
              <dl className="case-meta">
                <div>
                  <dt>章节</dt>
                  <dd>{caseItem.chapterCount}</dd>
                </div>
                <div>
                  <dt>角色</dt>
                  <dd>{caseItem.agentCount}</dd>
                </div>
                <div>
                  <dt>线索</dt>
                  <dd>{caseItem.clueCount}</dd>
                </div>
                <div>
                  <dt>预计</dt>
                  <dd>{caseItem.estimatedMinutes} 分钟</dd>
                </div>
              </dl>
              <AppLink className="case-start-link" href={`/cases/${caseItem.id}`}>
                开始调查
              </AppLink>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
