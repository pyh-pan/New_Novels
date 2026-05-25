# 转写为 Guard 子应用的指令

你是工程改写助手。请按本文档输出符合 **CoWork Guard 子应用规范** 的 zip。

---

## 文档约定：`/s/` 是示例前缀

`/s/<app_id>/` 是**示例占位**，不是契约。真实前缀由平台分配（形如 `<二级段>/<app_id>/`，二级段可能是 `/s/` `/x/` `/app/` 等）。**subapp 既不知道也不假设前缀**——源码永远写裸路径；运行时要绝对前缀就读 request header `X-Proxy-Base-URL`。

---

## § A、生命周期契约

**产出**：zip 解压后平台跑起一个挂在前缀下、监听 `0.0.0.0:3000` 的 HTTP 服务。

| 脚本 | 必须做 | 不允许做 |
|---|---|---|
| `install.sh` | exit 0。仅做：(1) 装 runtime deps（`pip install` / `npm ci --omit=dev`）；(2) DB DDL + 幂等 DML seed | ❌ 任何 build（`npm run build` / `vite build` / `tsc` / webpack）<br>❌ 装 dev deps（`@types/*` / `typescript` / 测试框架）<br>❌ lint / format / type-check |
| `start.sh` | **末行 `exec`**，监听 `0.0.0.0:3000` | ❌ build / 装依赖 |
| `health.sh` | 服务起来 `curl http://127.0.0.1:3000/health` 返 0；未起来返非 0 | — |

**build 在改写者开发机上做**，产物随 zip 进 Pod（Pod 1-2GB 内存，next build 峰值 2.5-4GB 必 OOM exit 137）。

### 平台硬约束

- **后端**：Python 或 Node（其它语言不可用，🔁 翻译）
- **DB**：PostgreSQL，连接走 `db.properties`（平台 install 前注入）。任何持久化都进 DB，**禁文件当 DB**
- **AI**：Runway 网关 Bedrock InvokeModel（Anthropic Messages 格式），配置走 `ai.properties`
- **SSO**：从 `Decrypted-Userinfo` request header 读用户
- **网络**：Pod 无公网，install.sh 走内部镜像
- **路径**：源码写裸路径，不配 `assetPrefix` / `basePath` / `publicPath` / `base`

> 📦 **两种 zip 方向相反**：
> - **输入 zip**（用户给 LLM）= **仅源码**，剥光 `node_modules` / `.next` / `dist` / `build` / `.venv` / `__pycache__` 等。不剥会让 grep / find 卷入几百 MB 噪音，token 用量 10×+ 爆涨且容易把编译产物误当源码改
> - **输出 zip**（LLM 给平台）= 源码 + **必含** build 产物（`.next/standalone/` / `dist/`）。`install.sh` 不允许跑 build

---

## § B、工作副本与改写流程（8 步）

1. **复制副本**：源是目录 → `cp -r <源> <源>-guard`；源是 zip → `unzip <源>.zip -d <源>-guard`。**副本路径不要落源工程目录下**（否则 `zip -r` 自吞）
2. **🧹 剥用户输入的 build/cache 产物**（关键，跳过会污染后续 grep + token 爆炸）：
   ```sh
   cd <副本>
   rm -rf node_modules .next dist build out .turbo .cache .parcel-cache .nuxt .svelte-kit .vite coverage
   find . -type d \( -name __pycache__ -o -name .pytest_cache -o -name .mypy_cache -o -name .ruff_cache \
       -o -name .venv -o -name venv -o -name .tox -o -name '*.egg-info' -o -name vendor \) \
       -not -path '*/node_modules/*' -exec rm -rf {} + 2>/dev/null
   find . -name '*.pyc' -not -path '*/node_modules/*' -delete
   rm -rf .git tmp logs
   find . -name '.DS_Store' -delete
   ```
   **告知用户**以后上传源 zip 时用 `zip -r myapp.zip myapp/ -x 'myapp/node_modules/*' 'myapp/.next/*' 'myapp/dist/*' 'myapp/build/*' 'myapp/.venv/*' '*.pyc' 'myapp/.git/*'` 直接剥
3. **判定栈**：任何前端栈（Next.js / Nuxt / Vite SPA / Vue CLI / CRA）→ 标准流程，**不需要 app_id**。纯后端 / 纯 API 跳到 step 4
4. **改源码 + 改依赖 + 写脚本**：按 § 一~§ 七
5. **跑 build**（改写者开发机）：Node `npm install && npm run build`；Python 含 native 扩展 `pip install -r requirements.txt --target=./vendor`
6. **本地烟测**：§ 十.5
7. **过自检 checklist**：§ 十
8. **`zip -r` 副本**：§ 八；输出"新增/修改文件清单"（路径相对副本，声明源工程未动）

### 红线

- ❌ **不 `mv` / `git mv`** 源工程当"建副本"——这等于改源
- ❌ **不把源工程 `git checkout -b guard` commit**——用户可能没 git
- ❌ **build 写进 `install.sh`**
- ❌ **"先打 zip 让 Pod 自己 build"**——build 不在 Pod 跑
- ⚠️ **反向例外**：用户**明确**说"就在原工程上改"按用户；不确定走副本，第一句告诉用户"已建副本 `<path>`，源工程未动"

---

## § C、app_id 是 router 的运行时概念，不是 build-time 输入

subapp 完全不知道挂在什么前缀下。一份 build 产物可挂任何 app_id。

### 链路

```
浏览器 ──<host>/s/<app_id>/foo──► Guard router ──► Guard pingora ──► subapp
                                       │ ① 剥前缀传 Pod 时去掉 /s/<app_id>
                                       │ ② 注 X-Proxy-Base-URL: /s/<app_id>
                                       │ ③ 响应阶段：HTML src/href 加前缀 / 注 <base href> /
                                       │    inline patch（设 __webpack_public_path__、monkey-patch
                                       │    fetch+XHR+history.pushState+DOM observer）/
                                       │    RSC 字面量替换 / 30x Location 加前缀
                                       ▼
                                   subapp 永远只看到裸路径 /foo /_next/... /api/...
```

### 按栈处理

| 栈 | 配置要求 |
|---|---|
| Next.js（Pages / App Router / standalone） | 不配 `assetPrefix` / `basePath`；App Router 主 layout 加 `dynamic = 'force-dynamic'` |
| Nuxt / SvelteKit / Remix | 不配 `app.baseURL` / `paths.base` / `publicPath` |
| Vite SPA / Vue CLI / CRA | 不配 `base` / `publicPath` / `homepage`（保持默认 `/`） |
| 手写 HTML / 服务端模板 | 写绝对路径（`/`）即可 |
| 纯 API 后端 | 不涉及 |

### 红线

- ❌ **不配 `assetPrefix` / `basePath` / `publicPath` / `base`**——router 会再加一遍变 `/s/<app_id>/s/<app_id>/_next/...` → 404
- ❌ **不把 app_id 硬编进源码 / 配置 / 环境变量**
- ❌ **不让用户提供 app_id**——即使主动给，按本节口径解释不需要
- ❌ **不自己写运行时 patch 三件套**（inline script 改 fetch 等）——router 已做，重复双 patch

### 例外：服务端拼绝对外链时读 `X-Proxy-Base-URL`

仅当业务要生成绝对外链（回调 URL、邮件 / 推送 deep link）时：

```python
base = req.headers.get("X-Proxy-Base-URL", "")           # /s/abc12345
proto = req.headers.get("X-Forwarded-Proto", "https")
host = req.headers.get("X-Forwarded-Host") or req.headers.get("Host", "")
callback_url = f"{proto}://{host}{base}/api/callback"
```

链接走相对让浏览器解析最省事，绝大多数业务用不到。

---

## § 一、运行环境约束

### Pod 提供

- Python 3（含 pip）
- Node.js（含 npm）
- PM2（**子应用无需自己装**）
- POSIX：`sh` / `curl` / `tar` / `zip` / `git`

### Pod **不提供**（LLM 高频以为有）

| 类别 | 不提供 | 替代 |
|---|---|---|
| 编译型语言 runtime | Go / Java / Rust / C / C++ / .NET | 🔁 翻译为 Python / Node |
| **KV / 缓存** | **Redis / Memcached / KeyDB / DragonflyDB**（任何 :6379 / :11211 / 自建 KV 都没有） | 迁 PostgreSQL 表（§ 四） |
| **消息队列 / 任务队列** | RabbitMQ / Kafka / NATS / BullMQ / Celery / Sidekiq / Resque / RQ | 同步执行 / PG LISTEN/NOTIFY / PG queue 表 + worker |
| **对象存储** | S3 / OSS / COS / MinIO / GCS / Azure Blob / Cloudinary | PostgreSQL Large Object |
| **搜索引擎** | Elasticsearch / OpenSearch / Meilisearch / Typesense | PG 全文检索 `tsvector` + GIN |
| **向量数据库** | Pinecone / Weaviate / Qdrant / Milvus / Chroma | 暂无（pgvector 未开） |
| **时序 / 分析 DB** | InfluxDB / ClickHouse / Druid / TimescaleDB | PG 普通表 + 窗口聚合 |
| **公网出口** | 直 `curl` / `fetch` 公网 | pip / npm 走内部镜像；AI 走 Runway |
| **外部凭据注入** | 只有 `db.properties` / `ai.properties` | `REDIS_URL` / `S3_KEY` / `KAFKA_BROKER` 等无注入路径，跑起来必 ECONNREFUSED / 401 |

### 端口与启动

- **监听 `0.0.0.0:3000`**（上游 `UPSTREAM_PORT` 默认 3000）
- **`start.sh` 末行 `exec`**
- **dev server 全生命周期禁用**——`npm run dev` / `vite dev` / `next dev` 不退出会卡死流水线

### 环境变量命名：业务 env 加 `APP_` 前缀

| 撞 Pod 全局 | 改用 |
|---|---|
| `HOSTNAME` | `APP_HOSTNAME` |
| `PORT` | `APP_PORT` |
| `USER` `HOME` `SHELL` `PATH` `PWD` | 业务不读；要存"运行用户"用 `APP_USER` |
| `LANG` `LC_*` `TZ` | 不覆盖；继承 |

**为什么**：OS 自动 set `HOSTNAME=<容器ID>` / `HOME=/root`，调度器注入 `PORT`。PM2 cluster fork worker 时 env 从 daemon 继承，`start.sh` 里 `export HOSTNAME=0.0.0.0` 会被覆盖回容器 ID。

**高频踩坑**：Next.js standalone `server.js` 读裸 `process.env.PORT` / `process.env.HOSTNAME` → install 通过但 worker bind 到 `<容器ID>:3000` → 浏览器超时。**改写阶段 build 完 sed 加 `APP_` 前缀**。

### 网络：内部镜像

| 工具 | 镜像 |
|---|---|
| pip | `-i http://pypi.devops.xiaohongshu.com/simple/ --trusted-host pypi.devops.xiaohongshu.com` |
| npm/pnpm/yarn | `.npmrc` 双路：`@xhs:registry = "http://npm.devops.xiaohongshu.com:7001"` + `registry = "http://registry.npmmirror.com"` |

改写机有公网，`npm install` 走公网 registry 没问题。**`.npmrc` 必须写好打进 zip**——Pod 上 `npm ci` 按它走内部镜像。

### 🚨 install.sh 严禁公网调用

Pod 无公网出口，任何指向公网域名的命令都会挂起或失败。

| 类 | 例子 | 替代 |
|---|---|---|
| 浏览器二进制 / 模型权重 | `playwright install` / `puppeteer browsers install` / `huggingface-cli download` | **build 阶段**下载好打进 zip；install.sh 设 `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` 防 postinstall 二次下载 |
| 公网包源 | `pip install -i https://pypi.org/` / `npm install --registry https://registry.npmjs.org/` / `git clone https://github.com/` / `curl -fsSL https://` | 走内部镜像 |
| OS 包管理 | `apt-get` / `yum` / `curl ... \| sh` | Pod 镜像封闭装不进 |
| postinstall 联网 | `sharp` / `bcrypt` / `node-sass` 等 native 包 | 改写机 `npm install` 跑通 → lockfile 锁版本；Pod `npm ci` 走镜像拉同版本 |

**检测**：install.sh 不应有 `https://[^/]+\.(com|org|net|io|cn|sh)` 字面值（除内部镜像域 `*.xiaohongshu.com` / `npmmirror.com`）。

### `package.json` engines 写宽松

`"engines": { "node": ">=18" }`。**不写 `"20.x"` / `"22.x"`**——Pod 实际版本不一致会触发 `npm warn EBADENGINE`。`.nvmrc` 同理。

---

## § 一.5、技术栈选型

**原则**：按**用户需求**选最贴合的栈，**不要因「最少步骤、最少失败模式」反射性退到 vanilla**。vanilla 是「需求模糊时」的默认，不是「合适」。先听用户业务规模，明确「我打算用 X 因为你的需求里有 Y」，等确认再动手。

| 用户描述含 | 推荐栈 |
|---|---|
| 「计算器」「单页工具」「随手 demo」「≤3 页静态展示」 | vanilla HTML/CSS/JS + FastAPI |
| 「CRUD 几张表 + 几个表单」「招聘报名」「内部管理后台」「待办」 | **FastAPI + Jinja2 + htmx**（首选；客户端轻 ~14KB、避开 SPA prefix-patch 复杂度） |
| 「复杂 client state」「实时更新 / 多步表单 / 富交互 / 离线编辑」 | Vite + React/Vue/Svelte/Solid + FastAPI/Express |
| 「需要 SEO」「首屏带非敏感数据」「app router 路由」 | Next.js standalone |

**为什么把 htmx 单列**：CRUD / 表单类应用走 SPA 会拉进 prefix-patch、客户端 router、build pipeline 一整套复杂度，但实际只需要「点击按钮换片段」。htmx 用 server 端 Jinja2/ejs 渲染 HTML 片段返回，client 一行 `<script src="htmx.org">` + `hx-get/hx-post` 属性即可，**完全不撞 SPA 客户端导航的坑**。

**Build 在改写机做**：Vite / Next.js 写者本地 `npm install && npm run build`，产物入 zip；htmx / vanilla 路径无 build。

---

## § 二、前后端分离架构（强制）

**核心规则**：**业务数据**（用户数据 / 列表 / 详情 / 表单回显等）**不能 inline 进首屏 HTML**，必须经一次异步请求拿到。HTML 结构 / 静态文案 / build-time 非业务变量走模板渲染**完全 OK**。

> 这条规则不是禁 Jinja2、不是禁 SSR——是禁「业务数据在第一次 GET 就写进 HTML」。htmx 用模板渲染**响应业务请求的 HTML 片段**也合规。

### 禁止

- Flask `render_template` / Django `{% %}` / Jinja2 / EJS / Handlebars **首屏直接渲染业务数据**（`{% for %}` 展开列表进 HTML 等）
- FastAPI `Jinja2Templates` **首屏注入业务数据**
- 首屏 HTML 模板含 `{{ user.name }}` / `{{ todo.title }}` 等**业务占位符**
- Next.js / Nuxt `getServerSideProps` / `useFetch` 把**敏感**业务数据 inline 进 HTML（普通页面级 SSR OK）

### 允许的形态

多页静态站 / SPA / SSR / htmx-style 渐进增强 / 纯 API，任选——只要**业务数据走异步请求**。

### 🔁 已有"模板渲染业务数据"代码

1. HTML 模板里的业务数据移除，改 client-side hooks 调 API
2. 原 `GET /page/foo` 返 HTML → 拆 `GET /` 返页面壳 + `GET /api/foo` 返 JSON

不强制换框架。**仅有 build 产物（无源码）**：直接打 zip，router 接管前缀。

---

## § 三、生命周期与必备脚本（zip 根目录）

| 脚本 | 必需 | 时机 | 退出码 |
|---|---|---|---|
| `install.sh` | ✅ | 解压后一次：runtime deps + DB init | 0=成功；非 0 → 旧部署继续在线 |
| `start.sh` | ✅ | install 后 PM2 拉起 | PM2 接管 |
| `health.sh` | ✅ | start 后 10s 预热 + 每 2s ×20 重试 | 0=健康 |
| `stop.sh` | 可选 | PM2 kill 前 | 失败仅 warn |
| `uninstall.sh` | 可选 | 删文件前 | 失败仅 warn |

### `start.sh`：末行 `exec`

**前台运行**——不 `&` / `nohup` / daemon。

| 末行字面量 | 模式 | 实例数 | ready 信号 |
|---|---|---|---|
| `exec node <file>`（无 `--flag` 无参数） | cluster | 默认 2 | 必须 `process.send('ready')`，超时 30s |
| `exec node --flag` / `exec npx ...` / `exec python ...` | fork | 1 | 不需要 |

```sh
#!/bin/sh
set -e
cd "$(dirname "$0")"

# Python (FastAPI / Starlette / Flask + uvicorn / Sanic) → fork
exec python -m uvicorn app.main:app --host 0.0.0.0 --port 3000

# Node 后端 (Express / Koa / Fastify) → cluster；listen 后必须 process.send('ready')
exec node server.js

# Next.js standalone → cluster（必须先 sed 改 server.js env var）
export APP_PORT=3000 APP_HOSTNAME=0.0.0.0 NODE_ENV=production
exec node .next/standalone/server.js

# Next.js CLI → fork
exec npx next start -H 0.0.0.0 -p 3000

# 静态 serve (demo 级) → fork
exec npx --yes serve -s dist -l tcp://0.0.0.0:3000
```

