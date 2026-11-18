# 智学库 ExamPilot｜Codex 开发计划

**接续进度** — Step 0–11 已完成。Step 10–11 通过干净安装、生产构建和浏览器验收，覆盖错题入库与变形题再练、生成失败后保留练习、无密钥及超时示例卷判分、示例重点标识与有效来源。无密钥、模拟超时和无效 JSON 的上传保留通过。真实模型因缺少密钥待验证。Step 12–15 按需追加。

Step 0–11 覆盖开发与演示范围，Step 12–15 按需追加。产品细节见 [《智学库-产品设计文档》](智学库-产品设计文档.md)。

## 在 Codex 中开始

- 同一聊天 · `继续下一步。`
- 新聊天 · `按 plan.md 接续。只读取文件开头至 Step 0 标题之前，再按进度读取目标步骤。`
- 指定范围 · `按 plan.md 完成 Step 3 到 Step 5。每步验收后分别提交并推送到 origin/main。`

步骤编号可替换。仅指定步骤时可说「执行 Step 3」，按进度接续时一次完成一个步骤。

## Codex 执行规则

1. **复用已有上下文。** 同一聊天沿用已读取的规则、步骤和未变更文件内容。缺少执行规则时，只读文件开头到 `## Step 0` 之前。需要补读步骤时，用 `rg -n '^## (Step [0-9]+ —|可选扩展$)' plan.md` 定位，只输出目标标题及其正文，截止于下一二级标题前。可选步骤只读取对应表格行。连续执行时逐步读取。设计文档只在本步有需求疑问时定点查阅相关小节。
2. **从断点实施。** 用户指定步骤优先，否则以顶部进度为入口。遵循适用的 `AGENTS.md`，只查看本步相关源码、配置和工作区差异。仅在进度与代码冲突或前置能力阻塞时核对对应旧步骤和提交。直接实现并验证缺口，复用已有代码，保持改动范围。
3. **保持技术约束。** 使用 Next.js 14 App Router、TypeScript、Tailwind CSS、SQLite（`better-sqlite3`）与 OpenAI 兼容 API。页面与路由在 `app/`，服务与数据访问在 `lib/`。SQLite 与解析在 Node.js 服务端运行，密钥使用服务端环境变量。
4. **验证当前改动。** 按本步验收条件检查正常及相关失败路径，按仓库配置运行适用的类型、构建或测试。真实模型受密钥或网络限制时，验证本地及降级分支并说明限制。
5. **按授权交付 Git。** 用户指定提交或推送时，每步验收通过后按功能独立提交。显式暂存本步文件并检查差异，避开无关改动、临时文件、数据库与密钥。使用已确认的分支和远程。汇报实际提交 SHA、推送结果或阻塞原因。
6. **只更新一行进度。** 验收通过后，在顶部写明刚完成的步骤与实际通过的检查、下一步；验收未通过时保留当前步骤并简记阻塞。收尾汇报关键改动、实际验收结果与待验证项。

## Step 0 — 初始化项目与 Git 仓库

**目标** — 建立可启动的 Next.js 单服务骨架。

**实施**

- 仅在缺少项目骨架时初始化 Next.js 14 App Router、TypeScript 和 Tailwind CSS。保留已有页面和锁文件，首页保留最小可访问内容。
- 功能依赖限于 `better-sqlite3`、`pdf-parse`、`mammoth`、`katex`、`openai` 及其必要类型与构建依赖。按实际步骤创建 `lib/` 模块。
- 提供 `.env.example`，包含 `LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`、`EMBEDDING_MODEL`。用 `.gitignore` 排除真实环境文件、依赖目录、构建产物和 `data/`。
- 若需新建仓库，使用 `main`；关联 GitHub 时使用用户提供的远程地址。已有 `origin` 时先核对配置。

**验收** — `npm run dev` 能启动，访问 `/` 返回成功。若本步包含远程配置，检查 `origin` 指向已确认的 GitHub 仓库。

**提交** — `chore: init Next.js project with minimal deps`、`docs: add env example and gitignore`

## Step 1 — SQLite 数据层

**目标** — 在首次连接时初始化 `data/app.db`，供上传、组卷、判分与错题模块复用。

**实施**

- 在 `lib/db.ts` 实现或复用连接及参数化查询，启用外键，保留现有数据。
- 核对以下表及字段。`chunks.embedding` 存储 JSON 数组字符串，允许空值。`keywords.name` 唯一，`doc_keywords` 使用联合主键。资料删除时级联清理分块和标签关联。

  | 表 | 字段 |
  | --- | --- |
  | `documents` | `id, filename, type, content_text, created_at` |
  | `chunks` | `id, doc_id, seq, text, embedding` |
  | `keywords` | `id, name` |
  | `doc_keywords` | `doc_id, keyword_id` |
  | `exams` | `id, title, config_json, paper_json, created_at` |
  | `exam_results` | `id, exam_id, answers_json, score, report_json, created_at` |
  | `mistakes` | `id, result_id, question_json, created_at` |

**验收** — 用测试数据验证首次连接建表、记录可查和资料级联删除。已有数据库可继续打开。

