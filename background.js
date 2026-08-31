chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== "autoPush") return;

  processAutoPush(request.payload)
    .then(res => sendResponse({ status: "success", res }))
    .catch(err => sendResponse({ status: "error", message: err.message }));

  return true;
});

async function processAutoPush(data) {
  const { token, owner, repo } =
    await chrome.storage.local.get(["token", "owner", "repo"]);

  if (!token || !owner || !repo) {
    throw new Error("Missing GitHub configuration.");
  }

  if (!data?.folderName || !data?.code?.trim()) {
    throw new Error("Could not extract the problem or solution code.");
  }

  const filename = await resolveTargetFilename(token, owner, repo, data.folderName);
  const solutionPath = `${data.folderName}/${filename}`;
  const readmePath = `${data.folderName}/README.md`;

  await executeGitHubPut({
    token,
    owner,
    repo,
    filePath: solutionPath,
    content: data.code,
    commitMessage: `[LeetPush] Add ${filename} for ${data.title}`
  });

  const readmeExists = await checkFileExists(token, owner, repo, readmePath);
  if (!readmeExists) {
    const readmeContent =
      `# ${data.title}\n\n` +
      `## Difficulty: ${data.difficulty}\n\n` +
      `${data.description || "No description retrieved."}\n`;

    await executeGitHubPut({
      token,
      owner,
      repo,
      filePath: readmePath,
      content: readmeContent,
      commitMessage: `[LeetPush] Add README.md for ${data.title}`
    });
  }

  await incrementStatsCounter(data.difficulty);
  return `Pushed ${solutionPath} successfully.`;
}

async function resolveTargetFilename(token, owner, repo, folderName) {
  const basePath = `${folderName}/Solution.java`;

  if (!(await checkFileExists(token, owner, repo, basePath))) {
    return "Solution.java";
  }

  for (let version = 2; version <= 99; version++) {
    const filename = `Solution_v${version}.java`;
    const path = `${folderName}/${filename}`;

    if (!(await checkFileExists(token, owner, repo, path))) {
      return filename;
    }
  }

  return `Solution_${Date.now()}.java`;
}

function githubUrl(owner, repo, filePath) {
  const encodedPath = filePath
    .split("/")
    .map(part => encodeURIComponent(part))
    .join("/");

  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`;
}

function githubHeaders(token) {
  return {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

async function checkFileExists(token, owner, repo, filePath) {
  const response = await fetch(githubUrl(owner, repo, filePath), {
    method: "GET",
    headers: githubHeaders(token)
  });

  if (response.status === 404) return false;

  if (!response.ok) {
    const message = await readGitHubError(response);
    throw new Error(`GitHub check failed: ${message}`);
  }

  return true;
}

async function executeGitHubPut({
  token,
  owner,
  repo,
  filePath,
  content,
  commitMessage
}) {
  const url = githubUrl(owner, repo, filePath);
  let sha;

  const existingResponse = await fetch(url, {
    method: "GET",
    headers: githubHeaders(token)
  });

  if (existingResponse.ok) {
    const existing = await existingResponse.json();
    sha = existing.sha;
  } else if (existingResponse.status !== 404) {
    const message = await readGitHubError(existingResponse);
    throw new Error(`GitHub read failed: ${message}`);
  }

  const base64Content = uint8ArrayToBase64(
    new TextEncoder().encode(content)
  );

  const body = {
    message: commitMessage,
    content: base64Content
  };

  if (sha) body.sha = sha;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...githubHeaders(token),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await readGitHubError(response);
    throw new Error(`GitHub upload failed: ${message}`);
  }

  return response.json();
}

function uint8ArrayToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

async function readGitHubError(response) {
  try {
    const body = await response.json();
    return body.message || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

async function incrementStatsCounter(difficulty) {
  const keyMap = {
    Easy: "statsEasy",
    Medium: "statsMedium",
    Hard: "statsHard"
  };

  const key = keyMap[difficulty] || "statsEasy";
  const current = await chrome.storage.local.get(key);

  await chrome.storage.local.set({
    [key]: (current[key] || 0) + 1
  });
}