### `health.sh` 与健康路由

```sh
#!/bin/sh
curl -fsS -o /dev/null --max-time 3 http://127.0.0.1:3000/health || exit 1
```

应用加 `/health` 返 `{"status":"ok"}`。

> ⚠️ **`/health` 是 Guard 反代层保留路径**，浏览器访问被拦截不回源。`health.sh` 走 `127.0.0.1:3000/health`（loopback 不经反代）OK；**前端要看的状态端点改名** `/healthz` / `/api/info`。

### `install.sh` 模板

```sh
#!/bin/sh
set -eo pipefail        # 不是只 set -e；pipefail 防 `node x.cjs | tee` 左边失败被吞
cd "$(dirname "$0")"

# Python 依赖（如有）：内部镜像
python -m pip install --no-cache-dir -r requirements.txt \
  -i http://pypi.devops.xiaohongshu.com/simple/ \
  --trusted-host pypi.devops.xiaohongshu.com

# Node 依赖（如有；Next.js standalone 自带 .next/standalone/node_modules，可跳）
[ -f package.json ] && [ ! -f .next/standalone/server.js ] && npm ci --omit=dev

# DB 初始化（如有）
# python -m app.init_db          # DDL（幂等）
# python -m app.seed_db          # DML seed + LO 默认文件（幂等；无 seed 删此行）

echo "[install] done"
```

**红线**：不 build / type-check / lint；不装 dev 依赖；不跑 dev server / 交互式命令；不下模型权重。

### 脚本与子进程的日志契约（fail loud）

`install.sh` / `uninstall.sh` / `start.sh` / `stop.sh` 和它们 spawn 的子进程（`node init_db.cjs` / `python -m app.init_db` / `npm ci`）出错时**必须把完整 error 打到 stderr 后再退出**。Guard install hook 可能只 capture stdout，所以脚本要主动合并 stderr。

**bash 端**：
- `set -eo pipefail`
- CLI 子进程显式合并 stderr：`node dist/init_db.cjs 2>&1`
- 关键步骤前后 echo："`[install] step: init_db ...`" / "`[install] FAIL at init_db`"
- **禁止** `... || true` / `... || echo warn` 把硬错降级（seed/DML 容忍失败时除外，且必须 echo `WARN: ... reason=$?`）

**Node CLI 入口禁止**：

```js
// ❌ 静默退出
initDb().then(() => process.exit(0)).catch(() => process.exit(1));

// ✅ 必打 error，stack 优先
initDb()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[init_db] fatal:", (e && (e.stack || e.message)) || e);
    process.exit(1);
  });
```

**Python**：
```python
if __name__ == "__main__":
    try:
        main()
    except Exception:
        import traceback, sys
        traceback.print_exc()
        sys.exit(1)
```

**自查**：故意把 `db.properties` 的某个 key 改错（如 `db.username` → `db.usernamex`），重跑 `install.sh`，日志里**必须**能看到具体 error class + message + 哪一步挂的。

### `uninstall.sh`：仅清理非持久化外部副作用

类比手机卸载 App：卸 App ✅，删聊天记录 ❌。

- **可以**：注销服务发现 / MQ 消费组、关闭长连接、清 `/tmp` 自有临时文件
- **禁止**：`DROP TABLE` / `TRUNCATE` / `DELETE FROM`（DB 由平台托管，回滚同 app_id 时数据必须保留）、`rm` 数据卷 / 对象存储、清用户上传产物
- **Guard 自动处理**：zip 解压目录、Python 依赖、PM2 进程**不需要自己 `rm -rf`**
- **不要"对称反向 install.sh"**：install 跑了 `npm ci` 不代表 uninstall 删 `node_modules`

不确定**默认不清理**，没非持久化副作用就**别放此文件**。

### 可选 `pm2.config.json`

| 字段 | 默认 | 适用 |
|---|---|---|
| `instances` | 2 | cluster |
| `kill_timeout` | 5000ms | 两种 |
| `listen_timeout` | 30000ms | cluster |

不调优就不放。

---

## § 四、数据库配置

所有持久化数据走 PostgreSQL。Pod 文件系统临时（重启 / 重部署 / 回滚 / cluster 多 worker 并发都会丢），**禁文件当 DB**。

### 配置

- 类型 PostgreSQL，驱动：Python `psycopg[binary]` (v3) + SQLAlchemy 2.x；Node `pg`
- `db.properties`（平台 install 前注入 zip 根）：
  ```
  db.type=postgres
  db.host=...
  db.port=5432
  db.username=...
  db.password=...
  db.database=...
  ```
- **key 严格按上表 6 个**，禁止 `jdbc.username` / `jdbc.password` / `jdbc.url` / `db.user` / `db.name` / `database` / `username` / `host` 等任何别名——Guard 只注入这一种，多写的别名分支永远不走，反而把"真错"淹没成 `user=[missing]` 难定位
- 🚫 **同样禁止"自作主张加额外必填 key"**（高频翻车）：`REQUIRED_KEYS` / `ZodSchema` / Pydantic Model **严格 6 个一个不多**。LLM 常见反模式：
  - **加 `db.schema`**：错，平台不注入。**PG schema 硬编 `public` 或 `SET search_path TO public`**
  - **加 `db.ssl` / `db.sslcert`**：平台内网不需要；硬编 `ssl: false`
  - **加 `db.pool_size` / `db.max_connections` / `db.idle_timeout`**：硬编默认（`max: 10`）
  - **加 `db.type` 校验**：平台**会**写 `db.type=postgresql`，但**不要**列进必填、不要按它分支支持 `mysql`/`sqlite`
  - 任何"想象中下游需要"的 key（`db.search_path` / `db.connection_string` / `db.options`）**别加**
- **判定**：写完 properties 读取层后 `cat db.properties` 模拟——只有 6 行 `db.{host,port,username,password,database,type}=...`，代码应完整跑通；任何报"missing required key"的 key 名都是**LLM 自己加的**
- 解析按 `=` split（不是 INI）
- **纯无状态工具应用**允许不连 DB：直接不读 `db.properties`。**不**写"文件不存在就 fallback 到本地文件"

> 🔒 **secrets 不出进程**：`db.properties` / `ai.properties` 的字段（host / username / password / database / base_url / api_key）**只在进程内用**：
> - **不要** `HTTPException(detail=str(e))`——driver 异常文本常带 `host=10.x.x.x user=postgres database=foo`
> - **不要** `logger.info(cfg)` / `print(settings)` 整体打印 config；要打就逐字段 + 敏感项 mask `***`
> - **不要** `engine.url.render_as_string(hide_password=False)`
> - `.env.example` `AI_API_KEY=` 留空；README 用 `<平台分配>` 占位

### DSN 构造（三个高频鉴权坑）

**通用**：用对象配置传 host / port / user / password / database，**不 f-string / 模板字符串拼 URL**（密码含 `@` `:` `/` `?` `#` `%` 会破坏解析）。

#### Python（SQLAlchemy 2.x + psycopg v3）

```python
from sqlalchemy.engine import URL
from sqlalchemy import create_engine

url = URL.create(
    drivername="postgresql+psycopg",
    username=props["db.username"],
    password=props["db.password"],     # 原文传，URL.create 转义
    host=props["db.host"],
    port=int(props["db.port"]),
    database=props["db.database"],
)
engine = create_engine(url)            # ✅ 直接传 URL 对象
```

**三个必避坑**：

1. **`str(url)` 会 mask 密码为 `***`** —— `create_engine(str(url))` 必报 `password authentication failed`。`create_engine` 原生支持 URL 对象，**直接传**。要字符串只能用 `url.render_as_string(hide_password=False)`。注解写 `-> URL` 别写 `-> str`
2. **raw `psycopg.connect()` 不认 `postgresql+psycopg://`** —— 报 `missing "=" after "postgresql+psycopg://..."`。修法：
   - 走 ORM：drivername 保 `postgresql+psycopg`，URL 对象直接给 `create_engine`
   - 走 raw psycopg：drivername 写**纯** `"postgresql"`，或用 `psycopg.conninfo.make_conninfo(host=..., user=..., password=..., dbname=...)`
3. **不要 `HTTPException(detail=str(e))`**（见上方 🔒 块）

#### Node.js（`pg`）

