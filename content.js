(() => {
  let isProcessing = false;
  let lastHandledSubmission = "";
  let lastAcceptedAt = 0;

  function containsAcceptedText(node) {
    if (!node) return false;

    const text = node.nodeType === Node.TEXT_NODE
      ? node.textContent
      : node.innerText || node.textContent || "";

    return /\bAccepted\b/i.test(text);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData" && containsAcceptedText(mutation.target)) {
        handleSubmissionSuccess();
        return;
      }

      for (const node of mutation.addedNodes) {
        if (containsAcceptedText(node)) {
          handleSubmissionSuccess();
          return;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
          const resultNode = node.querySelector(
            '[data-e2e-locator="submission-result"]'
          );

          if (containsAcceptedText(resultNode)) {
            handleSubmissionSuccess();
            return;
          }
        }
      }
    }
  });

  function startObserver() {
    if (!document.body) {
      requestAnimationFrame(startObserver);
      return;
    }

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  startObserver();

  async function handleSubmissionSuccess() {
    const now = Date.now();

    // LeetCode can mutate the same result several times.
    if (isProcessing || now - lastAcceptedAt < 5000) return;

    const { isEnabled } = await chrome.storage.local.get("isEnabled");
    if (isEnabled === false) return;

    isProcessing = true;
    lastAcceptedAt = now;

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const payload = extractProblemData();
      if (!payload) {
        throw new Error("Could not extract the LeetCode solution.");
      }

      const response = await chrome.runtime.sendMessage({
        action: "autoPush",
        payload
      });

      if (response?.status === "error") {
        console.error("[LeetPush]", response.message);
      } else {
        console.info("[LeetPush]", response?.res || "Pushed successfully.");
      }
    } catch (error) {
      console.error("[LeetPush]", error);
    } finally {
      setTimeout(() => {
        isProcessing = false;
      }, 1000);
    }
  }

  function slugify(text) {
    return text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function extractProblemData() {
    try {
      const titleEl =
        document.querySelector('div[class*="text-title-large"]') ||
        document.querySelector('a[class*="text-label-1"]');

      const titleText = titleEl
        ? titleEl.innerText.trim()
        : "000. Unknown";

      const match = titleText.match(/^(\d+)\.\s*(.*)$/);
      const number = match ? match[1].padStart(3, "0") : "000";
      const name = match ? match[2] : titleText.replace(/^\d+\.\s*/, "");

      const folderName = `${number}-${slugify(name) || "unknown"}`;

      let difficulty = "Easy";
      const diffEl = document.querySelector('div[class*="text-difficulty-"]');

      if (diffEl) {
        const text = diffEl.innerText.trim().toLowerCase();

        if (text.includes("hard")) difficulty = "Hard";
        else if (text.includes("medium")) difficulty = "Medium";
      }

      const descEl =
        document.querySelector('[data-track-load="description_content"]');

      const description = descEl
        ? descEl.innerText.trim()
        : "No description retrieved.";

      const codeLines = Array.from(
        document.querySelectorAll(".monaco-editor .view-line")
      )
        .map(line => line.innerText.replace(/\u00a0/g, " "))
        .join("\n")
        .trim();

      if (!codeLines) {
        console.warn("[LeetPush] No code found in Monaco editor.");
        return null;
      }

      return {
        title: titleText,
        folderName,
        difficulty,
        description,
        code: codeLines
      };
    } catch (error) {
      console.error("[LeetPush] Extraction failed:", error);
      return null;
    }
  }
})();
