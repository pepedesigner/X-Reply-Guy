// background.js — service worker
// 职责：调用 LLM（支持流式）、管理右键菜单、接收 content script 请求
importScripts("shared.js");

// 读取配置：偏好走 storage.sync，API Key 单独存 storage.local（避免账户同步上传密钥）
async function getConfig() {
  const [sync, local] = await Promise.all([
    chrome.storage.sync.get(RG.DEFAULTS),
    chrome.storage.local.get({ apiKey: "" })
  ]);
  return {
    apiBase: sync.apiBase || RG.DEFAULTS.apiBase,
    model: sync.model || RG.DEFAULTS.model,
    systemPrompt: sync.systemPrompt || RG.DEFAULTS.systemPrompt,
    apiKey: local.apiKey || ""
  };
}

// 归一化 API Base：去掉结尾斜杠，避免拼出 //chat/completions
function apiUrl(cfg) {
  const base = (cfg.apiBase || "").replace(/\/+$/, "");
  return `${base}/chat/completions`;
}

// 网络层失败时给出可操作的提示（常见于缺少该 host 的访问授权）
function netError(cfg, err) {
  return new Error(
    `Couldn't reach ${cfg.apiBase} (${err.message}). ` +
      "Check the API Base in Options, then re-save Options to grant the extension access to that host."
  );
}

// 从不同 schema 里尽力取出回复正文；最后才考虑 reasoning_content（推理模型）
function extractContent(json) {
  const c = json && json.choices && json.choices[0];
  if (c) {
    if (typeof c.message?.content === "string" && c.message.content.trim()) return c.message.content;
    if (typeof c.text === "string" && c.text.trim()) return c.text;
    if (typeof c.delta?.content === "string" && c.delta.content) return c.delta.content;
    if (typeof c.message?.reasoning_content === "string" && c.message.reasoning_content.trim()) return c.message.reasoning_content;
    if (typeof c.delta?.reasoning_content === "string" && c.delta.reasoning_content) return c.delta.reasoning_content;
  }
  if (typeof json?.content === "string" && json.content.trim()) return json.content;
  if (typeof json?.output === "string" && json.output.trim()) return json.output;
  if (typeof json?.response === "string" && json.response.trim()) return json.response;
  if (typeof json?.reasoning_content === "string" && json.reasoning_content.trim()) return json.reasoning_content;
  return "";
}

