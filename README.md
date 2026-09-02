# LeetPush

A Chrome extension that automatically syncs your LeetCode accepted solutions to a GitHub repository with version control and tracking.

## Features

### Automated
- **Real-time Detection**: Uses `MutationObserver` to automatically detect successful LeetCode submissions
- **Multi-Solution Versioning**: Automatically handles file collisions with version suffixes (`Solution.java`, `Solution_v2.java`, etc.)
- **Problem Difficulty Tracking**: Stores counters for Easy, Medium, and Hard problem completions

### Terminal UI Theme
- Dark/light terminal aesthetic with active state toggles
- Clean, minimalist design for focused workflow

## Installation

### Installation
1. Download and unzip the source code
2. Open browser (Edge, Chrome or any) and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the extension directory

## Configuration

1. Click the extension icon in your Chrome toolbar
2. Enter your GitHub Personal Access Token (needs `repo` scope):
    1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
    2. Generate a new token with `repo` permissions
    3. Copy the token and paste it into the extension settings
3. Enter the remaining details
4. Click "Save Settings"


## Usage

### Auto-Sync Workflow
1. Navigate to LeetCode and solve a problem
2. Submit your solution
3. The extension automatically:
   - Detects successful submission
   - Creates a file in your GitHub repo with the solution
   - Tracks completion statistics
   - Versions files if conflicts exist


## Permissions

The extension requires the following permissions:
- `storage`: For local metrics and settings
- `activeTab`: For accessing the current LeetCode tab
- `scripting`: For DOM manipulation and injection
- Host permissions for:
  - LeetCode API endpoints (`https://leetcode.com/*`)
  - GitHub API endpoints (`https://api.github.com/*`)

## Security & Privacy
### Your GitHub Token Is Private

- Your Personal Access Token (PAT) is stored exclusively in your browser's local storage (chrome.storage.local).
- The extension author has no ability to see, read, or collect your token. All API requests are sent directly from your browser to https://api.github.com/*.

## Troubleshooting

### Common Issues

**"No permission to access GitHub API"**
- Verify your GitHub token has `repo` scope
- Re-generate token if necessary

**"Sync Failed"**
- Check internet connection
- Verify repository name format (username/repo-name)
- Ensure repository exists and you have write access