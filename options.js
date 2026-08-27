// options.js
const DEFAULTS = {
  apiBase: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
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

async function load() {
  const c = await chrome.storage.sync.get(DEFAULTS);
  document.getElementById("apiBase").value = c.apiBase;
  document.getElementById("apiKey").value = c.apiKey;
  document.getElementById("model").value = c.model;
  document.getElementById("systemPrompt").value = c.systemPrompt;
}

document.getElementById("save").onclick = async () => {
  await chrome.storage.sync.set({
    apiBase: document.getElementById("apiBase").value.trim(),
    apiKey: document.getElementById("apiKey").value.trim(),
    model: document.getElementById("model").value.trim(),
    systemPrompt: document.getElementById("systemPrompt").value.trim()
  });
  const s = document.getElementById("status");
  s.textContent = "Saved ✓";
  setTimeout(() => (s.textContent = ""), 2000);
};

load();