**提交** — `feat: add SQLite schema with better-sqlite3`

## Step 2 — F1 资料解析、分块与上传

**目标** — 将 PDF、DOCX、TXT、MD 解析为纯文本并入库。

**实施**

- 在 `lib/parser.ts` 实现或复用 `parseFile(buffer, filename)` 和 `chunkText(text)`。按扩展名选用解析器，TXT/MD 按 UTF-8 读取。分块默认最多 500 字、重叠约 50 字，优先在标点或换行处截断。
- `POST /api/upload` 接收 multipart 字段 `file`，以同一事务写入 `documents` 及有序的 `chunks`，返回 `docId` 和分块数。原始文件仅参与内存解析。对缺失、不支持、无法解析或无可用文本的文件返回明确错误。

**验收** — 上传一份足够长的 TXT，验证原文、分块顺序与重叠。提交错误输入后，确认没有留下部分记录。

**提交** — `feat: add file parsing and chunking to upload API`

## Step 3 — F1 自动关键词与 Embedding

**目标** — 上传后自动补充学习标签与向量，基础上传在外部服务不可用时仍然成立。

**实施**

- 在 `lib/llm.ts` 封装 OpenAI 兼容客户端，提供 `chatJSON(prompt, schema)` 和供上传、检索复用的 Embedding 调用。兼容服务支持结构化输出时传入 JSON Schema，服务端始终校验输出。JSON 解析或校验失败后重试一次，并设置调用超时。
- 在 `app/api/upload/route.ts` 的基础写入成功后，用全文前 3000 字提取 5–8 个学习关键词。清理空白与重复值，通过 `keywords` 和 `doc_keywords` 写入标签。
- 对本次上传的分块生成向量并写回。关键词和向量分别处理失败，保留已保存的资料和分块，缺失向量保持为空。既有空向量记录由 Step 5 的文本检索覆盖。

**验收** — 用含「极限」「导数」的高数资料验证 5–8 个相关标签及其关联，并检查向量存储。模拟缺少密钥、调用异常和无效 JSON，确认重试次数与上传保留行为。区分模拟验证与真实调用结果。

**提交** — `feat: add LLM keyword tagging and embeddings`

## Step 4 — F1 资料库管理

**目标** — 在 `/library` 完成上传、筛选、搜索、详情与删除。

**实施**

- 实现 `GET /api/docs`（`keyword`、`q` 可组合）、`GET /api/docs/[id]` 和 `DELETE /api/docs/[id]`。列表提供资料及标签，详情提供原文和分块定位所需的数据；无效或缺失 ID 返回合适的错误状态。
- 用现有 Tailwind 搭建资料卡片和筛选交互。服务端负责读取，客户端负责上传、搜索、筛选、查看和确认删除。展示操作中、空结果和错误状态。

**验收** — 从页面上传资料，组合关键词与搜索条件找到目标，打开原文详情后删除，确认列表、详情和数据库关联状态一致。

**提交** — `feat: add document CRUD API`、`feat: add library page with keyword filters`

## Step 5 — F2 RAG 检索

**目标** — 先限定资料范围，再返回相关分块与可用的溯源字段。

**实施**

- 在 `lib/rag.ts` 导出 `retrieve(keywords, query, topK = 8)`。先按关键词过滤候选资料，未选择关键词时使用全库。
- 复用 Step 3 生成查询向量，以 JS 计算余弦相似度。查询向量不可用或分块向量缺失、无效时，用查询与关键词进行文本匹配。对混合数据使用明确、一致的排序规则。
- 返回最多 `topK` 条结果，至少包含分块文本、资料 ID 和分块序号。兼容空库和筛选无结果。

**验收** — 准备包含目标和干扰资料的样本，用「极限」查询验证关键词过滤、排序、条数限制和溯源。分别验证可用向量、混合向量和纯文本模式。

**提交** — `feat: add RAG retrieval with cosine and text fallback`

## Step 6 — F2 智能组卷 API

**目标** — 根据自然语言要求和检索片段生成可落库的结构化试卷。

**实施**

- 实现 `POST /api/exam/create`，接收 `keywords`、`requirement`，支持保存供考试页使用的可选时长配置。验证请求后，用 Step 5 检索相关资料。
- 复用 `chatJSON` 生成 `{ title, questions: [{ type, stem, options?, answer, analysis, score, source_doc_id }] }`。题型为 `choice`、`blank`、`essay`，根据题型约束选项和答案，分值为正数，公式用 `$...$` 标记。
- Prompt 明确组卷要求、上下文和溯源规则，核对输出中的资料 ID 来自本次检索结果。把资料文本作为参考数据插入 Prompt。为评审留存实际模板和简短设计说明。
- 缺少可用上下文或模型调用失败时使用内置示例试卷，并记录示例状态。示例题的 `source_doc_id` 可为空。将配置与试卷存入 `exams`，返回 `examId`。

**验收** — 用高数资料和「帮我出份高数期中卷」验证试卷结构、题型约束、溯源及落库。模拟模型超时或无效输出，确认示例卷可加载且有明确标识。

**提交** — `feat: add exam generation with JSON Schema validation`