```js
new pg.Pool({ host, port, user, password, database })   // ✅
// ❌ `postgres://${user}:${pwd}@${host}/...` 拼模板字符串
```

`db.properties` 用 fs + split 解析（不是 INI）；字段名带 `db.` 前缀。

### 🔁 SQLite / MySQL → PostgreSQL

- SQLite `INTEGER PRIMARY KEY AUTOINCREMENT` → PG `SERIAL` / `BIGSERIAL`
- SQLite `DATETIME DEFAULT CURRENT_TIMESTAMP` → PG `TIMESTAMPTZ DEFAULT now()`
- 移除 `sqlite3` / `mysqlclient` / `pymysql` / `mysql2`；加 PG 驱动
- 检查 SQL 方言差异（`AUTOINCREMENT`、`||` 字符串拼接、`STRFTIME` 等 SQLite-only 函数）
- 不硬编 DB 凭据；不假设 env var 里有 DB 信息

### 🔁 Redis / Memcached / 外部 KV / MQ 当主存储 → PostgreSQL（**高频致命陷阱**）

**LLM 极易漏**：很多原工程把 Redis（也包括 Memcached / etcd / Consul KV / DynamoDB / BullMQ / Celery / Kafka / RabbitMQ 等）**当主数据存储用**——存用户、session、订单、import 记录、API key。**本平台不 provision 任何这类服务**。

> 🚨 **识别口径**：看到 `ioredis` / `redis` / `node-redis` / `aioredis` / `redis-py` / `memcached` / `bullmq` / `celery` / `kafkajs` / `amqplib` / `nats` 出现在依赖里 → **直接当反模式处理**。
>
> **典型翻车**：start.sh 起来 → ioredis 连 `127.0.0.1:6379` 一直 ECONNREFUSED → 业务代码 await Redis 卡住 → 永远不 bind :3000 → 健康检查 20 次全 fail → install 视为失败回滚。

#### 检测信号

- **依赖**：Node `ioredis` / `redis` / `node-redis` / `redis-mock` / `bullmq` / `bull` / `bee-queue` / `agenda` / `kafkajs` / `node-rdkafka` / `amqplib` / `nats` / `memjs`；Python `redis` / `redis-py-cluster` / `aioredis` / `aredis` / `celery` / `rq` / `dramatiq` / `huey` / `pymemcache` / `kafka-python` / `confluent-kafka` / `pika` / `nats-py`
- **代码**：`new Redis(...)` / `createClient({url:...})` / `redis.set/get/hset/hget/zadd/lpush` / `await redisClient.xxx`
- **配置**：env `REDIS_URL` / `REDIS_HOST` / `KAFKA_BROKERS` / `RABBITMQ_URL` / `CELERY_BROKER_URL`
- **硬编码端口**：`127.0.0.1:6379` / `:11211` / `:9092` / `:5672`

#### 迁移步骤

1. **反推 schema**：grep 所有 `set/get/hset/hget/sadd/zadd`，按 key 命名空间还原"逻辑表"。`users:id:<uuid>` → `users` 表 with UUID 主键；`users:email`（hash）→ `users` 加 `email` 列 + UNIQUE
2. **`setJson` / `getJson` 整段 JSON** → JSONB 列 或 拆字段
3. **TTL → `expires_at TIMESTAMPTZ`**：原 `SET key value EX 86400` → 加 `expires_at` 列 + 查询 `WHERE expires_at > now()` + cron `DELETE WHERE expires_at < now()`
4. **`INCR` / `INCRBY`** → `UPDATE counters SET value = value + 1 WHERE key = $1 RETURNING value`（行锁原子）
5. **`LIST` / `STREAM` 当队列** → PG `queue` 表 + `SELECT ... FOR UPDATE SKIP LOCKED`
6. **`PUB/SUB`** → PG `LISTEN` / `NOTIFY`；大多数场景改同步调用最省事
7. **分布式锁 `SET NX EX`** → PG `pg_advisory_lock(<key_hash>)`
8. **`SORTED SET`（排行榜 / 时间轴）** → PG 表 + `ORDER BY score DESC LIMIT N` + 索引
9. **BullMQ / Celery 等任务队列** → 大多数场景**直接同步执行**；必须异步拆成 PG `jobs` 表 + 自己 worker（同进程 `setTimeout` 轮询，cluster 多 worker 用 `SKIP LOCKED`）
10. **依赖清理**：移除上述 SDK + 伴生进程脚本（`redis-bridge` / `queue-worker` / `celery-worker` 等 sidecar）

⚠️ **拆要拆干净**：不要 `if (redis) { ... } else pool.query(...)` 双写折中；伴生进程 spawn 的二进制一并删。

### 🔁 文件当 DB → PostgreSQL（高频陷阱）

本地文件存"持久化"在 Pod 上**必然丢数据**。**整体迁 PG**，不要只把读写路径改绝对、或加文件锁。

#### 检测信号

- **Node**：
  - `fs.writeFileSync` / `fs.writeFile` / `fs.appendFile` 路径不在 `/tmp/`、不是日志、不是 build 产物
  - `JSON.parse(fs.readFileSync(...))` + 对应 `JSON.stringify` 写回
  - 依赖：`lowdb` / `node-json-db` / `nedb` / `level` / `better-sqlite3` / `sqlite3` / `keyv` 文件 backend
  - 写到 `data/*.json` / `db/*.json` / `db.json` / `*.db` / `storage/*` / `cache/*.json`
  - `localStorage` / `sessionStorage` 当**业务**数据源（典型反模式：前端 localStorage 当多用户共享存储用）
  - 上传：`multer` / `formidable` / `busboy` / `express-fileupload` / Next.js `formData()` 后跟 `fs.writeFile` / `file.mv` / `req.pipe(fs.createWriteStream(...))`
  - 下载：`res.sendFile` / `fs.createReadStream(...).pipe(res)` 指向 runtime 写入目录
- **Python**：
  - `json.dump` / `json.load` 配对，对象是业务实体
  - `pickle.dump` / `pickle.load` / `shelve.open` / `dbm.open` / `tinydb.TinyDB(...)`
  - `pandas.read_csv` / `to_csv` 反复读写同一文件
  - 写到 `data/*.csv` / `*.txt` / `*.yaml` 当业务数据
  - 上传：Flask `request.files['x'].save(path)` / FastAPI `await file.read()` 后写盘 / Django `FileField`
  - `sqlite3.connect("xxx.db")`
- **任意**：业务 handler 里"读整文件 → 修改内存 list/dict → 整文件覆盖回写"

> **配置文件 ≠ 文件当 DB**：`requirements.txt` / `package.json` / `next.config.js` / 业务规则模板等**只读、随代码发布、runtime 不写**的不算，保留。

#### 迁移步骤

1. **反推 schema**：每个 `JSON.parse(read)` / `json.load(...)` 落点列出对象形状，每文件对应一张表
2. **设计 PG 表**：`id` 用 `UUID`（`pgcrypto`）或 `BIGSERIAL`，**不复用** JSON 数组下标当 id；时间戳 `TIMESTAMPTZ DEFAULT now()`；嵌套复杂用 `JSONB`；多对多拆联接表
3. **读整文件 → SQL 查询**：`users.find(u => u.id === id)` → `SELECT * FROM users WHERE id = $1`
4. **整文件覆盖 → UPDATE / INSERT**：多步操作用事务
5. **`localStorage` 当业务存储反模式**：业务数据改 `POST /api/...` 进 DB；前端只在 localStorage 留**端侧偏好**（主题、输入草稿等纯本机 UI 状态）
6. **用户上传 / 下载**：Pod 文件系统临时，**严禁**写本地盘（`uploads/` / `media/` / `public/uploads/` / `/var/...` 都不行）。**走 PostgreSQL Large Object**（PG 内置功能，不是扩展），不分大小、不用 BYTEA。元数据（文件名、大小、mime、sha256、上传人、上传时间）建独立列。处理过程允许**单次请求内**用 `/tmp/upload-xxx` 临时缓冲，**响应返回前**必须落库 + 删 `/tmp`。❌ 不引入对象存储 SDK（S3 / OSS / COS / Cloudinary）—— 平台只注入 `db.properties` / `ai.properties` 两套凭据，其它必 401。❌ 不用 `BYTEA` 列，保持模式统一
7. **删除迁移残留**：移除 `lowdb` / `tinydb` / `nedb` / `better-sqlite3` 等依赖；删原 `data/*.json` / `db.json`（但**先看是不是 seed**：业务上线后用户改的算 runtime 数据直接删，随代码发布的"开箱即用"内容算 seed 迁 PG 再删）；移除"文件不存在就创建空文件"初始化；移除自写文件锁（`proper-lockfile` / `flock`）
8. **目录引用清理**：grep `data/` / `db/` / `storage/` / `uploads/` 路径常量

⚠️ **不要"半迁"**：JSON 继续读、镜像写一份进 DB → 部署后两边发散。要么纯文件要么纯 DB，本平台只能纯 DB。

### LO 文件存储模板

**Schema**（每张需要"对应一个文件"的业务表都按此模式）：

```sql
CREATE EXTENSION IF NOT EXISTS lo;  -- contrib 自带，建一次

CREATE TABLE IF NOT EXISTS attachments (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,           -- 原始文件名
  mime          TEXT NOT NULL,           -- Content-Type
  size_bytes    BIGINT NOT NULL,
  sha256        TEXT,                    -- 可选完整性校验
  owner_id      UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  content_oid   OID NOT NULL             -- 指向 pg_largeobject 的 4 字节引用
);

-- 业务行 UPDATE/DELETE 时自动 lo_unlink，避免孤儿
-- ⚠️ 不要用 DO $$ ... $$ 包裹求幂等——块内 ; 会被按 ; 切碎 SQL 的执行器（含下文 init_db.py）切坏
DROP TRIGGER IF EXISTS attachments_lo_cleanup ON attachments;
CREATE TRIGGER attachments_lo_cleanup
BEFORE UPDATE OR DELETE ON attachments
FOR EACH ROW EXECUTE FUNCTION lo_manage(content_oid);
```

**Node**（依赖：`pg` + `pg-large-object`）：

```js
import { LargeObjectManager } from 'pg-large-object';
import { pipeline } from 'node:stream/promises';

export async function uploadFile(pool, { name, mime, sizeBytes, fileStream }) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const man = new LargeObjectManager({ pg: c });
    const [oid, lo] = await man.createAndWritableStreamAsync();
    await pipeline(fileStream, lo);
    const { rows } = await c.query(
      `INSERT INTO attachments (name, mime, size_bytes, content_oid)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [name, mime, sizeBytes, oid]
    );
    await c.query('COMMIT');
    return rows[0].id;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

export async function streamDownload(pool, id, res) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows } = await c.query(
      'SELECT name, mime, content_oid FROM attachments WHERE id=$1', [id]);
    if (!rows.length) { res.status(404).end(); return; }
    const { name, mime, content_oid } = rows[0];
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(name)}"`);
    const man = new LargeObjectManager({ pg: c });
    const [, lo] = await man.openAndReadableStreamAsync(content_oid);
    await pipeline(lo, res);
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
```

**Python**：**LO 必须用 psycopg2**（psycopg3 移除了高层 `lobject` API）。即便主路径用 SQLAlchemy + psycopg3，**单独 import psycopg2 给 LO 用**（`psycopg2-binary` 加进 `requirements.txt`）：

```python
import psycopg2

def upload_file(dsn: str, name: str, mime: str, size_bytes: int, src) -> int:
    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            lo = conn.lobject(0, 'wb')
            oid = lo.oid
            while chunk := src.read(65536):
                lo.write(chunk)
            lo.close()
            cur.execute(
                "INSERT INTO attachments (name, mime, size_bytes, content_oid) "
                "VALUES (%s, %s, %s, %s) RETURNING id",
                (name, mime, size_bytes, oid),
            )
            return cur.fetchone()[0]

def stream_download(dsn: str, file_id: int, write):
    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT name, mime, content_oid FROM attachments WHERE id=%s", (file_id,))
            row = cur.fetchone()
            if not row:
                return None
            name, mime, oid = row
            lo = conn.lobject(oid, 'rb')
            while chunk := lo.read(65536):
                write(chunk)
            lo.close()
            return name, mime
```

**关键约束**：

- **必须事务包住**：LO 句柄出 transaction 立即失效
- **下载占连接**：流式整个过程在一个事务里，慢客户端 + 默认 pool=2 容易池子爆。`pg.Pool({ max: 10 })` / SQLAlchemy `pool_size=10` 起步
- **错误路径必须 ROLLBACK**
- **业务表只存 OID**，不存 BYTEA
- **多文件一对多**：单独 `attachments` + 业务表外键引用 attachment.id，**不**在业务表里塞 `oid_1` `oid_2` `oid_3`
- **异步框架（FastAPI / aiohttp / Starlette / Sanic）必须包一层**——psycopg2 是同步阻塞，**裸调 async handler 不报错但默默阻塞 event loop 把并发拖成串行**。同步框架（Flask / Django sync view）直接调即可。FastAPI 用 `asyncio.to_thread(upload_file, ...)` 包；下载真流式每 chunk to_thread；简单做法是 to_thread 把 LO 写到 `tempfile.NamedTemporaryFile` 再 `FileResponse(..., background=BackgroundTask(os.unlink, path))`

### 数据库初始化时机（DDL + DML）

`install.sh` 和 `start.sh` 都能看到 `./db.properties`。**DDL 和 DML 都放 `install.sh`**——DDL → DML 顺序，两步都幂等。

**DDL**：

1. **必须幂等**：`CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`，或 ORM 自动（SQLAlchemy `Base.metadata.create_all` / TypeORM `synchronize: true` / Sequelize `sync()`）
2. **⚠️ "建表 IF NOT EXISTS" 不会改已有表**：**不论 ORM（SQLAlchemy `create_all` / TypeORM `synchronize` / Sequelize `sync`）还是裸 SQL（`CREATE TABLE IF NOT EXISTS`）**，看到表已存在就**整张表跳过**——你改了 CREATE TABLE 里的列定义、redeploy，旧库里**新列不会出现**，runtime 报 `column xxx does not exist`。**任何加列 / 改列 / 加约束 / 加索引都必须单写 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`**（追加在 CREATE TABLE / ORM 同步**之后**），不要指望改 CREATE TABLE 本体生效
3. **schema 变更开发者自己管**：**不集成 Alembic / Flyway / TypeORM migrations / Knex migrations**，**不依赖任何 `migrations/` 文件夹**。破坏性变更分两版发布（先兼容版让旧/新 schema 并存，再清理版）

**DML**：

1. **必须幂等**：`INSERT ... ON CONFLICT (key) DO NOTHING`（PG 9.5+）或先 SELECT 再 INSERT；**不**裸 INSERT
2. **业务"自然键"必须在 DDL 里有 UNIQUE 约束**
3. **默认 `DO NOTHING` 不默认 `DO UPDATE`**：`DO UPDATE` 会把 runtime 期间用户改过的数据每次部署覆盖回 seed
4. **整批 seed 一个事务**：`BEGIN; ... COMMIT;`
5. **seed 只在 install.sh 跑，不在 start.sh / 业务 startup 钩子**（cluster 多 worker 同时跑必撞 unique）
6. **secret 不进 seed**：管理员账号若必须预置，密码列存"一次性临时随机值" + 首登强制改密

### 🔁 源工程的初始化数据（DML / seed）迁过来

如果原工程带"开箱即用"初始数据（管理员、字典枚举、默认分类、demo 内容、默认配置、示例附件），**必须接进 PG 灌库流程**，**不**让用户手动跑 SQL。

#### 检测信号

- **专用 seed 脚本**：Node `prisma/seed.ts` / `seeders/*.js`（Sequelize）/ `src/seeds/*`（TypeORM）/ `scripts/seed.*` / `bin/seed`；Python Django `fixtures/*.json` / Alembic `op.bulk_insert(...)` / `scripts/seed_db.py`
- **裸 SQL**：`seed.sql` / `seeds/*.sql` / `data.sql` / `init.sql` / `db/init/*.sql` / `docker-entrypoint-initdb.d/*.sql`
- **代码里的"首启自灌"**：`if (await User.count() === 0) await User.create({ name: 'admin', ... })` —— **挪进 install.sh DML，从 startup 钩子里删**
- **数据文件**：`data/initial.json` / `data/categories.json` / `seed-data/*.csv` 被 import 后批量 insert
- **文件当 DB 迁移产物**：识别出的 `users.json` / `db.json` 已有内容**可能就是 seed**
- **二进制资源**：`public/avatars/default.png` / `static/samples/*.pdf` 等"代码默认引用、走业务下载接口发用户"的资产 → LO `attachments`；纯前端静态资源（`<img src>` 直接引用）保留 build 产物

#### 迁移步骤

1. **抽取**：上述位置的业务初始数据集中到副本 `app/seed/`：结构化业务行 → JSON / YAML；二进制文件 → `app/seed/files/` 子目录
2. **加自然键 UNIQUE 约束**
3. **写幂等灌库**：结构化单事务 `INSERT ... ON CONFLICT DO NOTHING`；LO 按 sha256 查 attachments 已存在跳过
4. **从 runtime 钩子移除原 seed 触发点**
5. **声明产物**：副本根 README 一行注释说明"install.sh 已自动灌入 N 行 seed + M 个默认文件"

### 实现模板

`install.sh`（DDL → DML）：
```sh
#!/bin/sh
set -eo pipefail
cd "$(dirname "$0")"
python -m pip install --no-cache-dir -r requirements.txt
python -m app.init_db          # DDL（幂等）
python -m app.seed_db          # DML + LO seed（幂等；无 seed 删此行）
echo "[install] done"
```

`app/init_db.py`（DDL；导出 `build_engine` / `build_dsn` 给 seed_db 复用）：
```python
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from app.models import Base

def read_props(path="./db.properties"):
    out = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            k, _, v = line.partition("=")
            out[k.strip()] = v.strip()
    return out

def build_engine():
    p = read_props()
    url = URL.create(
        drivername="postgresql+psycopg",
        username=p["db.username"], password=p["db.password"],
        host=p["db.host"], port=int(p["db.port"]),
        database=p["db.database"],
    )
    return create_engine(url)

def build_dsn() -> str:
    """psycopg2 用（LO 操作必须 psycopg2）"""
    p = read_props()
    return (f"host={p['db.host']} port={p['db.port']} dbname={p['db.database']} "
            f"user={p['db.username']} password={p['db.password']}")

if __name__ == "__main__":
    engine = build_engine()
    Base.metadata.create_all(engine)   # 幂等；只建表，不建 extension / trigger

    # ORM 不给已存在的表补列；不建 extension / trigger，必须自己 execute。
    # ⚠️ 一条语句一个字符串，不要读 .sql 文件按 ; split——遇到 `DO $$ ... $$` 或函数体里
    # 的 ; 会切碎。
    # ⚠️ 幂等用 `CREATE ... IF NOT EXISTS` / `DROP ... IF EXISTS` + `CREATE`；
    # **禁止**用 `DO $$ ... IF NOT EXISTS THEN CREATE ... END IF; END $$`。
    ddl_statements = [
        "CREATE EXTENSION IF NOT EXISTS lo",
        "DROP TRIGGER IF EXISTS attachments_lo_cleanup ON attachments",
        """CREATE TRIGGER attachments_lo_cleanup
           BEFORE UPDATE OR DELETE ON attachments
           FOR EACH ROW EXECUTE FUNCTION lo_manage(content_oid)""",
        # "ALTER TABLE foo ADD COLUMN IF NOT EXISTS bar TEXT",
    ]
    with engine.begin() as conn:
        for s in ddl_statements:
            conn.execute(text(s))
    print("[init_db] schema ensured")
```

`app/seed_db.py`（DML：结构化 + LO 文件）：
```python
import hashlib, json, mimetypes
from pathlib import Path
import psycopg2
from sqlalchemy import text
from app.init_db import build_dsn, build_engine

SEED_DIR = Path(__file__).parent / "seed"

def seed_structured():
    """app/seed/<table>.json → 一张表的 seed 行；顶层 = 行数组"""
    engine = build_engine()
    natural_key = {"categories": "name", "users": "email"}  # 按业务调
    with engine.begin() as conn:
        for f in sorted(SEED_DIR.glob("*.json")):
            table = f.stem
            rows = json.loads(f.read_text())
            if not rows: continue
            key = natural_key.get(table)
            if not key: raise RuntimeError(f"[seed_db] {table} 缺自然键映射")
            cols = list(rows[0].keys())
            placeholders = ", ".join(f":{c}" for c in cols)
            sql = (f"INSERT INTO {table} ({', '.join(cols)}) "
                   f"VALUES ({placeholders}) ON CONFLICT ({key}) DO NOTHING")
            conn.execute(text(sql), rows)
            print(f"[seed_db] {table}: {len(rows)} rows ensured")

FILES_DIR = SEED_DIR / "files"

def seed_lo_files():
    """app/seed/files/* → attachments；按 sha256 幂等"""
    if not FILES_DIR.exists(): return
    with psycopg2.connect(build_dsn()) as conn:
        with conn.cursor() as cur:
            for path in sorted(FILES_DIR.iterdir()):
                if not path.is_file(): continue
                data = path.read_bytes()
                sha = hashlib.sha256(data).hexdigest()
                cur.execute("SELECT id FROM attachments WHERE sha256=%s", (sha,))
                if cur.fetchone():
                    print(f"[seed_db] file {path.name}: skip (sha256 命中)"); continue
                lo = conn.lobject(0, "wb"); oid = lo.oid
                lo.write(data); lo.close()
                mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
                cur.execute(
                    "INSERT INTO attachments (name, mime, size_bytes, sha256, content_oid) "
                    "VALUES (%s, %s, %s, %s, %s)",
                    (path.name, mime, len(data), sha, oid),
                )
                print(f"[seed_db] file {path.name}: inserted ({len(data)} bytes)")

if __name__ == "__main__":
    seed_structured()
    seed_lo_files()
    print("[seed_db] done")
```

> 无结构化 seed 删 `seed_structured()`；无 LO 文件删 `seed_lo_files()`。Node 工程同构（pg 直连 + `INSERT ... ON CONFLICT DO NOTHING`）。

`requirements.txt` 至少：`fastapi` / `uvicorn[standard]` / `sqlalchemy>=2` / `psycopg[binary]`；用 LO 还加 `psycopg2-binary`。

---

## § 五、文本对话模型 API

调**文本对话**大模型统一走 Runway 网关 **Bedrock InvokeModel + Anthropic Messages 协议**（`POST {base_url}/bedrock_runtime/model/invoke`）。不调 AI 跳过本节。

> 🚨 **作用范围：仅文本对话模型**（chat completion，含 vision 多模态输入但输出仍是文本的 Claude / GPT 等）。
>
> **不在迁移范围（原工程代码与 SDK 保留原样，不替换）**：
> - 图像生成（Nova Canvas / Stable Diffusion / DALL·E / Midjourney / 通义万相）
> - 视频生成（Sora / Runway Gen / 可灵 / Veo）
> - 语音 / TTS / ASR（Whisper / ElevenLabs / 火山引擎语音）
> - Embedding / Rerank / 向量检索专用模型
> - 纯 vision-only（OCR / 检测 / 分类）
>
> **遇到以上**：调用代码**保留原样**；相关厂商 SDK（`google-generativeai` 视觉/视频、`@google/generative-ai`、`dashscope` 图像/视频/语音、`replicate`、`runwayml`、`elevenlabs`）**保留在依赖**；配置（厂商原生 api-key / endpoint）保留原样；交付说明**显式列出**哪几个调用点被保留。

> ⚠️ Runway base_url 形如 `https://runway.devops.rednote.life/openai`——**`/openai` 是误导性目录名**，里面跑的是 Bedrock 协议。OpenAI / Vertex / Anthropic 直连 / 各家 SDK 全部按本节迁，否则 `404 page not found`。

### `ai.properties` 格式

```
ai.base_url=https://runway.devops.rednote.life/openai
ai.api_key=<在 Runway 平台申请>
```

> 子应用代码不给 base_url 兜底默认，缺失就 `is_ai_enabled()` 返 False / `/api/ai/*` 报 503，让平台漏配第一时间暴露。

### 三个高频读取陷阱

1. **取值必须带 `ai.` 前缀**：`props["ai.base_url"]` / `props["ai.api_key"]`，**不要** `props["base_url"]`——解析层不剥前缀
2. **`ai.base_url` 已含 `/openai`**：拼 endpoint 直接 `{base_url}/bedrock_runtime/model/invoke`，**不要再加 `/openai/`**（双前缀 → 404）
3. **🚨 Next.js standalone：properties 查找路径必修**——standalone `server.js:6` `process.chdir(__dirname)` 把 cwd 切到 `<zip>/.next/standalone/`。直接 `path.resolve(cwd, 'ai.properties')` 永远 404。**搜多个候选**：
   ```ts
   function findPropertiesFile(filename: string): string | null {
     for (const c of [
       path.resolve(cwd, filename),                   // cwd 就是 zip 根
       path.resolve(cwd, '..', filename),             // 退一级
       path.resolve(cwd, '..', '..', filename),       // standalone 退两级
       process.env.AI_PROPERTIES_PATH || '',
     ].filter(Boolean)) {
       try { if (fs.statSync(c).isFile()) return c; } catch {}
     }
     return null;
   }
   ```
   纯 Python (uvicorn) / 纯 Node (Express) 不做 chdir，不受影响。同规则适用 `db.properties`。

### 调用约定

| 项 | 值 |
|---|---|
| 非流式 endpoint | `POST {ai.base_url}/bedrock_runtime/model/invoke` |
| 流式 endpoint | `POST {ai.base_url}/bedrock_runtime/model/invoke-with-response-stream`（**换 URL，不是请求体加 `stream:true`**） |
| 鉴权 header | `token: <ai.api_key>`（同发 `api-key: <ai.api_key>` 兼容旧版；**不是** `Authorization: Bearer`） |
| 请求体必填 | `anthropic_version: "bedrock-2023-05-31"`、`max_tokens`、`messages` |
| `system` | **顶级字段**，**不**塞 messages |
| `model` | **不传**——模型由 api-key 在网关侧绑定 |
| `temperature` | **Opus 4.x / 新模型不接受**，被 Runway 包成 `{Code:10001, Error:"`temperature` is deprecated..."}` 返 200 OK；老模型才能传 |
| `messages.content` | 字符串 或 typed blocks 数组 `[{type:"text",text:"..."}, {type:"image",source:{type:"base64",media_type:"image/jpeg",data:"<b64>"}}]`（vision 用数组） |
| 非流式响应 | `content[].text` 拼接（过滤 `block.type === "text"`），`stop_reason`，`usage.{input,output}_tokens` |
| 流式响应 | 每行 `{"chunk":{"bytes":"<base64>"}}` → base64 解出 Anthropic 事件 JSON：`message_start` / `content_block_delta`（`delta.type==="text_delta"` 取 `delta.text`）/ `message_stop` |

**禁止**：硬编 `base_url` / `api_key`；引入文本厂商 SDK（`openai` / `anthropic` / `@anthropic-ai/sdk` / `zhipuai` / langchain 文本 provider）—— SDK 把 endpoint / header / 请求体打死，与 Runway 不兼容；用 `httpx` / `fetch` 直接调。

### ⚠️ Runway "伪 200 错误"必加防御

Runway 把上游业务错**包成 HTTP 200 OK** + body `{"Code": 10001, "Error": "..."}`，**不进 4xx/5xx 分支**。客户端只检 `response.ok` 然后直接读 `content` 会把错误当成"空文本"。**200 通路里加判断**：

```js
if (result?.Code || result?.Error) {
  throw new Error(`upstream business error: ${result.Error || result.Code}`);
}
```

```python
if isinstance(data, dict) and (data.get("Code") or data.get("Error")):
    raise RuntimeError(f"upstream business error: {data.get('Error') or data.get('Code')}")
```

### `max_tokens` 取值（中文 JSON 必看）

中文字符在 Claude tokenizer 约 **1.5–2 token/字**。Prompt 要求结构化 JSON 输出时 `max_tokens` 太小会**中途截断**，下游 `JSON.parse` 报 `Unterminated string`。

| 输出规模 | 建议 |
|---|---|
| 单条短文本（< 500 中文字） | 1024 |
| 单条长文本 / 短结构化 JSON | 2048–4096 |
| 多段结构化 JSON（3 套文案 + 6 项计划） | **8000+** |
| 启用 adaptive thinking | 16000 |

### 调用示例（Python httpx）

```python
import base64, httpx, json

props    = _load_properties("./ai.properties")
base_url = props["ai.base_url"].rstrip("/")     # ✅ "ai.base_url" 带前缀
api_key  = props["ai.api_key"]

INVOKE_URL = f"{base_url}/bedrock_runtime/model/invoke"
STREAM_URL = f"{base_url}/bedrock_runtime/model/invoke-with-response-stream"
HEADERS    = {"token": api_key, "api-key": api_key, "Content-Type": "application/json"}

def _check_business_error(data):
    if isinstance(data, dict) and (data.get("Code") or data.get("Error")):
        raise RuntimeError(f"upstream business error: {data.get('Error') or data.get('Code')}")

# 非流式
r = httpx.post(INVOKE_URL, headers=HEADERS, json={
    "anthropic_version": "bedrock-2023-05-31",
    "max_tokens": 8000,                     # 中文/JSON 宽松
    "system": "You are a helpful assistant.",
    "messages": [{"role": "user", "content": "你好"}],
    # adaptive thinking（仅 4.x）：
    # "thinking": {"type": "adaptive"},
    # "output_config": {"effort": "medium"},
}, timeout=120)
r.raise_for_status()
data = r.json()
_check_business_error(data)
text = "".join(b["text"] for b in (data.get("content") or []) if b.get("type") == "text")
usage = data.get("usage", {})

# 视觉输入
def _image_block(jpeg_bytes):
    return {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                         "data": base64.b64encode(jpeg_bytes).decode("ascii")}}

# 流式
with httpx.stream("POST", STREAM_URL, headers=HEADERS, json={
    "anthropic_version": "bedrock-2023-05-31",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "你好"}],
}, timeout=120) as resp:
    resp.raise_for_status()
    for line in resp.iter_lines():
        if not line: continue
        try:
            outer = json.loads(line)
            chunk_b64 = outer.get("chunk", {}).get("bytes", "")
            if not chunk_b64: continue
            event = json.loads(base64.b64decode(chunk_b64))
        except (json.JSONDecodeError, ValueError):
            continue   # 心跳行
        if event.get("type") == "content_block_delta":
            delta = event.get("delta", {})
            if delta.get("type") == "text_delta" and delta.get("text"):
                print(delta["text"], end="", flush=True)
        elif event.get("type") == "message_stop":
            break
```

### 调用示例（Node fetch）

```js
import fs from "fs";

const props = Object.fromEntries(
  fs.readFileSync("./ai.properties", "utf-8").split("\n")
    .filter(l => l && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const baseUrl = props["ai.base_url"].replace(/\/$/, "");
const apiKey  = props["ai.api_key"];
const INVOKE_URL = `${baseUrl}/bedrock_runtime/model/invoke`;
const STREAM_URL = `${baseUrl}/bedrock_runtime/model/invoke-with-response-stream`;
const HEADERS = { token: apiKey, "api-key": apiKey, "Content-Type": "application/json" };

function checkBusinessError(data) {
  if (data && (data.Code || data.Error)) {
    throw new Error(`upstream business error: ${data.Error || data.Code}`);
  }
}

// 非流式
const r = await fetch(INVOKE_URL, {
  method: "POST", headers: HEADERS,
  body: JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 8000,
    system: "You are a helpful assistant.",
    messages: [{ role: "user", content: "你好" }],
  }),
});
const data = await r.json();
checkBusinessError(data);
const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");

// 流式
const stream = await fetch(STREAM_URL, {
  method: "POST", headers: HEADERS,
  body: JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1024,
    messages: [{ role: "user", content: "你好" }],
  }),
});
const reader = stream.body.getReader();
const decoder = new TextDecoder();
let buf = "";
outer: while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  const lines = buf.split("\n"); buf = lines.pop();
  for (const line of lines) {
    if (!line) continue;
    let event;
    try {
      const outer = JSON.parse(line);
      const chunkB64 = outer?.chunk?.bytes;
      if (!chunkB64) continue;
      event = JSON.parse(Buffer.from(chunkB64, "base64").toString("utf8"));
    } catch { continue; }
    if (event.type === "content_block_delta"
        && event.delta?.type === "text_delta"
        && event.delta?.text) {
      process.stdout.write(event.delta.text);
    } else if (event.type === "message_stop") {
      break outer;
    }
  }
}
```

### curl 自检（目标形态）

```sh
curl --location 'https://runway.devops.rednote.life/openai/bedrock_runtime/model/invoke' \
  --header 'token: {your_key}' \
  --header 'Content-Type: application/json' \
  --data '{
      "anthropic_version": "bedrock-2023-05-31",
      "max_tokens": 1024,
      "system": "You are a helpful assistant.",
      "messages": [{"role": "user", "content": "背诵春晓并赏析"}]
  }'
```

### 旧形态 → Bedrock 对照

| ❌ 原工程 | ✅ 改成 |
|---|---|
| `POST {base_url}/v1/chat/completions`（OpenAI） | `POST {base_url}/bedrock_runtime/model/invoke` |
| `POST {base_url}/v1/responses`（OpenAI Responses） | 同上 |
| `POST api.anthropic.com/v1/messages`（Anthropic 直连） | 同上 |
| `POST {base_url}/google/anthropic/v1:rawPredict`（Vertex） | 同上 |
| OpenAI 请求体 `{"model":"...","messages":[...]}` | Anthropic Messages：加 `"anthropic_version": "bedrock-2023-05-31"`、`system` 提为顶级、删 `model`、删 `temperature`（4.x）、`max_tokens` 必填 |
| Vertex `"anthropic_version": "vertex-2023-10-16"` | 改 `"bedrock-2023-05-31"` |
| `messages` 含 `{"role":"system","content":"..."}` | **提出来**作顶级 `system`，messages 只留 user/assistant |
| `Authorization: Bearer <key>` / `X-Api-Key: <key>` | `token: <key>`（同发 `api-key:` 兼容） |
| 流式靠 `"stream": true` | **换 endpoint** 到 `.../invoke-with-response-stream` |
| OpenAI SSE `data: {...}\n\ndata: [DONE]` | 改解 `{"chunk":{"bytes":"<b64>"}}` 每行 → base64 解码 → Anthropic 事件 JSON |
| `choices[0].message.content` | `content[].text` 拼接（过滤 `type==="text"`） |
| `usage.prompt_tokens` / `usage.completion_tokens` | `usage.input_tokens` / `usage.output_tokens` |
| 老 thinking：`thinking: {type:"enabled", budget_tokens:N}` | Opus 4.x：`thinking: {type:"adaptive"}` + `output_config: {effort:"low"\|"medium"\|"high"}` |
| 没检 `{Code, Error}` | 加 `_check_business_error(data)` |

### 🔁 厂商 SDK / 直连 / Runway 非 Bedrock 路径迁移

> ⚠️ 仅文本对话。同 SDK 同时被文本和非文本用时（`dashscope` 同含通义文本+万相 / `google-generativeai` 同含 Gemini chat+视觉），**按调用点拆分**：文本迁 Runway，非文本保留，SDK 包不删。判别看方法名：`.chat.*` / `.messages` / `chat_completion` 是文本；`.images.*` / `text-to-*` / `.embeddings.*` / `.audio.*` 不是。

- **检测信号**（仅文本）：
  - 厂商文本 SDK：`import openai` / `anthropic` / `zhipuai` / `erniebot`；`google.generativeai` 的 `GenerativeModel(...).generate_content(text)` 文本路径；`dashscope.Generation.call`（文本）；langchain `ChatOpenAI` / `ChatAnthropic` / `ChatGoogleGenerativeAI`；JS `openai`（chat）/ `@anthropic-ai/sdk`（messages）
  - 裸 HTTP 直连：`api.openai.com/v1/chat/completions` / `api.anthropic.com/v1/messages` / `generativelanguage.googleapis.com/.../generateContent` / `*-aiplatform.googleapis.com/.../rawPredict` / `dashscope.aliyuncs.com/...text-generation/generation` / `open.bigmodel.cn/api/paas/v4/chat/completions`
  - **走 Runway 但路径不对**：`/v1/chat/completions` / `/v1/responses` / `/google/anthropic/v1:rawPredict` / `:streamRawPredict` 等非 `/bedrock_runtime/model/invoke[-with-response-stream]`
  - **走 Runway 但请求体不对**：缺 `anthropic_version`、`system` 在 messages 里、含 `model`、新模型还在传 `temperature` 或老式 `thinking.type:"enabled"`
- **依赖清理**（**先判用途**）：
  - **仅文本** SDK：移除（`openai` 直连 / `anthropic` / `@anthropic-ai/sdk` / `zhipuai` / langchain 各文本 provider）
  - **同时被非文本用**的 SDK：**保留**（`google-generativeai` / `@google/generative-ai` / `google-cloud-aiplatform` / `dashscope` 等）
  - **专用非文本**：**保留**（`replicate` / `runwayml` / `elevenlabs` / `@aws-sdk/client-polly` / `client-transcribe`）
- **API 形态**：见上方"curl 自检" 对照表
- **业务参数等价**：
  - prompt 文本、流式开关、tool schema（**Anthropic 用 `tools[*].input_schema`**，与 OpenAI `tools[*].function.parameters` 不同）做语义对齐
  - `temperature` 不要无脑迁——老模型可传，**Opus 4.x / Claude 4 已废弃**
  - thinking 按模型版本：3.x 用 `thinking:{type:"enabled",budget_tokens:N}`，4.x 用 `thinking:{type:"adaptive"}` + `output_config:{effort:"..."}`
- **常见误改**：
  - 不保留 `Authorization: Bearer <key>` 想"反正网关也认"——`token:` 是硬规定，混用 401
  - catch 块至少打印 `error.message` 和上游 response body，别 `} catch { console.error("ai failed"); }` 吞异常

---

## § 六、SSO 身份接入

Guard 已做 SSO ECDSA 验签 + OA-Office 权限校验，子应用从 `Decrypted-Userinfo` request header 读 JSON。

### 不要做

- **不重复 SSO 验签 / JWT 中间件 / `/auth/callback`**——Guard 已处理
- **不叠权限层**：OA-Office 已校验"该用户对该 app 是否有权访问"。业务级细粒度鉴权仍是 subapp 的事

### Header 规格

`Decrypted-Userinfo` 是单行紧凑 JSON，**6 字段**：

```json
{"avatar":"https://...","displayName":"张三","email":"zhangsan@xiaohongshu.com","userId":"60a1b2c3d4","name":"zhangsan","emailAlias":"zhangsan"}
```

| 字段 | 含义 |
|---|---|
| `userId` | 用户唯一 ID |
| `name` | 薯名 / 英文名 |
| `displayName` | 中文名 |
| `email` | 邮箱 |
| `emailAlias` | 邮箱前缀 |
| `avatar` | 头像 URL（SIT 合成时为空） |

**`hrUserId` / `department` / `employeeType` 等 HR 字段不在这里**——业务按 `email` 调通讯录查，不写 `user.get("hrUserId", "")` 静默兜空。

### 读取：latin-1 → utf-8 必修

Guard 用 `serde_json::to_string()` 输出 UTF-8，但 HTTP 框架（Starlette / FastAPI / Express / Koa / Django）默认按 **latin-1** 解 header（HTTP/1.1 spec），中文 → `é¹¿è` mojibake。**ASCII round-trip 无害，无脑加上**：

#### Python（FastAPI）

```python
from fastapi import Request, HTTPException, Depends
import json

def get_user(request: Request) -> dict:
    raw = request.headers.get("Decrypted-Userinfo")
    if not raw:
        raise HTTPException(401, "Not authenticated")
    try:
        raw = raw.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass
    return json.loads(raw)

@app.get("/api/me")
async def me(user: dict = Depends(get_user)):
    return {"userId": user["userId"], "name": user["displayName"]}
```

#### Node.js（Express / Next.js）

```js
function getUser(req) {
  const raw = req.headers["decrypted-userinfo"];   // 自动 lowercase
  if (!raw) return null;
  const fixed = Buffer.from(raw, "latin1").toString("utf-8");
  try { return JSON.parse(fixed); } catch { return null; }
}
```

### 注意

- **header 在业务路径总是存在**：SSO 失败 / 无权限 Guard 已在反代层 401 / 403 / 302，到不了 subapp。防御性 null check 保留无害但不必为"未登录"预设复杂分支
- **🛠 SIT 调试快捷**：`APP_ENV=sit` 且请求带 `sso-email: <email>` header 时 Guard 跳过验签按 email 合成 userinfo（`avatar=""`）。本地 curl `-H 'sso-email: zhangsan@xiaohongshu.com'`

### SSO 与自有账号体系并存

典型："内部走 SSO + 外部走自有账号"。**允许**保留 `POST /api/login` / bearer token / 用户表 `password` 字段——只要这套体系**只服务 SSO 域外用户**，与 SSO 链路并行不互相覆盖。

### ⚠️ SSO 用户 ↔ 业务表 User 行的身份打通（高频陷阱）

`Decrypted-Userinfo` 给的字段（`userId` / `email` / `name` / `displayName` / `emailAlias` / `avatar`）都是 **SSO 平台身份**，**没有任何字段对应子应用业务库 `users` 表主键**。如果业务表（`projects.submitted_by` / `votes.user_id`）外键引用 DB User UUID，前端 submit 时把 `Decrypted-Userinfo.userId` 当 `submittedBy` 直接发上来，后端 `db.get(User, userId)` 必查不到 → 400 "用户不存在"。

**修法：`/api/session/me` 里 auto-provision**——SSO 用户首次访问时按 `email` 本地段当 `employee_id` 查/建 DB User，返 **DB UUID** 给前端：

```python
def _ensure_db_user(db, sso_user):
    email = (sso_user.get("email") or "").strip()
    employee_id = email.split("@")[0] if email else sso_user.get("userId") or ""
    name = sso_user.get("displayName") or sso_user.get("name") or employee_id

    stmt = select(User).where(User.employee_id == employee_id)
    user = db.execute(stmt).scalar_one_or_none()
    if user is not None: return user

    user = User(employee_id=employee_id, name=name, role="user")
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()                      # 并发 UNIQUE 冲突时回退到查询
        return db.execute(stmt).scalar_one()
    db.refresh(user)
    return user

@router.get("/me")
async def me(sso_user: dict | None = Depends(get_user)):
    if sso_user is None:
        return {"success": False, "message": "未登录"}
    with SessionLocal() as db:
        db_user = _ensure_db_user(db, sso_user)
        return {"success": True, "data": {
            "userId": db_user.id,           # ← 关键：返 DB UUID，不是 SSO email
            "email": sso_user.get("email"),
            "displayName": db_user.name,
            "avatar": sso_user.get("avatar"),
        }}
```

**判断打通**：业务接口拿到的 `userId` / `submittedBy` 能直接 `db.get(User, x)` 查到行，不用再做映射。

> auto-provision 仅业务表用 **UUID 主键** 时需要；用 `email` 当外键的直接拿 SSO email 即可。**看到 UUID schema 别想着"重构成 email-FK 更纯洁"**——改类型/迁数据/改 seed/改全部 query 的连锁工程超出转写范围，走 5 行 auto-provision patch。

### 🔌 前端 UI 身份槽位必须接 SSO 显示真实身份

很多原工程前端**预留**用户身份显示位（头像、用户名、邮箱、登录按钮），但原版认证 mock / 占位 / 写死，UI 永远显示 "Guest" / 默认头像 / 空。**漏接 = 用户一打开看到 "Guest" 就判定 app 没接入 SSO**。

> 🚨 只要 UI 有用户身份槽位，**必须**显示 SSO 真值 `displayName` 和 `avatar`。**不允许** mock 用户 / 占位 "Guest" / 空字符串 / 写死的开发者头像。

#### 识别信号（前端）

grep `*.vue` / `*.tsx` / `*.jsx` / `*.html` / `*.svelte` 找：

- **写死 mock**：`currentUser = { name: 'Guest' }` / `displayName: 'Demo User'` / `email: 'demo@example.com'` / `avatar: '/avatar-default.png'`
- **空槽位 + 无 fetch**：`<img class="avatar" />`（无 src）/ `<span class="username"></span>`（无文本）/ store `user: null` 永远不被填充
- **登录按钮无 handler**：`<button>登录</button>` 点了无效（SSO 域内用户不应看到登录页）
- **`useUser` / `useAuth` hook 内部返 null** 或 `localStorage.getItem('user')` 没人塞值
- **登录页 `/login` 占位无逻辑**

#### 实现 3 件套

**1. 后端 `/api/session/me`**（如已建复用，未建按下方）：

```ts
// Node 通用
app.get('/api/session/me', async (req, reply) => {
  const raw = req.headers['decrypted-userinfo'];
  if (!raw) return reply.code(401).send({ ok: false, message: '未登录' });
  const fixed = Buffer.from(raw as string, 'latin1').toString('utf-8');
  const sso = JSON.parse(fixed);
  // 业务库 User 表（UUID 主键）按上文做 auto-provision
  return reply.send({
    ok: true,
    user: {
      userId: sso.userId, displayName: sso.displayName,
      name: sso.name, email: sso.email,
      avatar: sso.avatar, emailAlias: sso.emailAlias,
    },
  });
});
```

```python
@app.get('/api/session/me')
async def get_me(request: Request):
    raw = request.headers.get('Decrypted-Userinfo')
    if not raw: raise HTTPException(401, '未登录')
    try: raw = raw.encode('latin-1').decode('utf-8')
    except (UnicodeEncodeError, UnicodeDecodeError): pass
    sso = json.loads(raw)
    return {'ok': True, 'user': {
        'userId': sso['userId'], 'displayName': sso.get('displayName', ''),
        'name': sso.get('name', ''), 'email': sso.get('email', ''),
        'avatar': sso.get('avatar', ''), 'emailAlias': sso.get('emailAlias', ''),
    }}
```

**2. 前端 mount 时 fetch + 全局状态**：

```ts
// Vue 3 / Pinia
export const useUserStore = defineStore('user', {
  state: () => ({ user: null as null | UserInfo }),
  actions: {
    async fetchMe() {
      const res = await fetch('/api/session/me');
      if (!res.ok) { this.user = null; return; }
      this.user = (await res.json()).user;
    },
  },
});
// App.vue onMounted: await store.fetchMe()  // 路由 guard / 首屏前完成
```

**3. 替换 UI 槽位 mock**：

```vue
<!-- ❌ mock -->
<header><img :src="'/avatar-default.png'" /><span>Guest</span></header>

<!-- ✅ SSO -->
<header v-if="userStore.user">
  <img :src="userStore.user.avatar || '/avatar-default.png'"
       :alt="userStore.user.displayName" />
  <span>{{ userStore.user.displayName || userStore.user.name }}</span>
  <span class="email">{{ userStore.user.email }}</span>
</header>
```

#### 注意

- **`avatar` SIT 环境可能为空**，前端必须占位图兜底，**不能**因 avatar 空就整个头像区不渲染
- **优先级**：`displayName` > `name` > `emailAlias`。**绝不**显示 "Guest" / "Anonymous" / "User"
- **不做** `/login` 重定向兜底——Guard 反代层已 SSO 验签，能到 subapp 必带 `Decrypted-Userinfo`；前端 401 写"会话过期请刷新"
- **不**把头像 URL 改成相对路径——`avatar` 是 SSO 完整外链，router 不改写绝对外链，原样用
- **多用户协作**（评论 / @ 提及 / 在线列表）：当前用户 `/api/session/me`；列其他用户走业务接口（DB 查表 + latin-1→utf-8）

#### 自检

```sh
grep -rE "(currentUser|user|displayName)[^a-zA-Z]*=[^=]*['\"](Guest|Demo|Anonymous|User|测试|游客)" \
     frontend/src apps/web/src 2>/dev/null
# 应 ø 命中

curl https://<host>/<prefix>/api/session/me -H 'Decrypted-Userinfo: <模拟值>' | jq
# 期望 ok:true + user.displayName / avatar 都是 SSO 实值
```

### 🔁 已有认证 / 登录代码

1. **删除**原 SSO / OAuth / JWT 验证中间件
2. **登录 / 注册 / 密码字段先看用户群体**：
   - 内部员工（与 SSO 域内重合）→ **删除**
   - SSO 域外（外部候选人、匿名访客、合作方）→ **保留**，并行运作
3. **改造**原本从 session / JWT / cookie 取**内部员工** `user_id` 的代码 → 读 `Decrypted-Userinfo`；自有账号体系仍可保留 token 解析路径

---

## § 七、URL 与资源路径

### 三类字符串

| 类别 | 例子 | 处理 |
|---|---|---|
| 服务端 routing（不入 HTML / Location） | `if (req.url === '/api/foo')` / `@app.get("/api/foo")` | subapp 内部对称，**不动** |
| 写进 HTML / 客户端 / API JSON 的 URL | `<a href="/foo">` / `fetch('/api/foo')` / `{"avatar":"/x.jpg"}` | 源码全写裸路径；router 会帮 HTML 属性 + `/_next/` 加前缀，但 **API JSON / CSS / WebSocket / cookie path 不在 router 改写范围**，按下面规则 |
| 框架编译产物里的 URL | Next.js webpack `<script src="/_next/...">` / Vite manifest | **不动**——不配 `assetPrefix` / `base` / `publicPath` |

### 🚨 router 兜不住的常见 404 来源（多页 / SSR / 静态站高频）

**「写裸路径就对」只适用于 router 会改写的载体**：HTML 属性（`a/img/link/script` 的 `href/src/action`）、`window.fetch` / `XMLHttpRequest`、`history.pushState/replaceState`、`location.assign/replace`、框架 webpack 的 `__webpack_public_path__`。**下面这些载体 router 完全不动，写绝对路径必 404**：

| 失败载体 | 例子（❌） | 改成（✅） |
|---|---|---|
| CSS 文件内 `url()` / `@import` | `background: url(/static/bg.png)` | `url(./bg.png)` / `url(../static/bg.png)` 按文件深度 |
| `@font-face` 字体 | `src: url("/fonts/x.woff2")` | 相对 |
| 内联 `style="..."` url() | `<div style="background:url(/x.png)">` | 用 class + 外部 CSS（外部里相对） |
| API JSON URL 字段被字符串拼 / 赋 inline style | `{avatar:"/x.jpg"}` → `el.style.backgroundImage = "url("+u.avatar+")"` | API 返纯文件名 `{avatar:"x.jpg"}`，前端 `new URL(name, document.baseURI).href` 或直接赋 `<img src>`（MutationObserver 会改写） |
| ES module 绝对 import / 动态 import | `import "/util.js"` / `import("/lazy.js")` | 相对，或 `new URL("./x.js", import.meta.url)` |
| Service Worker / manifest scope | `register("/sw.js")` / `"start_url":"/"` | `"./sw.js"` / `"start_url":"./"` |

**核心原则**：能用相对路径表达**全部用相对**。绝对路径只在 HTML 属性 + fetch/XHR 下安全。

### 写法规则（汇总）

| ❌ | ✅ |
|---|---|
| `location.href = "/foo"` / `location.assign("/foo")` | `location.href = "foo"` |
| `new WebSocket("/ws")` | `new WebSocket(new URL("ws", document.baseURI).toString().replace(/^http/, "ws"))` |
| `new EventSource("/sse")` | 相对路径 |
| `set_cookie(path="/")` | 不指定 path |
| CSS `url(/static/x.svg)` | `url(../static/x.svg)`（按 CSS 文件深度） |
| `<meta refresh url="/foo">` | `<script>setTimeout(()=>location.href="foo")</script>` |
| `manifest.json` `start_url: "/"` | `"./"`（`scope` / SW `register("./sw.js")` 同理） |
| API JSON `{avatar: "/x"}` | `{avatar: "x"}` |

### 服务端 redirect 必修

`redirect` / `set_cookie` **永远用相对路径**，不 `url_for` / `reverse` 拼绝对：

- FastAPI / Starlette `RedirectResponse("./")`
- Express `res.redirect("foo")`，同时 `app.set("trust proxy", true)`
- Django `HttpResponseRedirect("foo")`
- Next.js / Nuxt `redirect({ url, ... })` 用相对

> ⚠️ **Starlette `StaticFiles(html=True)` 尾斜杠 307 必修**（仅 Python + Starlette / FastAPI）：访问 `/submit`（无尾斜杠目录）默认返 307 + **绝对 URL Location**（`http://10.40.16.115:8080/submit/`，pod 内部 IP + HTTP 降级）→ 浏览器跨域 + mixed content + 401 三连。Router 只重写 `/` 开头的 Location，绝对 URL 管不了。**subapp 自己改相对**：
>
> ```python
> from fastapi.staticfiles import StaticFiles as _StaticFiles
> class StaticFiles(_StaticFiles):
>     async def get_response(self, path, scope):
>         response = await super().get_response(path, scope)
>         if response.status_code == 307 and "location" in response.headers:
>             last_seg = scope.get("path", "").rstrip("/").rsplit("/", 1)[-1]
>             response.headers["location"] = f"{last_seg}/" if last_seg else "./"
>         return response
> ```

### 改写阶段 grep 扫描

```sh
# 客户端导航
grep -rn 'location\.href\s*=\s*"/' .
grep -rn 'location\.assign("/' .
grep -rn 'window\.open("/' .
# 实时连接
grep -rn 'new WebSocket("/' .
grep -rn 'new EventSource("/' .
# CSS 内绝对 url（router 不改写 CSS 内容）
grep -rn 'url(/' . --include="*.css" --include="*.scss" --include="*.less"
grep -rEn '@import\s*["\x27]/' . --include="*.css"
# 内联 style url
grep -rEn '\bstyle=.*url\(/' .
# ES module 绝对 import
grep -rEn 'import[^(]*["\x27]/[^/]' . --include="*.js" --include="*.ts" --include="*.tsx" --include="*.jsx" --include="*.mjs"
grep -rEn 'import\(["\x27]/[^/]' . --include="*.js" --include="*.ts" --include="*.tsx" --include="*.jsx"
# Service Worker / manifest / refresh / set-cookie
grep -rn 'serviceWorker\.register("/' .
grep -rEn '"(start_url|scope)":\s*"/' . --include="*.json" --include="*.webmanifest"
grep -rEn 'http-equiv="[Rr]efresh"' .
grep -rn 'set_cookie.*path="/' .
```

---

## § 七.5、SPA / SSR 子路径部署

> **本节适用**：Next.js / Vue / React / Vite 等需构建的前端框架，或已构建产物。

链路图见 § C；本节聚焦 build / 部署细节。**subapp 出裸路径，router 在响应阶段注前缀**——一份产物可跨 app_id 复用。

### 改写阶段：标准 build，零特殊配置

```sh
cd <副本>
npm install
npm run build              # ← 不带任何 ASSET_PREFIX / BASE_PATH 等 env
# 验证 .next/standalone/server.js / dist/index.html 已生成
```

```sh
# install.sh（Pod 上跑）：
#!/bin/sh
set -e
cd "$(dirname "$0")"
[ -f .next/standalone/server.js ] || { echo "[install] missing build artifacts" >&2; exit 1; }
echo "[install] done"
```

**只拿到 build 产物没源码** → 直接打包；router 接管。**不要**在产物里查找 / 替换 prefix。

### Next.js 必修配置

```js
// next.config.mjs
export default {
  output: 'standalone',
  // ❌ 不配 assetPrefix / basePath / publicPath
  // ⚠️ 必加：关 Next.js 自压缩。pingora 对 streaming SSR 的 chunked + gzip 双层
  // 切坏帧 → 浏览器看到 (失败) status / 0.4 KB / 白页（curl 反而能拿到完整 body）。
  // 且 router body_filter 需明文 HTML 才能改写——上游不关 gzip，router 拿到二进制
  // → gsub 找不到 `<head>` 跳过注入 → 资源 URL 全部丢前缀 → 404。
  compress: false,
  poweredByHeader: false,
};
```

```ts
// app/layout.tsx —— App Router 必修（与 prefix 无关，不修就白屏）
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

> 🚨 **App Router build-time prerender 缓存空 HTML 必修**：Next.js 14 App Router 在 build 时尝试**静态预渲染**所有 page route（含 `'use client'` 的，仍有 server-side shell）。预渲染时**没有 SSO header / properties / runtime context**，主页面如果依赖这些，会渲染成**空 HTML**。Next.js 同时打 `s-maxage=31536000` 一年缓存——部署后**反代层 + Next.js 内置 cache HIT 空 HTML**，浏览器永久白屏，**Pod 日志看不到请求**（cache 命中没回源）。
>
> **现象**：`curl -i http://127.0.0.1:3000/`：
> ```
> HTTP/2 200
> cache-control: s-maxage=31536000, stale-while-revalidate
> x-nextjs-cache: HIT
> content-length: 0
> ```
>
> **修法**：`app/layout.tsx` 的 `dynamic = 'force-dynamic'` + `revalidate = 0` 让主 layout 强制 SSR。**不能加在 `app/page.tsx` 如果 page 是 `'use client'`**——`dynamic` / `revalidate` 是 server-side 导出，client component 不能用。Layout 永远是 server component。
>
> **build 验证**：build summary 主页面 `/` 应该是 `ƒ` (Dynamic) 不是 `○` (Static)。正常响应头 `cache-control: private, no-cache, no-store`。

### Next.js standalone server.js env 解耦（必修）

`start.sh` 必须把 standalone 自动生成的 `server.js` 里的裸 `process.env.PORT` / `process.env.HOSTNAME` 改成 `APP_PORT` / `APP_HOSTNAME`：

```sh
sed -i 's/process\.env\.HOSTNAME/process.env.APP_HOSTNAME/g' .next/standalone/server.js
sed -i 's/process\.env\.PORT/process.env.APP_PORT/g' .next/standalone/server.js
exec node .next/standalone/server.js
```

### Node 后端挂载 SPA 产物（Express / NestJS / Koa / Fastify 通用）

> 🚨 **NestJS `MiddlewareConsumer.forRoutes('*')` + `express.static` 必坑**（Starlette 307 的 Node 版同类病）。对任何 `.js` / `.css` 资源**后端 301 加尾斜杠**，浏览器跟进后 SPA 兜底返 HTML，控制台报 `MIME type "text/html"`。
>
> **机制**：NestJS 把 `forRoutes('*')` 翻译成 Express `app.use('*', middleware)`。Express 把 `'*'` 当 mount path，**整条 URL 被剥前缀**，serve-static 拿 `req.url = ''` / `'/'` → `fs.stat(STATIC_ROOT)` 命中目录 → 触发 `send` directory redirect → Location 用 `req.originalUrl + '/'` → **任意 asset 都 301 加 `/`**。
>
> 网络面板签名：`301 / Content-Type: text/html / CSP: default-src 'none' / X-Content-Type-Options: nosniff / X-Powered-By: Express / Location: <原 URL>/`

**❌ 反例**：

```js
// NestJS
consumer.apply(express.static(STATIC_ROOT, { fallthrough: true, index: false })).forRoutes('*');
// 同型：app.use('*', express.static(...)) / Koa router.use('*', mount(...)) / Fastify { prefix: '*' }
```

**✅ 正例（两条任选）**：

**方案 1：走 controller，自己 stat + sendFile**（推荐 NestJS）：

```js
@Controller()
class SpaIndexController {
  @Get('*')
  index(@Req() req: Request, @Res() res: Response) {
    if (req.path.startsWith('/api/') || req.path === '/health') {
      return res.status(404).json({ message: 'Not Found' });
    }
    if (req.path !== '/' && !req.path.includes('..')) {
      const assetPath = path.join(STATIC_ROOT, req.path);
      try {
        if (fs.statSync(assetPath).isFile()) return res.sendFile(assetPath);
      } catch { /* SPA 兜底 */ }
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(STATIC_ROOT, 'index.html'));
  }
}
@Module({ controllers: [SpaIndexController] })
export class StaticModule {}    // ← 不再 configure middleware
```

**方案 2：直挂底层 Express 实例**（推荐裸 Express / Fastify）：

```js
const app = await NestFactory.create(AppModule);
const expressApp = app.getHttpAdapter().getInstance();
expressApp.use(express.static(STATIC_ROOT, { fallthrough: true, index: false }));
// ↑ 在 NestJS controller 之前 use
await app.listen(port);
```

裸 Express 直接 `app.use(express.static(...))`（不带第一个路径参数）。

### 本地烟测：必须在产物里 grep 到裸路径

```sh
grep -rn '"/_next/' .next/standalone/.next/ .next/static/ 2>/dev/null | head -3
# 应能命中 —— 引号紧挨 /_next/

