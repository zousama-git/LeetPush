document.addEventListener("DOMContentLoaded", async () => {
  const toggleInput = document.getElementById("extensionToggle");
  const toggleStateText = document.getElementById("toggleStateText");
  const statusDot = document.getElementById("statusDot");
  const tokenInput = document.getElementById("tokenInput");
  const ownerInput = document.getElementById("ownerInput");
  const repoInput = document.getElementById("repoInput");
  const toggleTokenBtn = document.getElementById("toggleTokenBtn");
  const statusMsg = document.getElementById("status-msg");

  const data = await chrome.storage.local.get(["isEnabled", "token", "owner", "repo", "statsEasy", "statsMedium", "statsHard"]);
  const isEnabled = data.isEnabled !== false;
  toggleInput.checked = isEnabled;
  updateToggleUI(isEnabled);

  if (data.token) tokenInput.value = data.token;
  if (data.owner) ownerInput.value = data.owner;
  if (data.repo) repoInput.value = data.repo;

  document.getElementById("countEasy").innerText = String(data.statsEasy || 0).padStart(2, '0');
  document.getElementById("countMedium").innerText = String(data.statsMedium || 0).padStart(2, '0');
  document.getElementById("countHard").innerText = String(data.statsHard || 0).padStart(2, '0');

  toggleInput.addEventListener("change", async () => {
    const enabled = toggleInput.checked;
    await chrome.storage.local.set({ isEnabled: enabled });
    updateToggleUI(enabled);
  });

  toggleTokenBtn.addEventListener("click", () => {
    const isPass = tokenInput.type === "password";
    tokenInput.type = isPass ? "text" : "password";
    toggleTokenBtn.innerText = isPass ? "hide" : "show";
  });

  document.getElementById("saveBtn").addEventListener("click", async () => {
    await chrome.storage.local.set({
      token: tokenInput.value.trim(),
      owner: ownerInput.value.trim(),
      repo: repoInput.value.trim()
    });
    statusMsg.style.color = "var(--green)";
    statusMsg.innerText = "CONFIGURATION SAVED";
    setTimeout(() => { statusMsg.innerText = ""; }, 3000);
  });

  function updateToggleUI(enabled) {
    toggleStateText.innerText = enabled ? "ON" : "OFF";
    if (enabled) statusDot.classList.add("active");
    else statusDot.classList.remove("active");
  }
});
