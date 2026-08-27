// popup.js
let currentTweet = null;

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

function parseReplies(text) {
  return text
    .split(/\n\s*\n/)
    .map((s) => s.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter(Boolean);
}

async function getCurrentTweet() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/x\.com|twitter\.com/.test(tab.url)) return null;
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractTweet
    });
    return res && res.result ? res.result : null;
  } catch (e) {
    console.error("extract failed:", e);
    return null;
  }
}

// Runs in the page context; must not reference outer scope.
function extractTweet() {
  function getTweetText(root) {
    const el = root.querySelector('[data-testid="tweetText"]');
    return el ? el.innerText.trim() : "";
  }
  function getAuthor(root) {
    const un = root.querySelector('[data-testid="User-Name"]') || root;
    const link = un.querySelector('a[href^="/"]');
    if (link) {
      const h = link.getAttribute("href") || "";
      const m = h.match(/^\/([^/\?]+)/);
      if (m) return m[1];
    }
    return "";
  }
  const composer = document.querySelector('[data-testid="tweetTextarea_0"]');
  const articles = Array.from(document.querySelectorAll("article")).filter(
    (a) => getTweetText(a)
  );
  if (composer) {
    const target = articles.find((a) => !a.contains(composer)) || articles[0];
    if (target) return { text: getTweetText(target), author: getAuthor(target) };
  }
  if (articles.length) {
    const mid = window.innerHeight / 2;
    let best = null;
    let bd = Infinity;
    for (const a of articles) {
      const r = a.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      const c = r.top + r.height / 2;
      const d = Math.abs(c - mid);
      if (d < bd) {
        bd = d;
        best = a;
      }
    }
    if (!best) best = articles[0];
    return { text: getTweetText(best), author: getAuthor(best) };
  }
  return null;
}

document.getElementById("opt").onclick = (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
};

async function render() {
  currentTweet = await getCurrentTweet();
  const t = document.getElementById("tweet");
  const manualWrap = document.getElementById("manualWrap");
  if (!currentTweet) {
    t.textContent =
      "Couldn't auto-detect a tweet. Paste it manually, or open a tweet / reply box on X and try again.";
    manualWrap.style.display = "block";
    return;
  }
  manualWrap.style.display = "none";
  t.textContent =
    (currentTweet.author ? "@" + currentTweet.author + "\n" : "") + currentTweet.text;
}

document.getElementById("useManual").onclick = () => {
  const v = document.getElementById("manual").value.trim();
  if (!v) return;
  currentTweet = { text: v, author: "" };
  document.getElementById("tweet").textContent = v;
  document.getElementById("manualWrap").style.display = "none";
};

function renderItem(r, out) {
  const item = document.createElement("div");
  item.className = "item";

  const text = document.createElement("div");
  text.className = "item-text";
  text.textContent = r;
  item.appendChild(text);

  const actions = document.createElement("div");
  actions.className = "item-actions";

  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy";
  copyBtn.onclick = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(r);
    copyBtn.textContent = "Copied";
    setTimeout(() => (copyBtn.textContent = "Copy"), 800);
  };

  const fillBtn = document.createElement("button");
  fillBtn.textContent = "↪ Fill";
  fillBtn.onclick = async (e) => {
    e.stopPropagation();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: fillComposer,
        args: [r]
      });
      if (res && res.result) {
        fillBtn.textContent = "Filled";
        setTimeout(() => (fillBtn.textContent = "↪ Fill"), 1000);
      } else {
        fillBtn.textContent = "No box";
        setTimeout(() => (fillBtn.textContent = "↪ Fill"), 1000);
      }
    } catch {
      fillBtn.textContent = "Err";
      setTimeout(() => (fillBtn.textContent = "↪ Fill"), 1000);
    }
  };

  actions.appendChild(copyBtn);
  actions.appendChild(fillBtn);
  item.appendChild(actions);
  out.appendChild(item);
}

// Runs in the page context; fills the X reply composer and enables the Reply button.
function fillComposer(text) {
  const el = document.querySelector('[data-testid="tweetTextarea_0"]');
  if (!el) return false;
  el.focus();
  const expNorm = text.replace(/\s+/g, " ").trim();
  try {
    document.execCommand("selectAll", false, null);
    document.execCommand("insertText", false, text);
    const curNorm = (el.innerText || "").replace(/\s+/g, " ").trim();
    if (curNorm.includes(expNorm.slice(0, 30)) && curNorm.length >= expNorm.length * 0.9) return true;
  } catch {}
  // Fallback: proper Draft.js block structure
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  el.innerHTML = text
    .split("\n")
    .map((line) => `<div data-block="true"><div data-offset-key="reply-0-0"><span data-text="true">${esc(line) || "<br>"}</span></div></div>`)
    .join("");
  el.dispatchEvent(new InputEvent("input", { bubbles: true, data: text, inputType: "insertText" }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

document.querySelectorAll(".styles button").forEach((b) => {
  b.onclick = () => {
    const out = document.getElementById("out");
    if (!currentTweet) {
      out.innerHTML = '<span class="hint">Open a tweet first.</span>';
      return;
    }
    out.innerHTML = '<span class="hint">Generating…</span>';
    const raw = { text: "" };
    const port = chrome.runtime.connect({ name: "generate" });
    port.onMessage.addListener((m) => {
      if (m.type === "delta") {
        raw.text += m.delta;
        out.innerHTML = '<div class="stream">' + escapeHtml(raw.text) + "</div>";
      } else if (m.type === "done") {
        if (!m.replies || !m.replies.trim()) {
          out.innerHTML =
            '<span class="hint">No reply returned. Check the model/API in Options, or try again.</span>';
          if (m.raw) {
            const d = document.createElement("details");
            d.className = "hint";
            d.innerHTML =
              "<summary>Raw API response (debug)</summary><pre style='white-space:pre-wrap;max-height:220px;overflow:auto'>" +
              escapeHtml(m.raw.slice(0, 1500)) +
              "</pre>";
            out.appendChild(d);
          }
          port.disconnect();
          return;
        }
        out.innerHTML = "";
        parseReplies(m.replies).forEach((r) => renderItem(r, out));
        port.disconnect();
      } else if (m.type === "error") {
        let msg = '<span class="hint">Error: ' + escapeHtml(m.error) + "</span>";
        if (/failed to fetch/i.test(m.error)) {
          msg +=
            "<br><span class='hint'>Likely a network/API issue: check the API Base and Key in Options, or whether this endpoint is reachable.</span>";
        }
        out.innerHTML = msg;
        port.disconnect();
      }
    });
    port.postMessage({ type: "start", tweet: currentTweet, style: b.dataset.s });
  };
});

render();
