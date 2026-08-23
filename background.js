chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "autoPush") {
    processAutoPush(request.payload)
      .then(res => sendResponse({ status: "success", res }))
      .catch(err => sendResponse({ status: "error", message: err.message }));
    return true;
  }
});

async function processAutoPush(data) {
  const { token, owner, repo } = await chrome.storage.local.get(["token", "owner", "repo"]);
  if (!token || !owner || !repo) throw new Error("Missing configuration.");

  const filename = await resolveTargetFilename(token, owner, repo, data.folderName);
  const solutionPath = `${data.folderName}/${filename}`;
  const readmePath = `${data.folderName}/README.md`;

  await executeGitHubPut({
    token, owner, repo,
    filePath: solutionPath,
    content: data.code,
    commitMessage: `[LeetPush] Add ${filename} for ${data.title}`
  });

  const readmeExists = await checkFileExists(token, owner, repo, readmePath);
  if (!readmeExists) {
    const readmeContent = `# ${data.title}\n\n## Difficulty: ${data.difficulty}\n\n${data.description}\n`;
    await executeGitHubPut({
      token, owner, repo,
      filePath: readmePath,
      content: readmeContent,
      commitMessage: `[LeetPush] Add README.md for ${data.title}`
    });
  }

  await incrementStatsCounter(data.difficulty);
  return "Pushed successfully.";
}

async function resolveTargetFilename(token, owner, repo, folderName) {
  const basePath = `${folderName}/Solution.java`;
  const exists = await checkFileExists(token, owner, repo, basePath);
  if (!exists) return "Solution.java";

  let version = 2;
  while (version < 50) {
    const vPath = `${folderName}/Solution_v${version}.java`;
    const vExists = await checkFileExists(token, owner, repo, vPath);
    if (!vExists) return `Solution_v${version}.java`;
    version++;
  }
  return `Solution_${Date.now()}.java`;
}

async function checkFileExists(token, owner, repo, filePath) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  try {
    const res = await fetch(url, { method: "GET", headers: { "Authorization": `Bearer ${token}`, "Accept": "application/vnd.github+json" } });
    return res.status === 200;
  } catch (e) { return false; }
}

async function executeGitHubPut({ token, owner, repo, filePath, content, commitMessage }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  let sha = null;
  try {
    const res = await fetch(url, { method: "GET", headers: { "Authorization": `Bearer ${token}`, "Accept": "application/vnd.github+json" } });
    if (res.ok) { const body = await res.json(); sha = body.sha; }
  } catch (e) {}

  const bytes = new TextEncoder().encode(content);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const base64Content = btoa(binary);

  const response = await fetch(url, {
    method: "PUT",
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify({ message: commitMessage, content: base64Content, ...(sha && { sha }) })
  });
  return await response.json();
}

async function incrementStatsCounter(difficulty) {
  const keyMap = { "Easy": "statsEasy", "Medium": "statsMedium", "Hard": "statsHard" };
  const key = keyMap[difficulty] || "statsEasy";
  const curr = await chrome.storage.local.get(key);
  await chrome.storage.local.set({ [key]: (curr[key] || 0) + 1 });
}
