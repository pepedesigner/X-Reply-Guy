// background.js — service worker
// 职责：调用 LLM（支持流式）、管理右键菜单、接收 content script 请求

const DEFAULT_CONFIG = {
  apiBase: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
  // 涨粉核心：系统提示里固化 Reply Guy 策略（英文指令，回复语言跟随原推文）
  systemPrompt:
    "You are a master 'Reply Guy' on X (Twitter) who grows a following fast. " +
    "Your goal is to leave high-engagement, high-value replies under other people's posts to attract followers. " +
    "Great replies have these traits: " +
    "1) Never open with empty praise like 'Great post!' or 'Nice!'. " +
    "2) Add real incremental value: a unique angle, a statistic, personal experience, or a counterintuitive insight. " +
    "3) Most replies end with an open question or hook that invites the author to keep the conversation going. " +
    "4) Use line breaks and short sentences so it reads well on mobile. " +
    "5) Be sincere, not sycophantic, and never pedantic or confrontational. " +
    "6) Keep it tight: usually 1-3 sentences or a very short paragraph. " +
    "Respond in the SAME language as the tweet you are replying to. " +
    "Output only the reply text itself, no quotes or explanation."
};

async function getConfig() {
  const c = await chrome.storage.sync.get(DEFAULT_CONFIG);
  return { ...DEFAULT_CONFIG, ...c };
}

// 归一化 API Base：去掉结尾斜杠，避免拼出 //chat/completions
function apiUrl(cfg) {
  const base = (cfg.apiBase || "").replace(/\/+$/, "");
  return `${base}/chat/completions`;
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

// 风格库：被回复策略 + 说明，用于构造用户提示
const STYLES = {
  value: "Value-add: give a unique angle / a stat / your own experience, end with an open question",
  question: "Question: ask one thoughtful, insightful question that shows you're really thinking",
  hot: "Hot take: a mild but counterintuitive angle that sparks discussion and retweets",
  witty: "Witty: a smart, tasteful joke or analogy that boosts likeability",
  agree: "Relate: share a brief personal experience that echoes the point, then ask a follow-up",
  data: "Data point: bring a relevant fact or number that strengthens the post",
  story: "Mini-story: a 2-3 sentence personal anecdote that makes the reply memorable",
  contrarian: "Respectful pushback: gently disagree with one nuance and explain why",
  devout: "Devout: reverent, faith-filled tone — echo the prayer with gratitude, blessing and hope",
  sincere: "Sincere: heartfelt, vulnerable and authentic — speak from the heart to build real connection"
};

function buildMessages(tweet, style) {
  const styleDesc = STYLES[style] || STYLES.value;
  const userMsg =
    "Here is the tweet I want to reply to:\n---\n" +
    (tweet.author ? `Author @${tweet.author}\n` : "") +
    (tweet.context ? `Context: ${tweet.context}\n` : "") +
    `Text: ${tweet.text}\n---\n` +
    `Based on this tweet, using the 【${styleDesc}】 strategy, generate 3 distinct reply candidates ` +
    "with different angles. Number them 1. 2. 3. with a blank line between each.";
  return [
    { role: "system", content: DEFAULT_CONFIG.systemPrompt },
    { role: "user", content: userMsg }
  ];
}

async function callLLM(messages) {
  const cfg = await getConfig();
  if (!cfg.apiKey) {
    throw new Error("API Key not configured. Open the extension Options page to set it.");
  }
  const res = await fetch(apiUrl(cfg), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`
    },
    body: JSON.stringify({ model: cfg.model, messages, temperature: 0.85, max_tokens: 4096 })
  });
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
    const res = await fetch(apiUrl(cfg), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: 0.85,
        max_tokens: 4096,
        stream: true
      })
    });
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
    // 超时兜底：20s 内无有效内容则中断流式，避免一直 Generating…
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; try { reader.cancel(); } catch {} }, 20000);
    while (true) {
      if (timedOut) break;
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      rawFull += chunk;
      buf += chunk;
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) ingest(line);
      if (full) {
        // 一旦拿到正文，取消超时
        clearTimeout(timer);
      }
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
          body: JSON.stringify({ model: c2.model, messages, temperature: 0.85, max_tokens: 4096 })
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
  return callLLM(buildMessages(tweet, style));
}

// 右键菜单：对选中文字作为推文正文生成回复
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "replyGuySelection",
    title: "Reply to selection with Reply Guy",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "replyGuySelection" && info.selectionText) {
    try {
      const replies = await generateReplies({ text: info.selectionText.trim() }, "value");
      await chrome.storage.session.set({
        lastReplies: replies,
        lastTweet: info.selectionText.trim()
      });
    } catch (e) {
      await chrome.storage.session.set({ lastError: e.message });
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
  port.onMessage.addListener(async (msg) => {
    if (msg.type !== "start") return;
    await callLLMStream(
      buildMessages(msg.tweet, msg.style),
      (delta) => port.postMessage({ type: "delta", delta }),
      (full, raw) => port.postMessage({ type: "done", replies: full, raw }),
      (err) => port.postMessage({ type: "error", error: err.message })
    );
  });
});