async function callLLM(messages) {
  const cfg = await getConfig();
  if (!cfg.apiKey) {
    throw new Error("API Key not configured. Open the extension Options page to set it.");
  }
  let res;
  try {
    res = await fetch(apiUrl(cfg), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify(RG.buildRequestBody(cfg.model, messages, false))
    });
  } catch (e) {
    throw netError(cfg, e);
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`API error ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return extractContent(data).trim() || "";
}

// 流式版本：通过 onDelta 逐步回传，降低首字延迟
// 若端点不支持 SSE 流式，自动降级为非流式调用，避免“无输出”。
async function callLLMStream(messages, onDelta, onDone, onError) {
  const cfg = await getConfig();
  if (!cfg.apiKey) {
    onError(new Error("API Key not configured. Open the extension Options page to set it."));
    return;
  }
  try {
    let res;
    try {
      res = await fetch(apiUrl(cfg), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.apiKey}`
        },
        body: JSON.stringify(RG.buildRequestBody(cfg.model, messages, true))
      });
    } catch (e) {
      throw netError(cfg, e);
    }
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`API error ${res.status}: ${t.slice(0, 200)}`);
    }
    // 端点不支持流（无 body 流）时直接按普通 JSON 处理
    if (!res.body || !res.body.getReader) {
      const data = await res.json();
      const content = extractContent(data).trim();
      onDone(content, JSON.stringify(data).slice(0, 1500));
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let rawFull = "";
    let full = "";
    let thinkingNotified = false;
    const ingest = (s) => {
      s = s.trim();
      if (!s.startsWith("data:")) return;
      const data = s.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data);
        const c = json.choices?.[0]?.delta || json.choices?.[0]?.message || json.choices?.[0];
        if (!c) return;
        const content = (typeof c.content === "string" && c.content) || (typeof c.text === "string" && c.text) || "";
        const reasoning = (typeof c.reasoning_content === "string" && c.reasoning_content) || (typeof c.reasoning === "string" && c.reasoning) || "";
        if (content) {
          full += content;
          onDelta(content);
        } else if (reasoning) {
          if (!thinkingNotified) {
            thinkingNotified = true;
            onDelta("Thinking… ");
          }
        } else {
          // 兜底：用 extractContent 试一下其他字段
          const other = extractContent(json);
          if (other) { full += other; onDelta(other); }
        }
      } catch {
        // 忽略不完整分片
      }
    };
    // 卡死超时：只要还在持续收到数据就重置计时，避免误杀“思考很久才出正文”的推理模型。
    let timer = null;
    const armTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { try { reader.cancel(); } catch {} }, 30000);
    };
    armTimer();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      armTimer();
      const chunk = decoder.decode(value, { stream: true });
      rawFull += chunk;
      buf += chunk;
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) ingest(line);
    }
    clearTimeout(timer);
    ingest(buf); // 处理末尾可能无换行结尾的分片
    // 若流式未解析出任何内容（端点返回了普通 JSON），尝试整体解析
    if (!full) {
      try {
        full = extractContent(JSON.parse(rawFull));
      } catch {
        // 保持空
      }
    }
    if (full) {
      onDone(full.trim(), rawFull);
    } else {
      // 最后兜底：非流式再试一次；仍为空则把原始响应回传用于排查
      let fallbackText = "";
      let fallbackRaw = "";
      try {
        const c2 = await getConfig();
        const r2 = await fetch(apiUrl(c2), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${c2.apiKey}` },
          body: JSON.stringify(RG.buildRequestBody(c2.model, messages, false))
        });
        fallbackRaw = (await r2.text()).slice(0, 2000);
        try { fallbackText = extractContent(JSON.parse(fallbackRaw)).trim(); } catch { fallbackText = ""; }
      } catch (e2) { fallbackRaw = `fallback fetch failed: ${e2.message}`; }
      if (fallbackText) {
        onDone(fallbackText, rawFull);
      } else {
        const diag = [`model=${cfg.model}`, `base=${cfg.apiBase}`, `streamRawLen=${rawFull.length}`, `streamRaw=${rawFull.slice(0, 800)}`, `fallbackRaw=${fallbackRaw.slice(0, 800)}`].join("\n");
        onDone("", diag);
      }
    }
  } catch (e) {
    // 流式失败（如端点拒绝 stream 参数）时降级为非流式
    try {
      const text = await callLLM(messages);
      if (text) {
        onDone(text, "");
        return;
      }
    } catch {
      // 忽略，抛出原始错误
    }
    onError(e);
  }
}

async function generateReplies(tweet, style) {
  const cfg = await getConfig();
  return callLLM(RG.buildMessages(tweet, style, cfg.systemPrompt));
}

function installContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "replyGuySelection",
      title: "Reply to selection with Reply Guy",
      contexts: ["selection"]
    });
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  installContextMenu();
  // 迁移：早期版本把 API Key 存在 storage.sync（会随账号上传），改为仅存本地。
  const [sync, local] = await Promise.all([
    chrome.storage.sync.get({ apiKey: "" }),
    chrome.storage.local.get({ apiKey: "" })
  ]);
  if (sync.apiKey) {
    if (!local.apiKey) await chrome.storage.local.set({ apiKey: sync.apiKey });
    await chrome.storage.sync.remove("apiKey");
  }
});

// 右键菜单：对选中文字作为推文正文生成回复
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "replyGuySelection" && info.selectionText) {
    try {
      const replies = await generateReplies({ text: info.selectionText.trim() }, "value");
      await chrome.storage.session.set({
        lastReplies: replies,
        lastTweet: info.selectionText.trim(),
        lastError: ""
      });
    } catch (e) {
      await chrome.storage.session.set({ lastError: e.message, lastReplies: "", lastTweet: info.selectionText.trim() });
    }
  }
});

// 非流式：供 content script 浮层使用
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "generate") {
    generateReplies(msg.tweet, msg.style)
      .then((r) => sendResponse({ ok: true, replies: r }))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
});

// 流式：供 popup 使用（长连接，逐块回传）
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "generate") return;
  // popup 可能在生成过程中关闭，向已断开的端口 postMessage 会抛异常，统一吞掉。
  const post = (m) => { try { port.postMessage(m); } catch {} };
  port.onMessage.addListener(async (msg) => {
    if (msg.type !== "start") return;
    const cfg = await getConfig();
    await callLLMStream(
      RG.buildMessages(msg.tweet, msg.style, cfg.systemPrompt),
      (delta) => post({ type: "delta", delta }),
      (full, raw) => post({ type: "done", replies: full, raw }),
      (err) => post({ type: "error", error: err.message })
    );
  });
});