grep -roE '"[^"]+/_next/' .next/standalone/ 2>/dev/null | head
# 应 ø 命中。任意命中说明产物烧了 prefix，重新 build。
```

起 `node .next/standalone/server.js` `curl http://127.0.0.1:3000/` —— 应返 HTML，所有 `<script src>` 都是 `/_next/...` 裸路径。**不要**在本地加反代模拟 prefix。

### SPA 客户端路由必修：从 `<base href>` 运行时读 basename

> **本节适用**：用了 client router（react-router-dom、vue-router、@solidjs/router、svelte-routing 等）。**Next.js / Nuxt / SvelteKit 这类 server-driven routing 框架不在此列**——它们的 routing 由文件系统 + server 决定，client 端不直接读 `window.location.pathname` 匹配 routes。纯静态 / 纯后端工程也无关。

**目标**：浏览器 URL 带前缀（`/s/<app_id>/foo`），client router 源码写裸 routes（`/`、`/editor/:id`）。把 Guard router 注入的 `<base href="/s/<app_id>/">` 读出来当 basename。运行时探测，不烧 build；本地无 `<base>` 退化为 `/`。

#### 🚨 高频白屏陷阱（不修几乎必中）

**三件套现象（看到就判这个，不用再查别的）**：

- 浏览器**白屏**（`<div id="root">` 是空的）
- 控制台**零报错**
- Network 面板 HTML / JS / CSS 全 200，资源 URL 都被 router 正确加了前缀

