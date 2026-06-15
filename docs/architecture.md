# 架构文档

New Novels 是一个由结构化推理案件包驱动的 Next.js 原型。应用呈现文字优先的调查体验，同时把案件真相、NPC 边界和最终答案校验放在模型控制之外。

## Runtime 流程

```text
cases/<case-id>/
→ CaseLoader
→ CaseFile
→ getDefaultCase()
→ 页面渲染 / API routes / Agent Runtime
```

当前唯一内置可运行案件从 `cases/hunters-lodge/` 加载，加载逻辑位于 `lib/case/default-case.ts`。

## 主要界面

- `app/page.tsx` 渲染故事书架，数据来自 `lib/case/catalog.ts`。
- `app/cases/[caseId]/page.tsx` 根据案件 id 加载内置案件，并把故事、agent 和案件元数据传给客户端体验。
- `app/cases/[caseId]/accuse/page.tsx` 渲染指定案件的最终指认流程。
- `app/studio/page.tsx` 渲染创作者 Studio 入口。
- `app/studio/cases/[caseId]/page.tsx` 渲染指定案件的 Studio 审阅工作台。
- `components/StoryReader.tsx` 渲染章节正文和章节导航。
- `components/InvestigationDesk.tsx` 管理本地游玩状态、对话状态、笔记状态、显式 `@角色` 路由和问题提交。
- `components/NotebookDrawer.tsx` 渲染玩家拥有的批注式侦探笔记。
- `components/SelectionCommentPopover.tsx` 支持选中文本后批注，并为已批注原文提供悬浮预览。
- `components/StudioHome.tsx` 提供上传原文和导入案件包两个入口。
- `components/StudioWorkbench.tsx` 以文件树、审阅区和改写助手三栏呈现案件设计细节。

## API 路由

- `POST /api/route-message`
  - 输入：`{ "message": string }`
  - 可用时使用 LLM 语义路由。
  - 失败时回退到 runtime 关键词 / 别名路由。
  - 返回 `general`、`zoe`、`unsupported` 等目标。

- `POST /api/investigate`
  - 输入：目标 id、用户消息、对话历史和玩家状态。
  - 可接收浏览器游玩状态中的可选 agent session。
  - 为选中的 agent 构建 runtime context。
  - 调用已配置的 Runway Bedrock Anthropic 兼容模型适配器。
  - 解析可选结构化响应字段。
  - 应用玩家状态 / session patch，评估剧情幕门槛，并在返回文本前应用护栏。

- `POST /api/cases/preview`
  - 输入：包含 `case-package/v1` zip 的 multipart `file`。
  - 规范化单根目录 zip 包，并校验 split filesystem 布局。
  - 校验通过后注册为 Studio `draft`，返回 `draftCaseId`、manifest 数据、案件摘要和结构化问题。
  - 如果导入包 id 与内置案件冲突，会使用 `import-<caseId>` 作为草稿 id，避免覆盖内置案件。

- `GET /api/cases`
  - 返回可展示在书架上的内置案件摘要。

- `POST /api/studio/source-jobs`
  - 输入：`.txt`、`.md` 或 `.pdf` 原文文件。
  - 先提取纯文本；PDF 使用 `pdf-parse` 读取可选择文本，扫描件需要另行 OCR。
- 调用平台 AI，按 `new-novels-case-adapter` 的工作流生成 `sourceProfile`、`segmentation`、`qualityReport` 和包含 `storyEvents` 的 schema-valid `caseFile`。
  - 生成结果会注册为内存中的 Studio 动态草稿，并返回进度步骤与 `draftCaseId`。

- `POST /api/studio/cases/[caseId]/save`
  - 将运行期 Studio 草稿状态从 `draft` 更新为 `saved`。
  - 保存会写入 `.data/studio-drafts/<caseId>/draft.json`。
  - 保存后仍不会出现在书架，也不能作为正式案件游玩。