## Step 7 — F2 组卷页与在线考试页

**目标** — 从页面发起组卷并进入在线答题。

**实施**

- `/exam/create` 提供关键词多选、自然语言要求和生成按钮，处理加载与失败，成功后跳转 `/exam/[id]`。
- `/exam/[id]` 提供 KaTeX 公式、按配置或默认值显示的计时、分题型输入和答题卡锚点导航。定时器在离开页面时清理。
- 考试页只向浏览器提供作答所需的数据。预留提交入口，判分与报告跳转由 Step 8 接入。

**验收** — 在浏览器完成组卷和跳转，验证公式渲染、倒计时、各题型输入和答题卡跳转，检查页面数据中没有标准答案或解析。

**提交** — `feat: add exam creation page`、`feat: add online exam page with KaTeX and timer`

## Step 8 — F2 自动判分与成绩报告

**目标** — 从作答页交卷、判分，生成可查看的报告并记录错题。

**实施**

- 实现 `POST /api/grade`。从 `examId` 读取服务端存卷，校验答题数据。选择和填空在本地判分，主观题按评分标准调用 `chatJSON`，校验 `{ score, comment }` 及题目分值范围。
- 评分成功后，用同一事务写入 `exam_results` 和相关 `mistakes`。按错题页所需保留原题、考生答案、标准答案及解析。模型失败时提示具体状态，并在作答页保留答案以便重试。
- 交卷后按本次判分生成的结果 ID 打开 `/exam/[id]/result`。展示总分、逐题对错、解析和评语，图表按需要使用 CSS 实现。

**验收** — 全客观卷可在无模型配置时计算并显示成绩。验证含主观题的试卷、错题入库，以及同一试卷不同提交对应各自的报告。覆盖模型失败时的提示。

**提交** — `feat: add auto grading and score reports`

## Step 9 — F3 考试重点与考频

**目标** — 从所选资料或全库生成有星级、有来源和考频的复习大纲。

**实施**

- 实现 `POST /api/review` 与 `/review`，按资料范围生成 `{ points: [{ name, stars, summary, doc_id, chunk_seq }] }`。验证星级在 1–5 之间，并核对来源分块有效。支持从大纲跳到对应资料和分块。
- 复用资料库标签表示「往年试卷」，提供可操作的标记入口。仅在带该标签的资料原文中统计考点字符串次数，达到 3 次时显示「高频🔥」。频次由本地统计。
- 展示生成状态和失败提示，供 Step 11 接入示例降级数据。

**验收** — 用带标记与未标记的样本验证统计范围、阈值、星级展示和原文定位。

**提交** — `feat: add review outline with frequency stats`

## Step 10 — F4 错题本与举一反三

**目标** — 从成绩报告产生的错题出发，生成变形题并完成再练。

**实施**

- 实现 `/mistakes`、`GET /api/mistakes`、`POST /api/mistakes/similar`。列表可展开查看原题、考生答案、标准答案、解析和来源考试。
- 用原题及相关分块生成一道同知识点的变形题，复用 Step 6 的单题 Schema 与 Step 8 的判分规则。在页面支持作答、判分和查看反馈。

**验收** — 先交卷产生一条错题，再在错题页定位它、生成变形题、提交答案并看到判分反馈。验证外部调用失败时页面能继续使用。

**提交** — `feat: add mistake book and similar question practice`

## Step 11 — 降级、README 与评审材料

**目标** — 支持无密钥或接口超时时的核心演示，并提供可复现的项目说明。

**实施**

- 在 `lib/fallback.ts` 集中维护一套可离线判分的客观题示例试卷和一份示例重点，复用 Step 6 的试卷兜底，将示例重点接入 Step 9。界面标识示例数据，溯源只链接有效的资料记录。
- 用 `README.md` 说明项目定位、ASCII 架构图、运行前提、约 10 分钟的复现流程（克隆、复制 `.env.example`、安装依赖、启动）、示例资料和降级策略。记录组卷、判分、重点三条实际 Prompt 链。
- 在 `examples/` 准备 2–3 份简短、可公开使用的示例课程资料。

**验收** — 依 README 从干净检出和空数据库启动。在未配置密钥或模型超时的情况下，验证示例资料上传、组卷、客观题判分及重点查看，并核对示例标识与 README 描述。

**提交** — `feat: add demo fallback for exam and review`、`docs: add setup guide, prompt chains, and examples`

## 可选扩展

| 步骤 | 实施 | 验收 | 提交 |
| --- | --- | --- | --- |
| Step 12 · F5 | 基于考点大纲制作可翻页复习卡片 | 正面显示考点，翻面显示详解 | `feat: add review flashcards` |
| Step 13 · F6 | 实现单文档问答及流式输出 | 只检索所选文档，回答逐段显示 | `feat: add streaming document Q&A` |
| Step 14 · F7 | 用 ECharts 展示资料量、关键词词云与成绩趋势 | 指标与现有数据一致，空数据可展示 | `feat: add learning dashboard` |
| Step 15 · F8 | 用 `@media print` 实现试卷打印样式 | 浏览器打印预览保留题目并隐藏操作控件 | `feat: add exam print stylesheet` |