**根因**：router 的 inline patch monkey-patch 了 `history.pushState`，但 client router 自身用 `window.location.pathname` 当事实源——`window.location.pathname = "/s/abc/"` 命不中 `<Route path="/">` 等任何裸 route，落到 catch-all `<Navigate to="/" replace>`，react-router 内部 navigate 到 `/`，pushState patch 又加回前缀，router 内部状态和 URL bar 来回打架——白屏。**inline patch 救不了这一段**，因为它只改 URL bar，不改 client router 的路径匹配源。

#### 修法（运行时探测；不烧 build；本地无 `<base>` 退化 `/`）

**React Router v6 / v7**：

```tsx
function getRouterBasename(): string {
  if (typeof document === 'undefined') return '/';
  const baseHref = document.querySelector('base')?.getAttribute('href') ?? '/';
  // "<base href=/s/abc/>" → react-router 要 "/s/abc"（无尾斜杠）；"/" → "/"
  return baseHref.replace(/\/+$/, '') || '/';
}
<BrowserRouter basename={getRouterBasename()}>...</BrowserRouter>
```

**Vue Router 4**：

```ts
import { createRouter, createWebHistory } from 'vue-router';
const base =
  (typeof document !== 'undefined'
    ? document.querySelector('base')?.getAttribute('href')
    : null) ?? '/';
const router = createRouter({
  history: createWebHistory(base.replace(/\/+$/, '') || '/'),
  routes: [...],
});
```

