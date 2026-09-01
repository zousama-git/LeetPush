document.addEventListener("DOMContentLoaded", async () => {
  const toggleInput = document.getElementById("extensionToggle");
  const toggleStateText = document.getElementById("toggleStateText");
  const statusDot = document.getElementById("statusDot");
  const tokenInput = document.getElementById("tokenInput");
  const ownerInput = document.getElementById("ownerInput");
  const repoInput = document.getElementById("repoInput");
  const toggleTokenBtn = document.getElementById("toggleTokenBtn");
  const saveBtn = document.getElementById("saveBtn");
  const statusMsg = document.getElementById("status-msg");

  try {
    const data = await chrome.storage.local.get([
      "isEnabled", "token", "owner", "repo",
      "statsEasy", "statsMedium", "statsHard"
    ]);

    const isEnabled = data.isEnabled !== false;
    toggleInput.checked = isEnabled;
    updateToggleUI(isEnabled);

    tokenInput.value = data.token || "";
    ownerInput.value = data.owner || "";
    repoInput.value = data.repo || "";

    updateStats(data);
  } catch (error) {
    showStatus(`LOAD FAILED: ${error.message}`, "var(--red)");
  }

  toggleInput.addEventListener("change", async () => {
    const enabled = toggleInput.checked;

    try {
      await chrome.storage.local.set({ isEnabled: enabled });
      updateToggleUI(enabled);
    } catch (error) {
      toggleInput.checked = !enabled;
      showStatus(`TOGGLE FAILED: ${error.message}`, "var(--red)");
    }
  });

  toggleTokenBtn.addEventListener("click", toggleTokenVisibility);
  toggleTokenBtn.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleTokenVisibility();
    }
  });

  saveBtn.addEventListener("click", async () => {
    const token = tokenInput.value.trim();
    const owner = ownerInput.value.trim();
    const repo = repoInput.value.trim();

    if (!token || !owner || !repo) {
      showStatus("TOKEN, USERNAME AND REPOSITORY ARE REQUIRED", "var(--red)");
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "SAVING...";

    try {
      await chrome.storage.local.set({ token, owner, repo });
      showStatus("CONFIGURATION SAVED", "var(--green)");
    } catch (error) {
      showStatus(`SAVE FAILED: ${error.message}`, "var(--red)");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "SAVE CONFIGURATION";
    }
  });

  function toggleTokenVisibility() {
    const isPassword = tokenInput.type === "password";
    tokenInput.type = isPassword ? "text" : "password";
    toggleTokenBtn.textContent = isPassword ? "hide" : "show";
  }

  function updateToggleUI(enabled) {
    toggleStateText.textContent = enabled ? "ON" : "OFF";
    statusDot.classList.toggle("active", enabled);
  }

  function updateStats(data) {
    document.getElementById("countEasy").textContent =
      String(data.statsEasy || 0).padStart(2, "0");
    document.getElementById("countMedium").textContent =
      String(data.statsMedium || 0).padStart(2, "0");
    document.getElementById("countHard").textContent =
      String(data.statsHard || 0).padStart(2, "0");
  }

  function showStatus(message, color) {
    statusMsg.textContent = message;
    statusMsg.style.color = color;

    clearTimeout(showStatus.timeout);
    showStatus.timeout = setTimeout(() => {
      statusMsg.textContent = "";
    }, 3500);
  }
});