- `POST /api/studio/cases/[caseId]/publish`
  - 将运行期 Studio 草稿状态更新为 `published`。
  - 发布会把案件写为 `.data/published-cases/<caseId>/` 下的完整 `case-package/v1` split package。
  - 发布后案件会进入书架，并可通过 `/cases/[caseId]`、调查 API 和最终指认 API 正式游玩。

- `GET /api/studio/jobs/[jobId]`
  - 返回原文生成任务状态。当前版本使用进程内任务表保存最近生成的临时草稿状态。

- `GET /api/accuse`
  - 按可选 `caseId` 返回第一个最终指认问题。

- `POST /api/accuse`
  - 基于可选 `caseId` 的案件包确定性检查单个答案。
  - 返回 `wrong`、`next` 或 `solved`。
  - 成功后返回真凶、手法、动机和关键证据。

- `GET /health`
  - Guard 生命周期本地回环健康检查端点。

- `GET /api/healthz`
  - 浏览器 / API 安全健康检查端点。

## Agent Runtime 执行层

`lib/agent-runtime/index.ts` 是核心执行层。

职责：

- 注册 agent 与别名；
- 按别名和调查关键词路由消息；
- 构建运行时事实边界；
- 评估揭示规则；
- 追踪每个 agent 的压力状态；
- 将结构化模型响应契约应用到玩家状态；
- 评估剧情幕门槛；
- 按隐藏事实、真相事实、禁止声明和编造证据模式校验输出。

Runtime 是通用层。具体 NPC 行为来自案件包字段，例如 `pressureProfile`、`emotionalArc`、`boundaries`、`knowledge` 和 `revealRules`。

## 玩家状态

本地游玩状态目前通过 `lib/game/play-state.ts` 保存在浏览器中。它包括：

- 当前章节；
- 对话和展开模块；
- 每个 agent 的 session；
- 批注式侦探笔记；
- 当前笔记筛选器；
- 移动端标签；
- 玩家已知状态。

`PlayerKnowledgeState` 记录玩家已发现的内容：

- 当前剧情幕 id；
- 已发现线索；
- 已发现事实；
- 已听证词；
- 已知矛盾；
- 场景交互；
- 已对质 agent；
- 已问话题；
- 玩家假设。

浏览器在每次调查请求中发送相关 agent session。API 返回更新后的 session 和玩家状态，使压力、情绪、已揭示事实、已知矛盾、场景交互和剧情幕推进能在当前浏览器中跨回合保留。

## 读者交互边界

读者端遵循极简产品界面：

- 书架页只展示可进入的故事封面和必要案件数据；
- 故事栏只显示章节正文和章节导航；
- 调查台只负责自然语言提问与 agent 对话；
- 不在 agent 回复旁放“摘录到笔记”按钮；
- 读者选中原文或对话内容后添加批注，系统把引用和评论同步到侦探笔记；
- 已批注的原文保持淡色高亮，鼠标悬浮或点击后展示评论预览；
- 最终指认页只保留中央问答框，答错返回调查，答对结束游戏。

没有显式 `@角色` 时，调查问题进入通用调查助手；输入 `@` 会打开角色备选，选中角色后问题进入对应 agent 模块。

## AI 边界

模型被视为不可信的叙述者 / 表演者。

事实源：

- 案件包文件；
- schema 校验；
- runtime context；
- 确定性的最终指认答案。

非事实源：

- 模型输出；
- 玩家声明；
- 单独的对话文本。

Prompt builder 会向模型提供允许事实、隐藏事实 id、私有事实 id、全局规则、agent 规则和玩家状态。输出仍需通过 runtime 护栏，才能返回客户端。

## 平台 AI Provider

`lib/ai/provider.ts` 从项目根目录、standalone 父路径或 `AI_PROPERTIES_PATH` 读取 `ai.properties`。它需要：

```properties
ai.base_url=<Runway base URL>
ai.api_key=<Runway API key>
```

适配器发送：

- `POST {base_url}/bedrock_runtime/model/invoke`；
- `token` 和 `api-key` headers；
- 顶层 `system` 的 Anthropic Messages 风格 body；
- 不发送 model 字段和 temperature 字段。

`APP_AI_BASE_URL` 和 `APP_AI_API_KEY` 是本地回退变量。