**Solid Router / svelte-routing / Wouter / 其它**：同样从 `<base href>` 读，按 router 的 API 喂 basename / base / `<Router base={...}>`。

#### 注意

- ❌ **不把前缀字面量烧进 build**：`<BrowserRouter basename="/s/abc">` 写死 = 跨租户全废
- ❌ **不用 env var**（`VITE_BASENAME` 等）——Pod 没"app 前缀"注入路径
- ❌ **不改 `HashRouter` / `createWebHashHistory` 绕过去**——URL 变 `/s/abc/#/editor/new`，破坏深链分享 / 服务端无法识别路径 / SEO
- ❌ **不配前端栈的 `base` / `assetPrefix` / `basePath` / `publicPath`**（§ C）——那是给静态资源 URL 加前缀的事，跟 client router 的 path matching 是两回事
- ✅ 本地直跑（`npm run dev` / 烟测）没 `<base>`，`querySelector('base')` 返 null → basename 退 `/`，dev 流程零变更

#### 自检

```sh
ROUTER_HITS=$(grep -rnE "(BrowserRouter|createBrowserRouter|createRouter|createWebHistory)" \
                --include='*.ts' --include='*.tsx' --include='*.jsx' --include='*.vue' \
                src/ apps/ 2>/dev/null \
              | grep -v -E '(node_modules|\.test\.|\.spec\.)')
for f in $(echo "$ROUTER_HITS" | awk -F: '{print $1}' | sort -u); do
  [ -z "$f" ] && continue
  if ! grep -qE "querySelector\(['\"]base['\"]\)" "$f"; then
    echo "[FAIL] $f 用了 client router 但 basename 不是从 <base href> 运行时读 —— 部署到 Guard 必白屏"
    exit 1
  fi
done
echo "[OK] SPA 客户端路由 basename 来自 <base> 运行时探测"
```

### 应用内导航与 API 调用

- **客户端跳转**：用框架原生组件（Next.js `<Link href="/foo">` / Vue `<router-link to="/foo">` / `<a href="/foo">`），传裸路径。router 在响应阶段把 DOM `<a href>` 改成带前缀；inline patch 接管 `history.pushState`
- **fetch / XHR**：写裸路径（`fetch('/api/foo')`），router monkey-patch 自动加前缀
- **WebSocket / EventSource**：用 `new URL("ws", document.baseURI).toString()` 基于 base 解析
- **重定向**：服务端 `redirect('/foo')` 写裸路径；router header_filter 把 Location 加前缀

**禁止**：`<a href="/s/<app_id>/foo">` 硬编进源码。**永远写裸路径**，让 router 注入。

### 已知边界

- **CSS 里 `url(/foo.png)`**：router body_filter 只处理 `text/html` / `text/x-component`，**不**处理 `text/css`。CSS 含 `url(/...)` 绝对路径会丢前缀。**修法**：CSS 改相对路径
- **大 HTML / 大 RSC（>2MB）**：router body_filter 默认 2MB 截断，超过透传 → 资源 URL 丢前缀。如确需调大，改 `lua/response_body_filter.lua` 里 `MAX_BODY_SIZE`
- **SSR streaming 的 TTFB**：router buffer 整个 HTML 后再改写，App Router 的 `loading.tsx` streaming SSR 体感 TTFB 退化
- **Service Worker 内的 fetch**：SW 跑独立线程，inline patch 不进 SW。**修法**：业务避免 SW 里发裸根路径请求
- **WebSocket / SSE 升级请求**：握手 URL 由浏览器侧 inline patch 改写正常路由 ✅

---

## § 八、目录与打包规则

zip 解压后根目录直接是项目根（不再多套一层），含 build 产物 + 5 个 shell 脚本 + lockfile + 后端源码，不含敏感 / 缓存 / 本地垃圾。

### 必须包含

| 内容 | 说明 |
|---|---|
| build 产物 | Next.js standalone：`.next/standalone/` + `.next/static/` + `public/`（改写阶段手动 `cp -r public .next/standalone/public && cp -r .next/static .next/standalone/.next/static`）<br>Vite SPA：`dist/`<br>Vue CLI / Webpack：`dist/` / `build/`<br>纯 Python：无 |
| shell 脚本 | `install.sh` / `start.sh` / `health.sh` 必需，`stop.sh` / `uninstall.sh` / `pm2.config.json` 可选 |
| 依赖声明 | `package.json` / lockfile / `requirements.txt` |
| `.npmrc` | 双路 registry |
| 后端源码 | Python `app/`、Node `server.js` 等 |
| 资源 | 图片、字体、规则模板 |

### 必须排除

- 顶层 `node_modules/`（Pod `npm ci --omit=dev` 重装；**例外**：`.next/standalone/node_modules/` 是 trace 最小集合必须保留）
- `.venv/` / `__pycache__/` / `.git/` / `*.pyc`
- IDE：`.idea/` / `.vscode/` / `.DS_Store`
- 缓存：`.next/cache/` / `.turbo/` / `.parcel-cache/`
- **本地配置 / 凭据文件**（结构性排除，只看文件名不读内容）：
  - `.env` / `.env.*` / `.envrc`（含 `.env.local` / `.env.production` / `.env.example`）—— Pod 不读 `.env`，业务走 `db.properties` / `ai.properties`
  - `db.properties` / `ai.properties`（Guard 注入，打进 zip 反被覆盖）
  - `*.example` 参考文件
  - `*.pem` / `*.key` / `id_rsa*`
- **开发产物**：
  - `build.sh` / `build.ps1` 等构建脚本
  - `docker-compose*.yml` / `Dockerfile*`
  - `README*.md` / `CHANGELOG*.md` / `CONTRIBUTING*.md` / `LICENSE*`（不强禁但建议删，节省 zip + 减少信息泄漏面）
  - `Makefile` / `justfile` / `Taskfile.yml`
  - lint / format / 测试配置：`.eslintrc*` / `.prettierrc*` / `jest.config.*` / `vitest.config.*`（**仅当不影响 build** 时可删；TS 严格 build 要它就留）
  - `docs/` / `wiki/`
- 转写 scratch：`HANDOFF.md` / `*_REPORT.md` / `BRAINSTORM*` / `.superpowers/`

### 打包命令

> 🚨 **必须 `cd` 进副本再打**——命令里 `.` 指当前目录。从父目录跑会把目录名嵌进 zip 顶层，部署时 Guard 报 `Required script not found: /home/app/<副本名>/install.sh`。

```bash
cd <副本>                  # ← 关键
chmod +x *.sh
zip -r ../myapp.zip . \
  -x "*.git*" "node_modules/*" \
     ".next/cache/*" ".turbo/*" ".parcel-cache/*" \
     ".venv/*" "__pycache__/*" "*.pyc" \
     ".env" ".env.*" ".envrc" \
     "db.properties" "ai.properties" "*.example" \
     "build.sh" "docker-compose*.yml" "Dockerfile*" \
     "README*.md" "CHANGELOG*.md" "CONTRIBUTING*.md" "LICENSE*" \
     "*credentials*" "*secret*" "*token*" "*.pem" "*.key" "id_rsa*" \
     "Makefile" "justfile" "Taskfile.yml" \
     "*/.DS_Store" ".idea/*" ".vscode/*" ".superpowers/*" \
     "docs/*" "wiki/*" \
     "tsconfig.tsbuildinfo"
```

> 🔒 **机器可验证硬关卡**：
>
> ```bash
> unzip -l ../myapp.zip | awk 'NR>3 {print $NF}' | grep -qx 'install.sh' \
>   || { echo "[FAIL] install.sh 不在 zip 顶层 —— 多套了一层目录，cd 进副本重打"; exit 1; }
> for f in start.sh health.sh; do
>   unzip -l ../myapp.zip | awk 'NR>3 {print $NF}' | grep -qx "$f" \
>     || { echo "[FAIL] $f 不在 zip 顶层"; exit 1; }
> done
> echo "[OK] zip 顶层结构正确"
> ```
>
> 必须真跑看到 `[OK]` 才算打包完成。

**关键 glob**：
- `.next/cache/*` 排除 next 增量缓存
- `.next/standalone/` / `.next/static/` 不在排除列表，会进 zip
- `node_modules/*` 只匹配顶层，不影响 `.next/standalone/node_modules/`，standalone 最小 deps 自动保留

> **必需脚本 Guard 自动 `chmod +x`**；可选脚本自己 chmod。打包前统一 `chmod +x *.sh`。用 macOS/Linux `zip` 保留权限位，**不用图形工具压缩**。

### ⚠️ 前端 build 产物 hash 错位

Vite / Webpack 给 `assets/index-[hash].js` 加的 hash 由文件内容决定——`index.html` 引用的 hash 和 `assets/` 实际文件名必须来自**同一次 build**，否则 404 / 白屏。

烟测：起服务 → `curl /` 抓 HTML → `grep -oE '/[a-zA-Z0-9_/-]*\.js'` 拿所有 JS URL → 每个 `curl -I` 都应 200。

**broken build 且无法重 build** → 停下问用户找前端同学。**不要**自己改 hash 恢复（强缓存 + 动态 import 懒加载 chunk 名编译进 JS 字符串改不到）。

---

## § 九、工作清单（顺序索引）

按 § B 8 步流程做。step 4 改源码 / 写脚本的细分：

| # | 做什么 | 详见 |
|---|---|---|
| 1 | 选栈（后端 Python / Node；前端栈类别） | § 一 |
| 2 | 架构：业务数据走 API JSON，HTML 不嵌业务数据 | § 二 |
| 3 | 前端：源码裸路径，**不配** `assetPrefix` / `basePath` / `publicPath` / `base`；静态资源挂载放在所有 API 之后 | § C / § 七 / § 七.5 |
| 4 | 监听 `0.0.0.0:3000`，端口写 `APP_PORT`（不是裸 `PORT`） | § 一 |
| 5 | 5 个 shell 脚本（`install.sh` 不含 build；`start.sh` 末行 `exec`；`health.sh` curl `127.0.0.1:3000/health`） | § 三 |
| 6 | DB：`db.properties` 读 + URL.create + 幂等 DDL + 幂等 DML；先扫"文件当 DB"反模式整体迁 | § 四 |
| 7 | AI（**仅文本对话**）：Runway Bedrock InvokeModel + `token:` header + Anthropic Messages + 顶级 `system` + **不传** `model` / `temperature`，不引文本厂商 SDK；查 `{Code, Error}` 伪 200 业务错。**图像/视频/语音/embedding 保留原工程实现，SDK 不删** | § 五 |
| 8 | SSO：`Decrypted-Userinfo` header + latin-1→utf-8；业务表 UUID 主键时 `/api/session/me` auto-provision | § 六 |
| 9 | 健康路由 `/health` + 前端用的状态端点改名（`/healthz` / `/api/info`） | § 三 |
| 10 | URL 全裸路径写源码；redirect / cookie / WebSocket / CSS `url()` 按 § 七 规则 | § 七 |
| 11 | 改写阶段跑 build：标准 `npm install && npm run build`（不带 ASSET_PREFIX 等 env），Next.js standalone 还要拷 public / static + sed 改 server.js env | § B / § 七.5 |
| 12 | § 十纸面自检 → § 十.5 实战烟测 → § 八 打 zip → 输出文件清单 | § 十 / § 十.5 / § 八 |

---

## § 十、自检 checklist

> 多数正向断言；少数带括号或负向措辞（如"无 Alembic"、"无 `npm run dev`"）是**针对 LLM 高频默认错答案**的停车桩，请勿删除。

### 通用必查

**工作副本（动手前的零号检查）**
- [ ] 改动发生在 § B 建立的工作副本（`<源>-guard` 或同义路径）；源工程 mtime / 内容**完全未触碰**
- [ ] "新增/修改文件清单"路径前缀是副本路径；最终 zip 在副本目录里 `zip -r` 打出
- [ ] 用户**没明确授权**"在原工程上改"时**不**走 in-place

**生命周期 & 端口**
- [ ] zip 根目录有 `install.sh` / `start.sh` / `health.sh`（这三个 Guard 自动 chmod；如有 `stop.sh` / `uninstall.sh` 自己 `chmod +x`）
- [ ] zip 解压后根目录直接是项目根（不多套一层）——**强制验证**：必须真跑 § 八 末尾的机器断言看到 `[OK] zip 顶层结构正确`；**不允许**靠人眼瞄
- [ ] **构建已在改写阶段（开发机）跑完，产物在 zip 里**——`install.sh` 内**无** `npm run build` / `vite build` / `next build` / `pnpm build` / `tsc` / webpack；`start.sh` 末行是 `exec <command>` 直接起现成产物
- [ ] `install.sh` **只装 runtime deps**（`pip install` / `npm ci --omit=dev`）+ DB schema 初始化
- [ ] **不在任何阶段跑 `npm run dev` / `vite dev` / `next dev`**
- [ ] `install.sh` 用**内部 / 公网双路镜像**：
  - pip 加 `-i http://pypi.devops.xiaohongshu.com/simple/ --trusted-host pypi.devops.xiaohongshu.com`
  - `.npmrc` 双路：`@xhs:registry = "http://npm.devops.xiaohongshu.com:7001"` + `registry = "http://registry.npmmirror.com"`
- [ ] `health.sh` 应用起来后返 0，未起来返非 0
- [ ] 服务监听 `0.0.0.0:3000`
- [ ] **前端从浏览器访问的状态/健康端点不叫 `/health`**（Guard 保留路径被反代层截）——用 `/healthz` `/api/info` 等；`health.sh` 仍走 `127.0.0.1:3000/health`

**打包**
- [ ] zip **含** build 产物：`.next/standalone/` + `.next/static/` + `public/`（Next.js）或 `dist/` / `build/`；纯 Python 后端无需
- [ ] zip **无顶层** `node_modules/` / `.venv/` / `.git/` / `__pycache__/` / `.next/cache/` / IDE 配置
- [ ] zip **无** `.env` / `.env.local` / `db.properties` / `ai.properties`（这些 Guard 注入，**绝不能**进 zip）
- [ ] `install.sh` 在干净目标镜像能跑通（**不依赖任何公网**）

