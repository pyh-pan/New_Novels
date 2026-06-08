# New Novels

New Novels 是一个文字优先的网页原型，用于把推理小说转化为可交互的公平推理体验。

玩家阅读故事，用自然语言询问 AI 驱动的 NPC，调查线索，维护自己的侦探笔记，并在信息足够后进行最终指认。AI 可以扮演角色，但不是事实源：案件包和 runtime 规则决定事实是否存在、每个 NPC 知道什么，以及最终答案是否被接受。

当前唯一内置案件是基于用户提供原文生成的中文互动改写版 Agatha Christie **《The Mystery of Hunter's Lodge》**，以 `case-package/v1` 文件系统案件包形式运行。

## 当前原型

已实现：

- 基于 Next.js 的网页应用，包含故事书架、故事阅读区、调查台、笔记抽屉、最终指认页面和创作者 Studio。
- 首页以封面书架展示内置案件；玩家点击案件后进入 `/cases/<case-id>` 的阅读与调查界面。
- 默认可玩案件通过 `CaseLoader` 从 `cases/hunters-lodge/` 加载。
- `case-package/v1` 文件系统布局，覆盖故事文本、agent、事实、剧情幕、幕间门槛、线索、矛盾、真相、受害者和指认问题。
- Agent Runtime，支持语义 / 关键词路由、玩家已知状态、揭示规则、压力模型、剧情幕门槛和输出护栏。
- 基于 CoWork / Guard Runway Bedrock 网关契约（`ai.properties`）的 AI 调查 API，包含结构化 prompt 与响应处理。
- 基于真相数据的确定性最终指认校验，成功后展示真相摘要。
- 本地浏览器持久化章节进度、对话、批注式侦探笔记和 UI 状态，包括每个 agent session 与玩家已知状态。
- 原文和 agent 对话均支持选中文字后批注；批注会同步到侦探笔记，并在原文高亮处提供悬浮预览。
- 案件包 zip 导入 API 与 Studio 导入入口；导入成功后会生成同样的 Studio 草稿，进入同一套保存 / 发布状态机。
- Studio v1 提供原文上传入口、案件包导入入口，以及按章节、角色、线索、矛盾、多幕推进、最终指认和校验报告组织的审阅工作台。原文上传支持 `.txt`、`.md`、`.pdf`，会先提取文本，再调用平台 AI 按改写 skill 的流程生成临时案件草稿。
- Studio 原文草稿支持状态流转：生成后进入审阅工作台，创作者可以保存为草稿，也可以发布为正式案件；草稿和发布案件会写入 `.data/`，发布后会出现在书架，并可进入正式游玩。
- Guard 兼容的 `install.sh`、`start.sh`、`health.sh`、`/health` 和独立构建配置。
- `new-novels-case-adapter` skill，用于把推理小说改写为案件包。

尚未实现：

- 让 Studio 批注真实生成并应用案件包 diff。
- 服务端持久化存档 / 继续游玩。
- 护栏拒绝后的模型重试 / 修复流程。

## 快速开始

安装依赖：

```bash
npm install
```

如需本地 AI 测试，在项目根目录创建 `ai.properties`，或设置匹配的环境变量：

```properties
ai.base_url=<platform-runway-base-url>
ai.api_key=<platform-api-key>
```

环境变量回退：

```bash
APP_AI_BASE_URL=<platform-runway-base-url>
APP_AI_API_KEY=<platform-api-key>
```

运行应用：

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

常用检查：

```bash
npm test
npm run lint
npm run build
```

构建 CoWork / Guard 包：

```bash
npm run guard:package
```

默认生成干净副本 `../New_Novels-guard/`，并在项目父目录输出 `../New_Novels-guard.zip`，避免污染源码目录。

校验内置案件包：

```bash
node skills/new-novels-case-adapter/scripts/check_case_package_refs.mjs cases/hunters-lodge
```

## 项目结构

- `app/`：Next.js 页面和 API routes。
- `components/`：书架、故事阅读器、调查台、笔记、弹窗、Studio 和指认 UI。
- `lib/case/`：标准案件 schema 和默认案件服务。
- `lib/case-package/`：案件包 manifest schema 和目录加载器。
- `lib/agent-runtime/`：路由、runtime context、揭示规则、压力状态、剧情幕门槛和输出校验。
- `lib/ai/`：平台 AI provider 适配器和 prompt builder。
- `lib/game/`：游玩状态、路由包装、故事视图辅助、ID 和最终指认校验。
- `lib/studio/`：Studio 草稿视图、原文提取、AI 改写、草稿状态机、文件系统持久化和原文上传任务。
- `cases/hunters-lodge/`：当前内置默认可玩案件包。
- `skills/new-novels-case-adapter/`：把推理小说改写为可玩案件包的本地 skill。
- `docs/`：架构、案件包、实现和平台说明。

## 核心文档

- [设计文档](./design.md)
- [架构文档](./docs/architecture.md)
- [Case Package v1](./docs/case-package.md)
- [路线图](./roadmap.md)
- [开发规范](./agents.md)

## 许可证

尚未选择许可证。

当前《猎人小屋疑案》改写基于用户提供的源文本生成。分发改写内容前，请确认目标司法辖区的版权状态。
