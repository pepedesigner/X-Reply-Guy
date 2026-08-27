
```
                 __   __   ___                    ___
   |    |  |\/| |  \ /  \ |__   \ /  /\  | |\ |   |__
   |___ |  |  | |__/ \__/ |___   |  /--\ | | \|   |___

   ___   ___   ___   __        ___      ___   ___
  |   \ |   \ |   \ |  |      |   \    |   \ |  |
  |    \|    \|    \|  |      |    |   |    \|  |
  |__| /|__| /|__| /|__|      |__  /   |__| /|__|
  |    /|   /|   /  __        |  \/    |   /  __
  |   / |  / |  /  |  \       |   |    |  /  |  \
  |__/  |__/  |__/  |__/      |__/     |__/  |__/

  X · Reply · Guy
  Turn any tweet into high-engagement replies.
```

# ✨ X Reply Guy

**Reply Guy 涨粉神器** — 一个浏览器扩展，根据你在 X (Twitter) 上读到的帖子，用「Reply Guy 策略」一键生成高互动回复，帮你快速涨粉。

在别人帖子下留下**有价值、有钩子**的回复来吸引关注。这个插件把整个流程自动化：读推文 → 选风格 → 一键生成 → 填回输入框。

---

## ✨ 功能

- **自动抓取推文**：打开一条推文或回复框，插件自动识别正在看的帖子（支持时间线 / 详情页 / 回复弹窗）
- **10 种回复风格**：`Value` · `Question` · `Hot take` · `Witty` · `Relate` · `Data` · `Story` · `Pushback` · `Devout` · `Sincere`
- **流式生成**：SSE 边生成边显示，首字延迟低，支持推理模型（`hy3` / `flash v4` 等）
- **一键填入**：`Copy` 复制，或 `Fill` 直接写进 X 回复框并自动点亮 `Reply` 按钮
- **多模型兼容**：OpenAI / DeepSeek / Mimo / 任何 OpenAI 兼容端点（含 `opencode.ai/zen/go/v1` 中转）
- **自动降级**：端点不支持流式时自动回退非流式调用
- **右键快捷**：选中任意文字 → 右键 → `Reply to selection with Reply Guy`

---

## 🚀 安装（Comet / Chrome / 任何 Chromium 浏览器）

1. 克隆或下载本项目
2. 打开浏览器的扩展页（Comet/Chrome 输入 `chrome://extensions`）
3. 开启右上角 **开发者模式**
4. 点 **加载已解压的扩展程序**，选择本项目文件夹
5. 点击扩展图标 → **Options** 填入你的 API 配置

### 配置说明

| 字段 | 说明 | 示例 |
|------|------|------|
| **API Base** | OpenAI 兼容接口地址 | `https://api.openai.com/v1` |
| **API Key** | 你的密钥 | `sk-...` |
| **Model** | 模型名 | `gpt-4o-mini` / `deepseek-chat` / `mimo-v2.5` |

> 🔐 **隐私**：API Key 只存在本地浏览器 `chrome.storage.sync`，不会上传到任何服务器。

---

## 🧰 兼容模型建议

| 场景 | 推荐模型 | 说明 |
|------|---------|------|
| **最快涨粉 / 中文圈** | `mimo-v2.5` / `deepseek-chat` | 非推理，首字快，中文自然 |
| **英文大号** | `gpt-4o-mini` | 英文语感好 |
| **质量优先（较慢）** | `hy3` / `flash v4` | 推理模型，思考后出正文，稍慢 |

---

## 📂 项目结构

```
x-reply-guy/
├── manifest.json      # MV3 扩展清单
├── background.js      # LLM 调用（流式 + 降级）、右键菜单、风格库
├── content.js         # 页面注入：抓推文、注入 Reply Guy 按钮、填入回复框
├── content.css        # 浮层 / 按钮样式（黑白 editorial 风格）
├── popup.html         # 弹窗 UI
├── popup.js           # 弹窗逻辑：抓推文、流式生成、Copy / Fill
├── options.html       # 设置页 UI
├── options.js         # 设置页逻辑（保存 API 配置）
└── icon.png           # 扩展图标
```

---

## ⚙️ 工作流程

```
打开 X 帖子
   │
   ▼
自动抓取推文文本（content.js / popup.js）
   │
   ▼
选择回复风格（10 种）
   │
   ▼
background.js 流式调用 LLM（SSE，推理模型自动兼容）
   │
   ▼
弹出 3 条候选回复
   │
   ├─ Copy ──► 复制到剪贴板
   └─ Fill ───► execCommand 写入 X 回复框 + 点亮 Reply
```

---

## 🛡️ 隐私与安全

- 代码不含任何硬编码的密钥 / token（已审计）
- API Key 保存在本地浏览器存储，仅用于请求你的 API 端点
- 扩展只在 `x.com` / `twitter.com` 页面注入脚本

---

## 📄 License

MIT © [pepedesigner](https://github.com/pepedesigner)

*Made for the Reply Guy grind. 🚀*
```