## 案件导入

当前产品支持两条 Studio 入口：

- 上传 `.txt` / `.md` / `.pdf` 原文，创建可审阅草稿任务；
- 上传 `case-package/v1` zip，执行结构校验并生成 Studio 草稿。

原文上传链路不是固定模板：系统先分析原文画像，再把文本分为 `story-keep`、`investigation-hide`、`deduction-hide`、`solution-lock` 和 `bridge-rewrite`，最后根据原文特征自适应生成章节、幕、agent、线索、矛盾、故事事件、压力机制和最终指认问题。故事事件用于区分即时资料核查、NPC 状态变化、故事节拍和幕推进；它不是现实时间等待队列。

Studio 审阅工作台按原文画像、改写分段、故事章节、角色、线索、矛盾、多幕推进、最终指认和校验报告组织内容。创作者可以在右侧改写助手区域添加批注并生成修改建议。状态机包含 `draft`、`saved` 和 `published`：草稿保存在 `.data/studio-drafts`，发布案件保存在 `.data/published-cases`，只有发布后的动态案件会出现在书架并进入正式游玩 runtime。原文上传和 zip 导入会在“生成 Studio draft”这一步交汇，之后共用同一套审阅、保存、发布、书架和游玩链路。后续在平台发布时可将文件系统 store 替换为数据库 store。

`lib/case-package/writer.ts` 负责把 `CaseFile` 反向拆成 `case-package/v1` 目录；`lib/studio/case-persistence.ts` 负责读写 `.data` 下的草稿和已发布案件。书架和游玩 runtime 的加载顺序是：内置案件、运行期发布案件、文件系统发布案件。

## Guard 打包

应用配置为 Next standalone 输出：

- `next.config.mjs` 使用 `output: "standalone"` 和 `compress: false`。
- 生产构建使用 `next build --webpack`。CoWork / Guard 当前的前缀注入补丁按 webpack runtime public path 机制工作；Turbopack 产物在 `/s/<app_id>` 前缀下会留下 SSR 静态壳但无法完成客户端 hydration。
- 客户端内部导航和 API 请求必须经过 `lib/app/runtime-paths.ts` 或 `components/AppLink.tsx`。应用入口路径优先来自服务端写入的 `new-novels-entry-path`，其次来自平台 `<base href>`，最后从当前页面路径反推；所有页面只在入口路径后追加 `/cases/...`、`/studio...`、`/api/...` 等业务后缀。不要在组件中裸跳转到 `/cases/...` 或 `/api/...`，否则部署在子路径时会离开子应用并触发平台 404。`AppLink` 必须渲染普通 `<a>`，不能使用 `next/link`，否则 Next 客户端软导航会把入口前缀当成应用 route 并在首次点击时报错。
- `app/layout.tsx` 导出 `dynamic = "force-dynamic"` 和 `revalidate = 0`，避免 App Router 在平台环境里缓存静态 shell。
- `install.sh` 只在缺少 standalone 产物时安装运行时依赖；它不执行构建。
- `start.sh` 期待 `.next/standalone/server.js`，将生成的 `HOSTNAME` / `PORT` 引用改写为 `APP_HOSTNAME` / `APP_PORT`，并以 `exec node .next/standalone/server.js` 结束。
- `health.sh` 检查 `http://127.0.0.1:3000/health`。
- `npm run guard:package` 默认在项目父目录生成干净副本 `../New_Novels-guard/` 和压缩包 `../New_Novels-guard.zip`，避免打包产物污染源码目录。
- `scripts/build-guard-package.sh` 会排除 `prototypes/` 等本地设计原型目录；平台包只包含生产应用、案件包、脚本、文档和运行所需构建产物。

## 验证

主要检查：

```bash
npm test
npm run lint
npm run build
node skills/new-novels-case-adapter/scripts/check_case_package_refs.mjs cases/hunters-lodge
npm audit --omit=dev --audit-level=high --registry=https://registry.npmjs.org
```

浏览器冒烟目标：

```bash
npm run dev
# 打开 http://localhost:3000
```
