(function () {
  let isProcessing = false;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const resultNode = node.querySelector('[data-e2e-locator="submission-result"]') || node;
          if (resultNode.innerText && resultNode.innerText.includes("Accepted")) {
            handleSubmissionSuccess();
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  async function handleSubmissionSuccess() {
    if (isProcessing) return;
    isProcessing = true;

    const { isEnabled } = await chrome.storage.local.get("isEnabled");
    if (isEnabled === false) { isProcessing = false; return; }

    setTimeout(async () => {
      const payload = extractProblemData();
      if (payload) { chrome.runtime.sendMessage({ action: "autoPush", payload }); }
      setTimeout(() => { isProcessing = false; }, 6000);
    }, 800);
  }

  function extractProblemData() {
    try {
      const titleEl = document.querySelector('div[class*="text-title-large"]') || document.querySelector('a[class*="text-label-1"]');
      const titleText = titleEl ? titleEl.innerText.trim() : "000. Unknown";

      const match = titleText.match(/^(\d+)\.\s*(.*)$/);
      let folderName = "000-unknown";
      if (match) {
        folderName = `${match[1].padStart(3, '0')}-${match[2].toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`;
      } else {
        folderName = titleText.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      }

      let difficulty = "Easy";
      const diffEl = document.querySelector('div[class*="text-difficulty-"]');
      if (diffEl) {
        const text = diffEl.innerText.trim().toLowerCase();
        if (text.includes("medium")) difficulty = "Medium";
        else if (text.includes("hard")) difficulty = "Hard";
      }

      const descEl = document.querySelector('div[data-track-load="description_content"]');
      const description = descEl ? descEl.innerText.trim() : "No description retrieved.";

      const codeLines = Array.from(document.querySelectorAll('.monaco-editor .view-line'))
        .map(line => line.innerText.replace(/\ua0/g, ' '))
        .join('\n');

      return { title: titleText, folderName, difficulty, description, code: codeLines };
    } catch (err) { return null; }
  }
})();
