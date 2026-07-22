chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "pushFile") {
    executeGitHubPut(request.payload)
      .then(data => sendResponse({ status: "success", data }))
      .catch(err => sendResponse({ status: "error", message: err.message }));
    return true;
  }
});

async function executeGitHubPut({ token, owner, repo, filePath, content, commitMessage }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const bytes = new TextEncoder().encode(content);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const base64Content = btoa(binary);

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message: commitMessage, content: base64Content })
  });
  return await response.json();
}
