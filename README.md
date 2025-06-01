# 🚀 LeetCode to GitHub Auto-Push Extension

Automatically push your LeetCode solutions to your GitHub repository! This Chrome extension monitors your LeetCode submissions and automatically commits successful solutions to your specified GitHub repository.

## ✨ Features

- **🔐 Secure GitHub OAuth**: Login with GitHub using OAuth 2.0
- **⚡ Auto-Detection**: Automatically detects successful LeetCode submissions
- **📝 Smart Formatting**: Adds problem metadata (difficulty, language, timestamp) to solutions
- **🗂️ Organized Storage**: Saves solutions in a dedicated `solutions/` folder
- **🎯 Multiple Language Support**: Works with Python, Java, JavaScript, C++, and more
- **⚙️ Easy Configuration**: Simple popup interface for setup

## 📋 Prerequisites

- Node.js (v14 or higher)
- Chrome browser
- GitHub account

## 🚀 Quick Start

### 1. Clone or Download the Extension

Download all the extension files to a folder on your computer.

### 2. Set Up GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: `LeetCode GitHub Extension`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `https://<EXTENSION_ID>.chromiumapp.org/` 
     (You'll need to update this after loading the extension)
4. Click "Register application"
5. Note down your **Client ID** and **Client Secret**

### 3. Configure the Extension

1. Open `manifest.json`
2. Replace `YOUR_GITHUB_OAUTH_CLIENT_ID` with your actual GitHub OAuth Client ID:
   ```json
   "oauth2": {
     "client_id": "your_actual_client_id_here",
     "scopes": ["repo", "user:email"]
   }
   ```

### 4. Set Up Backend Server

1. Create a `.env` file in the same directory as `server.js`:
   ```env
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   PORT=3000
   ```

2. Install dependencies:
   ```bash
   npm init -y
   npm install express cors node-fetch@2 dotenv
   ```

3. Start the server:
   ```bash
   node server.js
   ```

   You should see:
   ```
   🚀 LeetCode GitHub Extension Backend Server
   📡 Server running on http://localhost:3000
   ✅ Server ready to handle token exchanges
   ```

### 5. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the folder containing your extension files
5. Note the **Extension ID** (long string under the extension name)

### 6. Update OAuth Callback URL

1. Go back to your GitHub OAuth App settings
2. Update the **Authorization callback URL** to:
   ```
   https://YOUR_EXTENSION_ID.chromiumapp.org/
   ```
   (Replace `YOUR_EXTENSION_ID` with the actual ID from Chrome)

### 7. Create GitHub Repository

Create a GitHub repository where you want your solutions to be stored (e.g., `leetcode-solutions`).

## 🎯 How to Use

### 1. Configure the Extension

1. Click the extension icon in Chrome
2. Click "Login with GitHub" and authorize the extension
3. Enter your GitHub repository URL (e.g., `https://github.com/username/leetcode-solutions`)
4. Click "Save Repository"

### 2. Solve Problems on LeetCode

1. Go to [LeetCode](https://leetcode.com)
2. Solve any problem
3. Submit your solution
4. When the submission is successful, the extension will automatically:
   - Extract your solution code
   - Create/update a file in your GitHub repository
   - Add problem metadata as comments

### 3. Check Your Repository

Visit your GitHub repository to see your solutions automatically organized in the `solutions/` folder!

## 📁 Project Structure

```
leetcode-github-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
├── contentScript.js      # LeetCode page monitoring
├── background.js         # OAuth & GitHub API handling
├── server.js            # Backend token exchange server
├── .env                 # Environment variables (create this)
├── package.json         # Node.js dependencies (auto-generated)
└── README.md           # This file
```

## 🔧 Configuration Options

### Environment Variables (`.env`)

```env
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
PORT=3000
NODE_ENV=development
```

### Extension Storage

The extension stores the following in Chrome's sync storage:
- `githubToken`: OAuth access token
- `githubUser`: GitHub user information
- `repoUrl`: Target repository URL

## 🐛 Troubleshooting

### Common Issues

1. **"Login failed" Error**
   - Ensure your GitHub OAuth app is configured correctly
   - Check that the callback URL matches your extension ID
   - Verify the backend server is running

2. **"Repository not configured" Error**
   - Make sure you've entered a valid GitHub repository URL
   - Format: `https://github.com/username/repository-name`

3. **Solutions not being detected**
   - Make sure you're on leetcode.com (not cn.leetcode.com)
   - Try refreshing the page and resubmitting
   - Check browser console for error messages

4. **Backend server issues**
   - Ensure all dependencies are installed: `npm install`
   - Check that port 3000 is not in use by another application
   - Verify your `.env` file contains the correct credentials

### Debug Mode

To enable debug logging:
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Look for messages starting with "LeetCode GitHub Extension:"

## 🔒 Security & Privacy

- **OAuth 2.0**: Secure authentication with GitHub
- **No Password Storage**: Extension never sees your GitHub password
- **Minimal Permissions**: Only requests necessary GitHub scopes
- **Local Token Storage**: Access tokens stored locally in Chrome's sync storage
- **Backend Security**: Client secret kept secure on your server

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📜 License

MIT License - feel free to use and modify!

## 🙋 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Look at browser console for error messages
3. Ensure all setup steps were followed correctly
4. Verify your GitHub OAuth app configuration

## 🎉 Success!

Once everything is set up, you'll see your LeetCode solutions automatically appear in your GitHub repository with proper formatting and metadata. Happy coding! 🚀

---

**Made with ❤️ for the coding community**