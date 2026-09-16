// shared.js — constants & helpers shared by the service worker, content script,
// popup and options page. Loaded three ways:
//   - content script: listed before content.js in manifest.json
//   - service worker: importScripts("shared.js")
//   - popup.html / options.html: <script src="shared.js"></script>
// Keep it dependency-free and side-effect-free.

const RG = (() => {
  const DEFAULT_SYSTEM_PROMPT =
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
    "Output only the reply text itself, no quotes or explanation.";

  // Synced preferences. The API key is deliberately NOT here — it lives in
  // chrome.storage.local so it is never uploaded via account sync.
  const DEFAULTS = {
    apiBase: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    systemPrompt: DEFAULT_SYSTEM_PROMPT
  };

  // Reply strategies → instruction used to build the user prompt.
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

  function buildMessages(tweet, style, systemPrompt) {
    const styleDesc = STYLES[style] || STYLES.value;
    const userMsg =
      "Here is the tweet I want to reply to:\n---\n" +
      (tweet.author ? `Author @${tweet.author}\n` : "") +
      (tweet.context ? `Context: ${tweet.context}\n` : "") +
      `Text: ${tweet.text}\n---\n` +
      `Based on this tweet, using the 【${styleDesc}】 strategy, generate 3 distinct reply candidates ` +
      "with different angles. Number them 1. 2. 3. with a blank line between each.";
    return [
      { role: "system", content: systemPrompt || DEFAULT_SYSTEM_PROMPT },
      { role: "user", content: userMsg }
    ];
  }

  // Split a "1. ...\n\n2. ..." candidate block into individual replies.
  function parseReplies(text) {
    return (text || "")
      .split(/\n\s*\n/)
      .map((s) => s.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter(Boolean);
  }

  // Request body for an OpenAI-compatible /chat/completions call.
  // OpenAI's reasoning models (o-series / gpt-5) reject `max_tokens` and any
  // temperature other than the default, so branch on the model name.
  function buildRequestBody(model, messages, stream) {
    const reasoning = /^(o[1-9]|o\d|gpt-5)/i.test(model || "");
    const body = { model, messages };
    if (reasoning) {
      body.max_completion_tokens = 4096;
    } else {
      body.temperature = 0.85;
      body.max_tokens = 4096;
    }
    if (stream) body.stream = true;
    return body;
  }

  return { DEFAULTS, STYLES, buildMessages, parseReplies, buildRequestBody };
})();