**前后端分离 + 路径相对化（如有前端）**
- [ ] HTML / SSR 输出空壳，业务数据走 `/api/*` 异步；无 SSR 模板嵌业务数据
- [ ] HTML / JS / fetch / API 返回 URL 全部相对路径（grep 无 `href="/` `src="/` `action="/` `fetch("/`）
- [ ] CSS 内无 `url(/...)`；`set_cookie` / `res.cookie` 不带 `path="/"`；manifest / SW 路径以 `./` 起步
- [ ] 后端挂静态文件的中间件 / 路由写在所有 API 路由**之后**
- [ ] **redirect 全部相对**——`RedirectResponse("./")` / `res.redirect("foo")` / `HttpResponseRedirect("foo")`，**无**用 `request.url_for()` / `req.protocol + "://"` / `reverse()` 拼绝对
- [ ] **框架专属陷阱已处理**：前端栈**不配** `assetPrefix` / `basePath` / `publicPath` / `base` / Starlette `StaticFiles` 用 patched 子类把 307 Location 改相对
- [ ] **SPA 客户端路由 basename 是运行时从 `<base href>` 读出来的**（仅 react-router / vue-router / solid-router / svelte-routing 等 client router；Next.js / Nuxt / SvelteKit 不适用）。**不是**字面量、**不是** build-time env、**不是** `HashRouter` 绕过；本地无 `<base>` 退化 `/`。漏这条 = Guard 部署后**白屏 + 控制台零报错 + Network 全绿**（high-frequency 陷阱，详 § 七.5）

**SSO（仅当需用户身份）**
- [ ] 从 `Decrypted-Userinfo` header 读、JSON 解析
- [ ] **无**自做 SSO 验签 / JWT 中间件 / session cookie / `/auth/callback`；自有 `/api/login` + 密码字段**仅在面向 SSO 域外用户**时保留
- [ ] `Decrypted-Userinfo` 在业务路径**总是存在**；防御性 null check 可保留但不必为"未登录"预设复杂分支
- [ ] **业务表 UUID 主键时，`/api/session/me` 已 auto-provision**：返 DB UUID 而非 SSO email/userId
- [ ] **`Decrypted-Userinfo` 解析时做了 `latin-1 → utf-8` 重编码**（Python `raw.encode("latin-1").decode("utf-8")` / Node `Buffer.from(raw, "latin1").toString("utf-8")`）
- [ ] **前端 UI 身份槽位显示真实 SSO 身份**：grep 前端代码**无** "Guest" / "Demo" / "Anonymous" / "游客" / "测试" 等 mock 占位硬编进 displayName / currentUser / user.name；存在用户头像 / 用户名显示位的页面**必须**通过 `/api/session/me` 取 SSO 真值渲染；avatar 为空时用占位图兜底

**DB**（凡需持久化都走 DB；纯无状态工具应用允许整段忽略）
- [ ] **无"Redis / MQ / 外部 KV 当主存储"反模式残留**：
  - 依赖：`ioredis` / `redis` / `node-redis` / `aioredis` / `redis-py-cluster` / `memjs` / `pymemcache` / `bullmq` / `bull` / `celery` / `rq` / `kafkajs` / `amqplib` / `nats` 等
  - 代码：`new Redis(...)` / `createClient({url:...})` / `redis.set/get/hset/hget/zadd/lpush`
  - 配置：`REDIS_URL` / `REDIS_HOST` / `KAFKA_BROKERS` / `RABBITMQ_URL` / `CELERY_BROKER_URL`；代码硬编 `127.0.0.1:6379` / `:11211` / `:9092`
  - 伴生进程：`redis-bridge` / `bullmq-worker` / `celery-worker` 等 sidecar
- [ ] **无"文件当 DB"反模式残留**：
  - Node：`fs.writeFileSync` / `fs.appendFile` 写到非 `/tmp` 非日志路径；`JSON.parse(fs.readFileSync(...))` 配 `JSON.stringify` 写回；`lowdb` / `node-json-db` / `nedb` / `better-sqlite3` / `sqlite3` / `keyv` 文件 backend；`localStorage` / `sessionStorage` 当多用户共享业务存储用
  - Python：`json.dump` / `pickle.dump` / `shelve.open` / `dbm.open` / `tinydb` / `pandas.to_csv` 反复写同一文件；`sqlite3.connect("xxx.db")`
  - 任意：业务接口里"读整文件 → 改内存 → 整文件覆盖回写"
  - 写到 `data/` / `db/` / `storage/` / `uploads/` / `cache/` 等
- [ ] 上述模式如原工程有，已按 § 四整体迁 PG（**不是**保留 SDK 兜底 / 双写 / "可选 Redis"折中）
- [ ] 配置从 `./db.properties` 读；**无**"文件不存在 fallback 本地文件"
- [ ] 类型 PG；驱动：Python `psycopg[binary]` / Node `pg`
- [ ] DSN 用对象配置或显式 URL escape（**无** f-string / 模板字符串拼带密码的 URL）
- [ ] **无**把原始 driver 异常文本（`str(e)` / `err.message`）通过 HTTP 错误响应回传
- [ ] schema 初始化在 `install.sh`，**全部幂等 DDL**
- [ ] **无**引入 Alembic / Flyway / TypeORM migrations / Knex migrations
- [ ] 给已有表加字段时**显式** `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- [ ] 重复 install 不报错、不丢数据；schema 改动向前兼容
- [ ] **源工程初始化数据已迁过来**：grep 过 `prisma/seed*` / `seeders/*` / `fixtures/*` / `seed.sql` / `data.sql` / `db/init/*.sql` / `scripts/seed*` / `if (count === 0)` / `if not <Table>.objects.exists()`；命中的抽到 `app/seed/` 接入 install.sh DML。原工程无任何初始数据时 N/A
- [ ] **DML 紧跟 DDL 跑 `install.sh`**：DDL 后**显式**调 seed 脚本；`start.sh` / 业务 startup 钩子 / first-request **无**任何"自灌默认数据"残留
- [ ] **DML 全部幂等**：所有 `INSERT` 带 `ON CONFLICT (<自然键>) DO NOTHING`，自然键列在 DDL 有 `UNIQUE` / `PRIMARY KEY`
- [ ] **默认 `DO NOTHING` 而非 `DO UPDATE`**
- [ ] **seed 文件无明文 secret**
- [ ] **二进制 seed 走 LO + 按 sha256 幂等**
- [ ] **用户上传 / 下载文件**：二进制走 PG Large Object，元数据走业务表普通列；**不用** BYTEA、**无**写到 zip 解压目录下 `uploads/` 等本地路径、**无**引入对象存储 SDK

**AI（仅当调文本对话大模型）**

> ⚠️ 本组**仅覆盖文本对话**。图像/视频/语音/embedding/vision-only 保留原样——下面所有"无 SDK"/"无原生 endpoint"/"必须走 Runway"**不适用**于非文本。

- [ ] **文本调用**统一走 Runway Bedrock：非流式 `POST {ai.base_url}/bedrock_runtime/model/invoke`、流式 `POST {ai.base_url}/bedrock_runtime/model/invoke-with-response-stream`（**流式靠换 URL，不是 `stream:true`**）；`ai.base_url` 已含 `/openai`，**不再拼 `/openai/`**
- [ ] **文本调用无**残留 OpenAI Chat Completions（`/v1/chat/completions` / `/v1/responses`）、Vertex（`/google/anthropic/v1:rawPredict` / `:streamRawPredict`）或 Anthropic 原生 `/v1/messages`，**也无**直连 OpenAI / Anthropic / Gemini / Vertex / 智谱 / 通义 等第三方文本 endpoint
- [ ] **文本调用无**引入 `openai`（chat）/ `anthropic` / `@anthropic-ai/sdk` / `zhipuai` / langchain 文本 provider 等**纯文本** SDK；用 `httpx` / `fetch` 直接调
- [ ] **多用途 SDK**（`google-generativeai` / `@google/generative-ai` / `google-cloud-aiplatform` / `dashscope`）：仅文本 → 移除；含非文本 → **保留**，仅文本调用点迁 Runway
- [ ] **图像/视频/语音/embedding/vision-only 完全保留**；交付说明**显式列出**保留范围
- [ ] 认证用 `token: <key>` header（同发 `api-key:` 兼容；**不是** `Authorization: Bearer ...` / `X-Api-Key`）
- [ ] 配置从 `./ai.properties` 读，**无**硬编 base_url / api_key
- [ ] properties 解析后用 `props["ai.base_url"]` / `props["ai.api_key"]`（带 `ai.` 前缀）
- [ ] 请求体用 **Anthropic Messages**：`anthropic_version: "bedrock-2023-05-31"` / `max_tokens` / `messages`；`system` **顶级**字段
- [ ] **无** `"model"` 字段
- [ ] **无** `"temperature"` 字段（Opus 4.x 已废弃，传了 Runway 包成伪 200 错）
- [ ] 用 thinking 按模型版本：3.x `thinking:{type:"enabled",budget_tokens:N}`；**4.x `thinking:{type:"adaptive"}` + `output_config:{effort:"low"|"medium"|"high"}`**
- [ ] `max_tokens` **不照抄 1024**：多段结构化 JSON 至少 8000，开 thinking 至少 16000
- [ ] **必须**在 200 OK 通路检 Runway 业务错：`if (data.Code || data.Error) throw ...`
- [ ] 非流式取 `content[].text` 拼接（过滤 `block.type === "text"`）和 `usage.input_tokens` / `usage.output_tokens`（**不是** `choices[0].message.content` / `usage.prompt_tokens`）
- [ ] 流式按 Bedrock event stream 解：每行 `{"chunk":{"bytes":"<b64>"}}` → base64 解码 → Anthropic 事件 JSON（`content_block_delta.delta.type === "text_delta"`）
- [ ] catch 块至少把 `error.message` 和上游 response body **打印到 stderr**，**不**写空 catch 或只打字符串字面量
- [ ] **无**把上游异常字符串原样通过 HTTP / SSE 回传给浏览器

---

### Python 专属

- [ ] FastAPI 监听 `0.0.0.0:3000`
- [ ] **无** `app.run(...)`（Flask 残留）、**无** `Jinja2Templates(...)` 注入业务数据、**无** `url_for(...)` / `redirect(url_for(...))` 拼绝对 prefix
- [ ] `start.sh` 末行 `exec python -m uvicorn ...` 或 `exec gunicorn ...`
- [ ] **`StaticFiles(html=True)` 已自定义子类把 307 Location 改相对**
- [ ] **`URL.create(...)` 直接传 `create_engine`，无 `str(url)` 中转**；要字符串只能 `url.render_as_string(hide_password=False)`
- [ ] **走 raw `psycopg.connect()` 时 DSN drivername 是纯 `"postgresql"`**（不带 `+psycopg`），或用 `psycopg.conninfo.make_conninfo(...)`
- [ ] **无**把 `str(e)` 通过 `HTTPException(detail=...)` 回传

### Node / Next.js / 前端 build 专属

- [ ] `package.json` `engines.node` 是 `">=20"` 或类似宽松形式；**不是** `"20.x"` / `"22.x"`
- [ ] `package.json` **无** `"dev": "next dev"` / `"dev": "vite"` 这类脚本
- [ ] 删除 / 重写依赖后**改写阶段重跑 `npm install` 生成新 `package-lock.json`**；zip lockfile 与 `package.json` 一致
- [ ] **TypeScript strict 跑通**：改写阶段本地 `npm run build` 成功；严格类型问题在改写机修完
- [ ] **改写阶段 OOM 防护**：受限时 `export NODE_OPTIONS="--max-old-space-size=1536"`
- [ ] **`index.html` 引用的 `assets/index-<hash>.js` / `.css` 在 `assets/` 实际存在**（同一次 build，无新旧混搭）
- [ ] 子路径处理已按 § 七.5 决策
- [ ] **前端框架配置**：`next.config.mjs` / `vite.config.*` / `vue.config.*` 里**无**配 `assetPrefix` / `basePath` / `publicPath` / `base`
- [ ] **Express 专属**：`app.set("trust proxy", true)` 已设；`res.redirect()` 用相对 URL
- [ ] **Next.js standalone 专属**：`next.config.mjs` 写了 `compress: false`
- [ ] **Next.js standalone 专属**：改写阶段 build 完已 `cp -r public .next/standalone/public && cp -r .next/static .next/standalone/.next/static`
- [ ] **Next.js standalone properties 文件查找**：用 `findPropertiesFile()` 搜多个候选路径
- [ ] **Next.js standalone 专属**：build 完已 sed `process.env.HOSTNAME` → `APP_HOSTNAME`、`process.env.PORT` → `APP_PORT`；start.sh `export APP_HOSTNAME=0.0.0.0 APP_PORT=3000`。**禁止** `export HOSTNAME=...`
- [ ] **env 命名通用**：grep `process\.env\.HOSTNAME` `process\.env\.PORT` `process\.env\.USER` `process\.env\.HOME` `process\.env\.SHELL`——业务读这些必须加 `APP_` 前缀
- [ ] **改写阶段已跑本地烟测**：起 prod 启动命令，`curl /` 拿 HTML，所有 `_next/static/...` URL **裸根路径**，`curl -I` 都返 200

---

## § 十.5、本地启动验证

把"代码看着没问题、跑起来才暴雷"的炸点（TS 类型 / 模块 import / 依赖装少 / build 产物没拷全 / prerender 缓存空 HTML）在改写机上炸出来，别甩给 Pod。**§ 十纸面自检 + 本节实战烟测都必须过**。

### Step 0：源码反模式预检

```sh
cd <副本>

# §0. 用户输入残留 build / cache 预检（合法 build 产物存在则 skip）
if [ -f .next/standalone/server.js ] || [ -d dist/assets ] || [ -d build/static ] \
   || [ -d .next/static ]; then
  echo "[OK] 副本无 build / cache 产物残留 (skipped: 检测到合法 build 产物，已过 Step 1)"
else
  LEFTOVER=""
  for d in .next dist build out .turbo .cache .nuxt .svelte-kit .vite .parcel-cache .git; do
    [ -e "./$d" ] && LEFTOVER="$LEFTOVER ./$d"
  done
  if [ -n "$LEFTOVER" ]; then
    echo "[FAIL] 副本残留用户上传 build / cache 目录:$LEFTOVER"
    echo "       回 § B step 2 跑 rm -rf 清理"
    exit 1
  fi
  echo "[OK] 副本无 build / cache 产物残留"
fi

# §1. § 七.5 反例：express.static + forRoutes('*')
ANTIPATTERN_HITS=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if grep -nE '(express|express_[0-9]+\.default)\.static\(' "$f" 2>/dev/null \
     | grep -vE ':\s*(\*|//|#)' | grep -q .; then
    ANTIPATTERN_HITS="$ANTIPATTERN_HITS $f"
  fi
done <<EOF
$(grep -rl -E "\.forRoutes\(\s*['\"]\*['\"]\s*\)" \
       --include='*.ts' --include='*.js' --include='*.cjs' --include='*.mjs' \
       backend/src/ backend/dist/ src/ dist/ 2>/dev/null \
   | grep -v -E '(node_modules|\.test\.|\.spec\.)')
EOF
if [ -n "$ANTIPATTERN_HITS" ]; then
  echo "[FAIL] § 七.5 反例 (express.static + forRoutes('*')):${ANTIPATTERN_HITS}"
  exit 1
fi
if grep -rn -E "\.use\(\s*['\"]\*['\"]\s*,\s*express\.static" \
     --include='*.ts' --include='*.js' --include='*.cjs' --include='*.mjs' \
     backend/src/ backend/dist/ src/ dist/ . 2>/dev/null \
     | grep -v node_modules | grep -vE ':\s*(\*|//|#)' | grep -q .; then
  echo "[FAIL] § 七.5 同型陷阱 app.use('*', express.static)"
  exit 1
fi
echo "[OK] § 七.5 反模式预检通过"

# §2. 前端 config 不能配 base/assetPrefix/basePath/publicPath
HIT=$(grep -rnE "(assetPrefix|basePath|publicPath|^\s*base\s*:)" \
        next.config.* vite.config.* vue.config.* nuxt.config.* webpack.config.* \
        frontend/next.config.* frontend/vite.config.* frontend/vue.config.* 2>/dev/null \
      | grep -vE '//|/\*')
if [ -n "$HIT" ]; then
  echo "[FAIL] 前端 config 烧了前缀（§ C），删了重 build"
  echo "$HIT"
  exit 1
fi
echo "[OK] 前端配置裸路径预检通过"

# §2.5. SPA 客户端路由 basename 必须运行时读 <base href>（详 § 七.5）
ROUTER_HITS=$(grep -rnE "(BrowserRouter|createBrowserRouter|createRouter|createWebHistory)" \
                --include='*.ts' --include='*.tsx' --include='*.jsx' --include='*.vue' \
                src/ apps/ frontend/ 2>/dev/null \
              | grep -v -E '(node_modules|\.test\.|\.spec\.|dist/|build/|\.next/)')
ROUTER_FAIL=0
for f in $(echo "$ROUTER_HITS" | awk -F: '{print $1}' | sort -u); do
  [ -z "$f" ] && continue
  if ! grep -qE "querySelector\(['\"]base['\"]\)" "$f"; then
    echo "[FAIL] $f 用了 client router 但 basename 不是从 <base href> 运行时读"
    echo "       Guard 必白屏 + 控制台零报错（详 § 七.5 SPA 客户端路由必修）"
    ROUTER_FAIL=1
  fi
done
[ "$ROUTER_FAIL" = "1" ] && exit 1
echo "[OK] SPA 客户端路由 basename 来自 <base> 运行时探测"

# §3. Node 入口端口绑定：硬编码 / 未声明 / 字面量 三种都拦
for entry in server.js server.mjs app.js app.mjs main.js index.js src/server.ts src/main.ts; do
  [ -f "$entry" ] || continue
  if grep -nE '^[[:space:]]*(const|let|var)[[:space:]]+PORT[[:space:]]*=[[:space:]]*[0-9]+' "$entry" \
     | grep -vE '=\s*3000\b' | grep -q .; then
    echo "[FAIL] $entry 硬编 PORT 非 3000。改 parseInt(process.env.APP_PORT || '3000', 10)"
    exit 1
  fi
  if grep -qE '\bHOST\b' "$entry" \
     && ! grep -qE '^[[:space:]]*(const|let|var)[[:space:]]+HOST[[:space:]]*=' "$entry"; then
    echo "[FAIL] $entry 引用 HOST 但未声明（ReferenceError）"
    echo "       加：const HOST = process.env.APP_HOSTNAME || '0.0.0.0'"
    exit 1
  fi
  if grep -nE 'app\.listen\(\s*[0-9]+' "$entry" | grep -vE 'app\.listen\(\s*3000\b' | grep -q .; then
    echo "[FAIL] $entry app.listen 用了非 3000 字面量端口"
    exit 1
  fi
done
echo "[OK] Node 入口端口绑定预检通过"

# §4. 上游不能主动压缩
if grep -rnE "(compress\s*:\s*true|app\.use\(\s*compression|GZipMiddleware|require\(['\"]compression['\"])" \
     next.config.* server.* backend/src/ src/ 2>/dev/null \
   | grep -vE '(node_modules|compress\s*:\s*false|//)' | grep -q .; then
  echo "[FAIL] 上游主动压缩（§ 七.5）。Next.js compress:false / 移除 compression() / GZipMiddleware"
  exit 1
fi
echo "[OK] 上游不压缩预检通过"

# §5. 禁用外部基础设施
BANNED_DEPS='"(ioredis|redis|node-redis|redis-mock|memjs|memcached|bullmq|bull|bee-queue|agenda|kafkajs|node-rdkafka|amqplib|nats|@aws-sdk/client-s3|aws-sdk|minio|@elastic/elasticsearch|meilisearch|typesense|@pinecone-database/pinecone|weaviate-client|@qdrant/js-client-rest)"'
if grep -nE "$BANNED_DEPS" package.json apps/*/package.json packages/*/package.json **/package.json 2>/dev/null \
     | grep -v node_modules | grep -q .; then
  echo "[FAIL] package.json 引用了平台不提供的外部基础设施 SDK："
  grep -nE "$BANNED_DEPS" package.json apps/*/package.json packages/*/package.json **/package.json 2>/dev/null | grep -v node_modules
  echo "       → 这些数据迁 PG，删依赖"
  exit 1
