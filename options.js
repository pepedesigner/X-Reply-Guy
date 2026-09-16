// options.js
const $ = (id) => document.getElementById(id);

// 从 API Base 推导需要授权的 match pattern（match pattern 不支持端口）
function originPattern(apiBase) {
  try {
    const u = new URL(apiBase);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return `${u.protocol}//${u.hostname}/*`;
  } catch {
    return "";
  }
}

async function load() {
  const [sync, local] = await Promise.all([
    chrome.storage.sync.get(RG.DEFAULTS),
    chrome.storage.local.get({ apiKey: "" })
  ]);
  $("apiBase").value = sync.apiBase;
  $("apiKey").value = local.apiKey;
  $("model").value = sync.model;
  $("systemPrompt").value = sync.systemPrompt;
}

$("save").onclick = async () => {
  const apiBase = $("apiBase").value.trim();
  const origin = originPattern(apiBase);
  let granted = true;
  if (origin) {
    // 必须紧跟用户点击同步发起，否则会被判定为缺少用户手势。
    try {
      granted = await chrome.permissions.request({ origins: [origin] });
    } catch {
      granted = false;
    }
  } else {
    granted = !apiBase;
  }
  await Promise.all([
    chrome.storage.sync.set({
      apiBase,
      model: $("model").value.trim(),
      systemPrompt: $("systemPrompt").value.trim()
    }),
    // 密钥只存本地，绝不进入会随账号同步上传的 storage.sync。
    chrome.storage.local.set({ apiKey: $("apiKey").value.trim() })
  ]);
  const s = $("status");
  s.textContent = granted ? "Saved ✓" : "Saved — API host access not granted";
  setTimeout(() => (s.textContent = ""), 2500);
};

load();
