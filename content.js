// content.js — 在 X 页面中抓取推文并注入 "Reply Guy" 按钮

function getTweetText(root) {
  const el = root.querySelector('[data-testid="tweetText"]');
  return el ? el.innerText.trim() : "";
}

function getAuthor(root) {
  // 从 User-Name 区域取 @handle
  const userName = root.querySelector('[data-testid="User-Name"]');
  const scope = userName || root;
  const link = scope.querySelector('a[href^="/"]');
  if (link) {
    const href = link.getAttribute("href") || "";
    const m = href.match(/^\/([^/\?]+)/);
    if (m) return m[1];
  }
  return "";
}

// 选离视口中心最近的、含正文的那条推文（用于时间线 / 详情页）
function pickCenteredTweet() {
  const articles = Array.from(document.querySelectorAll("article")).filter(
    (a) => getTweetText(a)
  );
  if (articles.length === 0) return null;
  const mid = window.innerHeight / 2;
  let best = null;
  let bestDist = Infinity;
  for (const a of articles) {
    const r = a.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) continue;
    const center = r.top + r.height / 2;
    const dist = Math.abs(center - mid);
    if (dist < bestDist) {
      bestDist = dist;
      best = a;
    }
  }
  // 兜底：没在视口内就取第一条
  if (!best) best = articles[0];
  return { text: getTweetText(best), author: getAuthor(best) };
}

// 找到当前要回复 / 正在看的推文
function findTargetTweet() {
  // 1) 回复框模式：抓被回复的原推文（不含 composer 的那条 article）
  const composer = document.querySelector('[data-testid="tweetTextarea_0"]');
  if (composer) {
    const articles = Array.from(document.querySelectorAll("article")).filter(
      (a) => getTweetText(a)
    );
    let target = articles.find((a) => !a.contains(composer));
    if (!target) target = articles[0];
    if (target) return { text: getTweetText(target), author: getAuthor(target) };
  }
  // 2) 普通浏览：抓视口中心的那条推文
  return pickCenteredTweet();
}

let _filling = false;
function buildBlocks(text) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split("\n")
    .map(
      (line) =>
        `<div data-block="true"><div data-offset-key="reply-0-0"><span data-text="true">${
          esc(line) || "<br>"
        }</span></div></div>`
    )
    .join("");
}
function fillComposerEl(el, text) {
  if (_filling) return;
  _filling = true;
  setTimeout(() => { _filling = false; }, 700);
  el.focus();
  const expNorm = text.replace(/\s+/g, " ").trim();
  try {
    document.execCommand("selectAll", false, null);
    document.execCommand("insertText", false, text);
    const curNorm = (el.innerText || "").replace(/\s+/g, " ").trim();
    if (curNorm.includes(expNorm.slice(0, 30)) && curNorm.length >= expNorm.length * 0.9) return;
  } catch {}
  // Fallback: write proper Draft.js block structure (correct line-height, no overlap)
  el.innerHTML = buildBlocks(text);
  el.dispatchEvent(new InputEvent("input", { bubbles: true, data: text, inputType: "insertText" }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function injectButton() {
  if (document.getElementById("reply-guy-btn")) return;
  const composer = document.querySelector('[data-testid="tweetTextarea_0"]');
  if (!composer) return;
  // Prefer the toolbar near this composer; fall back to composer wrapper
  let toolbar =
    composer.closest("div")?.parentElement?.querySelector('[data-testid="toolBar"]') ||
    document.querySelector('[data-testid="toolBar"]') ||
    composer.parentElement;
  if (!toolbar) return;

  const btn = document.createElement("button");
  btn.id = "reply-guy-btn";
  btn.textContent = "✨ Reply Guy";
  btn.type = "button";
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openPanel(composer);
  });
  // Make toolbar able to show the button without clipping
  toolbar.style.overflow = "visible";
  toolbar.style.height = "auto";
  toolbar.style.minHeight = "40px";
  toolbar.style.alignItems = "center";
  let p = toolbar.parentElement;
  for (let i = 0; i < 3 && p; i++) {
    p.style.overflow = "visible";
    p.style.maxHeight = "none";
    p = p.parentElement;
  }
  // Insert to the left of the Reply button so it stays on one line
  const replyBtn = toolbar.querySelector('[data-testid="tweetButton"]');
  if (replyBtn) {
    const wrap = replyBtn.closest("div");
    // The Reply button is usually in a right-aligned container; insert before it
    (wrap?.parentElement || toolbar).insertBefore(btn, wrap || replyBtn);
    btn.style.marginRight = "8px";
  } else {
    toolbar.appendChild(btn);
    btn.style.marginLeft = "8px";
  }
}

function openPanel(composer) {
  // 简单浮层展示候选回复
  let panel = document.getElementById("reply-guy-panel");
  if (panel) {
    panel.remove();
    return;
  }
  const tweet = findTargetTweet();
  if (!tweet || !tweet.text) {
    alert("Couldn't find a tweet to reply to. Make sure you're on a reply box.");
    return;
  }

  panel = document.createElement("div");
  panel.id = "reply-guy-panel";
  panel.innerHTML = `
    <div class="rg-head">
      <strong>Reply Guy</strong>
      <span class="rg-close" id="rg-close">×</span>
    </div>
    <div class="rg-styles">
      <button data-s="value">💡 Value</button>
      <button data-s="question">❓ Question</button>
      <button data-s="hot">🔥 Hot take</button>
      <button data-s="witty">😏 Witty</button>
      <button data-s="agree">🤝 Relate</button>
      <button data-s="data">📊 Data</button>
      <button data-s="story">📖 Story</button>
      <button data-s="contrarian">⚡ Pushback</button>
      <button data-s="devout">🙏 Devout</button>
      <button data-s="sincere">💛 Sincere</button>
    </div>
    <div class="rg-out" id="rg-out">Pick a style to generate replies…</div>
  `;
  document.body.appendChild(panel);
  document.getElementById("rg-close").onclick = () => panel.remove();

  panel.querySelectorAll(".rg-styles button").forEach((b) => {
    b.onclick = async () => {
      const out = document.getElementById("rg-out");
      out.textContent = "Generating…";
      let res;
      try {
        res = await chrome.runtime.sendMessage({
          type: "generate",
          tweet,
          style: b.dataset.s
        });
      } catch (e) {
        out.textContent = "Error: " + (e?.message || "extension context unavailable");
        return;
      }
      if (!res || !res.ok) {
        out.textContent = "Error: " + ((res && res.error) || "no response from background");
        return;
      }
      out.innerHTML = "";
      RG.parseReplies(res.replies).forEach((r) => {
        const item = document.createElement("div");
        item.className = "rg-item";
        item.textContent = r;
        item.title = "Click to fill the reply box";
        item.onclick = () => {
          const cur = document.querySelector('[data-testid="tweetTextarea_0"]') || composer;
          fillComposerEl(cur, r);
          navigator.clipboard?.writeText(r);
          panel.remove();
        };
        out.appendChild(item);
      });
    };
  });
}

// 监听页面变化，持续注入按钮。X 的 DOM 变动极其频繁，用 rAF 合并到每帧最多一次。
let _injectQueued = false;
const obs = new MutationObserver(() => {
  if (_injectQueued) return;
  _injectQueued = true;
  requestAnimationFrame(() => {
    _injectQueued = false;
    injectButton();
  });
});
obs.observe(document.body, { childList: true, subtree: true });
injectButton();
