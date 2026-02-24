# 词根词缀记忆工坊

基于 `https://github.com/jesselau76/cigen` 项目，进一步增强功能，实现词根词缀 + 单词层面的记忆和学习，并支持一键部署到 Vercel。

## 功能概览

### 检索首页（Search Home）

- **混合检索**：一个输入框同时支持按词根/词缀/中文提示 + 单词检索。
- **词根列表与详情**：
  - 左侧词根/词缀列表，支持实时过滤与随机词根。
  - 右侧词根详情：例词列表、拆解信息、中文提示、掌握状态等。
- **按单词匹配结果**：
  - 输入单词后，会在搜索框下方显示“按单词匹配”结果列表。
  - 点击列表中的单词，或词根详情中的例词，即可进入**单词详情**视图。
- **单词详情视图**（基于 `entries` 数据）：
  - Simple English 风格的 `definition` 与 `exampleSentence`。
  - 拆解信息（`decomposition`）。
  - 发音音频（使用 `https://dict.youdao.com/dictvoice?audio=<word>&type=2`）。
  - 单词中出现的词根/词缀以 chip 形式展示，可点击跳转到对应词根详情（若该 morpheme 存在于 `roots` 中）。

### 学习页（Learning）

- **闪卡训练**：
  - 随机/顺序遍历高频词根。
  - 显示含义提示与例词，支持“显示答案 / 再看一次 / 我记住了”。
  - 本地记录已掌握词根数（`localStorage`）。
- **选择题训练**：
  - 根据词根含义生成四选一题目。
  - 高亮正确/错误选项，并展示示例单词。
  - 本地统计正确 / 总题数，显示正确率。

### About 页

- 展示项目标题、副标题与简要介绍。
- 总结应用的主要学习场景和入口（检索首页 / 学习页）。

## 数据与脚本

- `data/roots_affixes.json`：
  - `roots`：词根/词缀列表及示例单词。
  - `entries`：单词词条，包含：
    - `word`，`meaning`（中文），`decomposition`，`components` 等原始字段。
    - **新增字段**：
      - `definition`：Simple English 风格的简单释义。
      - `exampleSentence`：Simple English 风格的例句。
- `scripts/extract_pdf_data.py`：从 PDF 生成基础词根/词缀与例词数据。
- `scripts/add_simple_definitions.py`：
  - 批量为 `entries` 生成 Simple English 风格的 `definition` 与 `exampleSentence`。
  - 若某条目已经手动提供了这两个字段，则脚本不会覆盖原值，方便你对高频词进行精修。

## 前端结构

- `index.html`：单页应用骨架，包含三个主面板：
  - `检索首页`（Search Home）
  - `学习页`（Learning）
  - `About`
- `styles.css`：现代扁平化 UI 样式，适配桌面与移动端。
- `app.js`：
  - 数据加载与状态管理。
  - 词根/词缀检索、例词渲染、单词详情渲染。
  - 闪卡与选择题逻辑。

## 使用方式（本地运行）

1. （可选）从 PDF 重新生成数据：

   ```bash
   python3 scripts/extract_pdf_data.py
   ```

2. 启动静态服务（Python 3）：

   ```bash
   python3 -m http.server 8080
   ```

3. 打开浏览器访问：

   `http://localhost:8080`

## 发布到 GitHub Pages

1. 新建 GitHub 仓库并推送代码（分支 `main`）。
2. 仓库 `Settings -> Pages -> Build and deployment`:
   - Source 选择 `Deploy from a branch`
   - Branch 选择 `main` / `root`
3. 等待 1–2 分钟即可通过 Pages 地址访问。

## 一键部署到 Vercel

> 提示：先将本项目推送到你自己的 GitHub 仓库，然后点击下方按钮（将 `jmc-123/cigen-main` 替换为你的仓库路径即可）。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jmc-123/cigen-main&project-name=cigen-main&repository-name=cigen-main)