fi
BANNED_PY='^[[:space:]]*(redis|aioredis|aredis|redis-py-cluster|celery|rq|dramatiq|huey|pymemcache|kafka-python|confluent-kafka|pika|nats-py|boto3|minio|elasticsearch|meilisearch|qdrant-client|pinecone-client|weaviate-client)([><=!~ ]|$)'
if [ -f requirements.txt ] && grep -nE "$BANNED_PY" requirements.txt 2>/dev/null | grep -vE '^\s*#' | grep -q .; then
  echo "[FAIL] requirements.txt 引用了平台不提供的外部基础设施 SDK："
  grep -nE "$BANNED_PY" requirements.txt
  exit 1
fi
if grep -rnE "(127\.0\.0\.1|localhost):(6379|11211|9092|5672|6380|2181|9200|9300)" \
     --include='*.ts' --include='*.js' --include='*.cjs' --include='*.mjs' \
     --include='*.py' --include='*.env*' --include='*.yaml' --include='*.yml' \
     --include='*.json' --include='*.toml' \
     src/ apps/ backend/ packages/ . 2>/dev/null \
   | grep -v -E '(node_modules|\.next/|dist/|build/)' | grep -q .; then
  echo "[FAIL] 代码 / 配置引用 127.0.0.1:6379 等本地服务端口"
  grep -rnE "(127\.0\.0\.1|localhost):(6379|11211|9092|5672|6380|2181|9200|9300)" \
       --include='*.ts' --include='*.js' --include='*.py' --include='*.env*' \
       src/ apps/ backend/ packages/ . 2>/dev/null | grep -v -E '(node_modules|\.next/|dist/|build/)' | head -10
  exit 1
fi
echo "[OK] 无禁用外部基础设施依赖"

# §6. db.properties 必填 key 越权检测
ALLOWED='db\.(type|host|port|username|password|database)'
SUSPECT=$(grep -rnE "['\"]db\.[a-z_]+['\"]" \
            --include='*.ts' --include='*.js' --include='*.cjs' --include='*.mjs' \
            --include='*.py' \
            src/ apps/ backend/ public-relay/apps/*/src 2>/dev/null \
          | grep -v -E '(node_modules|\.test\.|\.spec\.|\.next/|dist/|build/)' \
          | grep -oE "['\"]db\.[a-z_]+['\"]" | sort -u \
          | grep -vE "^['\"]($ALLOWED)['\"]$")
if [ -n "$SUSPECT" ]; then
  echo "[FAIL] 代码引用了平台不注入的 db.properties key（详 § 四）："
  echo "$SUSPECT"
  echo "       平台只注入：db.type / db.host / db.port / db.username / db.password / db.database"
  exit 1
fi
echo "[OK] db.properties 必填 key 未越权"

# §7. dev artifacts / 本地配置文件残留扫描（结构性，只看文件名）
LEAKS=""
ENV_FILES=$(find . -maxdepth 4 -type f \( -name '.env' -o -name '.env.*' -o -name '.envrc' \) \
            -not -path './node_modules/*' -not -path './.git/*' 2>/dev/null)
[ -n "$ENV_FILES" ] && LEAKS="$LEAKS\n$ENV_FILES"
EXAMPLE=$(find . -maxdepth 4 -type f -name '*.example' -not -path './node_modules/*' 2>/dev/null)
[ -n "$EXAMPLE" ] && LEAKS="$LEAKS\n$EXAMPLE"
DEV=$(find . -maxdepth 2 -type f \( -name 'build.sh' -o -name 'docker-compose*.yml' -o -name 'Dockerfile*' \
       -o -name 'Makefile' -o -name 'justfile' -o -name 'Taskfile.yml' \) 2>/dev/null)
[ -n "$DEV" ] && LEAKS="$LEAKS\n$DEV"
if [ -n "$LEAKS" ]; then
  echo "[FAIL] 副本含 dev artifacts / 本地配置（详 § 八）：$LEAKS"
  exit 1
fi
echo "[OK] 无 dev artifacts / 凭据残留"

# §8. install.sh 公网调用检测
if [ -f install.sh ]; then
  ALLOWED_DOMAIN='(xiaohongshu\.com|npmmirror\.com|rednote\.life)'
  EXTERNAL=$(grep -oE 'https?://[a-zA-Z0-9.-]+' install.sh 2>/dev/null \
             | grep -vE "//[^/]*${ALLOWED_DOMAIN}" | sort -u)
  if [ -n "$EXTERNAL" ]; then
    echo "[FAIL] install.sh 引用公网域名（Pod 无公网必失败）："
    echo "$EXTERNAL"
    exit 1
  fi
  if grep -nE '(playwright|puppeteer|@cypress/run)\s+(install|browsers\s+install)' install.sh 2>/dev/null | grep -q .; then
    echo "[FAIL] install.sh 触发浏览器二进制公网下载（playwright/puppeteer/cypress install）"
    exit 1
  fi
fi
echo "[OK] install.sh 无公网调用"
```

### Step 1：装依赖 + 跑 build

```sh
cd <副本>

# Node：改写机有公网，公网 registry 直接装
npm install
npm run build                     # ← 不带 ASSET_PREFIX / BASE_PATH 等 env

# Next.js standalone 还要拷资源 + sed
cp -r public .next/standalone/public 2>/dev/null || true
cp -r .next/static .next/standalone/.next/static
sed -i '' 's/process\.env\.HOSTNAME/process.env.APP_HOSTNAME/g' .next/standalone/server.js
sed -i '' 's/process\.env\.PORT/process.env.APP_PORT/g' .next/standalone/server.js
# Linux sed：去掉 -i 后的 ''

# Python：临时 venv，烟测后删
python3 -m venv .venv-build && . .venv-build/bin/activate
pip install -r requirements.txt
```

任何 build 报错 → 回 § B step 4 修源码 / 依赖 / 配置。**不带病往下走**。

### Step 2：起服务跑端点烟测

```sh
APP_PORT=3030 APP_HOSTNAME=127.0.0.1 node .next/standalone/server.js > /tmp/smoke.log 2>&1 &
SMOKE_PID=$!
sleep 4

curl -s -o /dev/null -w "/health      → %{http_code}\n" http://127.0.0.1:3030/health
curl -s -o /dev/null -w "/api/healthz → %{http_code}\n" http://127.0.0.1:3030/api/healthz
curl -i http://127.0.0.1:3030/ | head -20    # 首页 200 + 非空 + 非 prerender 空 HTML

# 资源裸根路径
curl -s http://127.0.0.1:3030/ | grep -oE '"[^"]*/_next/[^"]+"' | head -3

# ── 强断言：HTML 引用的每个 asset 必须 200 + 正确 MIME ──
HTML=$(curl -s http://127.0.0.1:3030/)
ASSETS=$(echo "$HTML" | grep -oE '/(assets|_next|static)/[^"'"'"' )>]+\.(js|css|mjs)' | sort -u)
[ -z "$ASSETS" ] && { echo "[FAIL] HTML 里没找到任何 asset URL —— 首页可能空 HTML / prerender cache 命中"; exit 1; }

FAIL=0
for url in $ASSETS; do
  HEADERS=$(curl -sI "http://127.0.0.1:3030${url}")
  CODE=$(echo "$HEADERS" | head -1 | awk '{print $2}')
  CT=$(echo "$HEADERS" | grep -i '^content-type:' | tr -d '\r' | awk -F': ' '{print $2}')
  LOC=$(echo "$HEADERS" | grep -i '^location:' | tr -d '\r' | awk -F': ' '{print $2}')
  if [ "$CODE" != "200" ]; then
    echo "[FAIL] $url → $CODE${LOC:+, Location=$LOC}"
    # 典型坑：301 + Location 加 / → NestJS forRoutes('*') / app.use('*', static) 剥前缀
    FAIL=1; continue
  fi
  case "$url" in
    *.js|*.mjs) echo "$CT" | grep -qi 'javascript\|ecmascript' || { echo "[FAIL] $url → 200 但 Content-Type=$CT（期望 javascript，SPA 兜底返 HTML）"; FAIL=1; } ;;
    *.css)      echo "$CT" | grep -qi 'css'                    || { echo "[FAIL] $url → 200 但 Content-Type=$CT（期望 css）"; FAIL=1; } ;;
  esac
done
[ "$FAIL" = "0" ] && echo "[OK] 所有 asset 200 + 正确 MIME" || exit 1

# 反向断言：产物里引号到 /_next/ 之间不能有任何字符（前缀字面无关）
if [ -d .next/standalone ]; then
  grep -roE '"[^"]+/_next/' .next/standalone/ 2>/dev/null | head -3 \
    && { echo "[FAIL] 产物里烧了 prefix"; exit 1; } \
    || echo "[OK] 产物裸路径正确"
fi

# ── 强断言：上游不压缩（router body_filter 要明文 HTML） ──
if curl -sI -H 'Accept-Encoding: ' http://127.0.0.1:3030/ \
   | grep -iE '^content-encoding:\s*(gzip|br|deflate|zstd)' >/dev/null; then
  echo "[FAIL] 上游强制压缩"
  exit 1
fi
echo "[OK] 上游响应明文，router body_filter 可工作"

# ── 强断言：CSS 无 url(/...) 绝对路径 ──
CSS_HITS=$(for d in dist .next/standalone/.next/static .next/static public/assets static/assets; do
  [ -d "$d" ] && grep -rE 'url\(\s*/[a-zA-Z]' "$d" --include='*.css' 2>/dev/null
done | grep -vE 'url\(\s*//' | head -5)
if [ -n "$CSS_HITS" ]; then
  echo "[FAIL] CSS 有 url(/...) 绝对路径（router 不改 text/css 会丢前缀）"
  echo "$CSS_HITS"
  exit 1
fi
echo "[OK] CSS 无 url(/...) 绝对路径"

kill $SMOKE_PID 2>/dev/null
NEW_PID=$(lsof -ti :3030); [ -n "$NEW_PID" ] && kill -9 $NEW_PID
```

> 🔒 **机器可验证硬关卡**：下面 13 行 `[OK]` 必须**全部**在烟测输出里，**少一行 = 未交付**。**§ 十一交付时必须把烟测 stdout 原样粘贴**。
>
> ```
> [OK] 副本无 build / cache 产物残留    ← Step 0
> [OK] § 七.5 反模式预检通过           ← Step 0
> [OK] 前端配置裸路径预检通过           ← Step 0
> [OK] SPA 客户端路由 basename 来自 <base> 运行时探测    ← Step 0
> [OK] Node 入口端口绑定预检通过        ← Step 0
> [OK] 上游不压缩预检通过               ← Step 0
> [OK] 无禁用外部基础设施依赖           ← Step 0
> [OK] db.properties 必填 key 未越权    ← Step 0
> [OK] 无 dev artifacts / 凭据残留      ← Step 0
> [OK] install.sh 无公网调用            ← Step 0
> [OK] 所有 asset 200 + 正确 MIME       ← Step 2
> [OK] 上游响应明文，router body_filter 可工作    ← Step 2
> [OK] CSS 无 url(/...) 绝对路径        ← Step 2
> ```
>
> 用了 client router 的工程：上面 "SPA 客户端路由 basename" 这行**必出**；纯 Next.js / Nuxt / SvelteKit / 纯后端工程：这行**也必出**（§ 十.5 Step 0 §2.5 命不中任何 client router 入口时直接打 `[OK]`，不跳过）。

**额外人眼验收**：

- `/` 响应头 `cache-control: private, no-cache, no-store`（不是 `s-maxage=31536000` App Router prerender 空 HTML）
- Next.js 工程：`grep -roE '"[^"]+/_next/' .next/standalone/` 应 ø 命中

> ⚠️ **常见翻车排查**：
> 1. **`/` 200 但 body 空 + `s-maxage=31536000`** → App Router prerender 缓存空 HTML，§ 七.5 `dynamic = 'force-dynamic'`
> 2. **HTML 里 `_next/...` 被夹了前缀** → `next.config` 烧了 `assetPrefix` / env 有 `ASSET_PREFIX`
> 3. **进程未就绪 / 端口未释放** → `sleep 4` 提到 6-10s；`lsof -ti :3030` 强杀残留

### Step 3：清理 + 打包

```sh
rm -rf .venv-build .next/cache
pkill -f ".next/standalone/server.js" 2>/dev/null
sleep 1
# 然后跑 § 八的 zip 命令
```

---

## § 十一、提供给你的工程

（此处粘贴或挂载工程目录、关键文件、`requirements.txt` / `package.json` 等。）

请按 § B 流程产出，并按 § 九索引顺序覆盖。输出至少包含：

1. **形态判定**（一句话，如 "Python+FastAPI 手写多页静态 / 无前端 build" / "Next.js standalone + router 注入 prefix" / "Vue+Vite SPA + Python 后端"）
2. **文件清单 + 5 个 shell 脚本最终内容**（路径相对副本，声明源工程未动；`install.sh` 显示**无** build 命令）
3. **改写阶段 build 命令 + 烟测结果 stdout 原样粘贴**——按 § 十.5 Step 0~2 跑完，**必须**把终端 stdout 原样贴进交付，**必须**含下面 13 行字面量 `[OK]`：
   ```
   [OK] 副本无 build / cache 产物残留
   [OK] § 七.5 反模式预检通过
   [OK] 前端配置裸路径预检通过
   [OK] SPA 客户端路由 basename 来自 <base> 运行时探测
   [OK] Node 入口端口绑定预检通过
   [OK] 上游不压缩预检通过
   [OK] 无禁用外部基础设施依赖
   [OK] db.properties 必填 key 未越权
   [OK] 无 dev artifacts / 凭据残留
   [OK] install.sh 无公网调用
   [OK] 所有 asset 200 + 正确 MIME
   [OK] 上游响应明文，router body_filter 可工作
   [OK] CSS 无 url(/...) 绝对路径
   ```
   **任何一行缺失 = 未跑 / 跑挂 = 视同未交付，要求重做**。不允许写"已跑通"一句话搪塞；不允许伪造 stdout。
4. **§ 十纸面自检** 过一遍
5. **AI 模型覆盖范围声明**（即便没调 AI 也要写"未检测到任何模型调用"一句话；调了分两段）：
   - **已迁移（文本对话）**：每个调用点旧 endpoint / SDK → 新 Runway Bedrock 路径
   - **未替换（图像 / 视频 / 语音 / embedding / vision-only）**：每个调用点的文件:行号 + 模型类型 + 走的原生 endpoint / SDK，**显式标注**"按当前策略保留原工程实现，相关 SDK 未从依赖清单删除"
6. **最终 zip 命令**（在副本目录执行，按 § 八）+ § 八 `[OK] zip 顶层结构正确` 断言的 stdout

> 📌 **不需要 app_id**。subapp build 时不烧任何 prefix，由 router 注入（详 § C）。即使用户主动给 app_id 也别配进 build。
