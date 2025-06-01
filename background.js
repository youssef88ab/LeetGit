// Background script for handling OAuth, GitHub API, and coordinating extension functionality

const BACKEND_URL = 'http://localhost:3000';
const GITHUB_API_BASE = 'https://api.github.com';

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background: Received message:', message);
    
    switch (message.action) {
        case 'initiateGithubAuth':
            handleGithubAuth().then(sendResponse).catch(error => {
                console.error('Auth error:', error);
                sendResponse({ success: false, error: error.message });
            });
            return true; // Keep message channel open for async response
            
        case 'pushSolution':
            handlePushSolution(message.data).then(sendResponse).catch(error => {
                console.error('Push solution error:', error);
                sendResponse({ success: false, error: error.message });
            });
            return true; // Keep message channel open for async response
            
        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }
});

// GitHub OAuth Authentication
async function handleGithubAuth() {
    try {
        console.log('Background: Starting GitHub OAuth flow');
        
        // Get OAuth client ID from manifest
        const manifest = chrome.runtime.getManifest();
        const clientId = manifest.oauth2.client_id;
        
        if (!clientId || clientId === 'YOUR_GITHUB_OAUTH_CLIENT_ID') {
            throw new Error('GitHub OAuth client ID not configured. Please update manifest.json');
        }
        
        // OAuth parameters
        const redirectUrl = chrome.identity.getRedirectURL();
        const scopes = manifest.oauth2.scopes.join(' ');
        const state = generateRandomState();
        
        // Build OAuth URL
        const authUrl = `https://github.com/login/oauth/authorize?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUrl)}&` +
            `scope=${encodeURIComponent(scopes)}&` +
            `state=${state}`;
        
        console.log('Background: Launching OAuth flow with URL:', authUrl);
        
        // Launch OAuth flow
        const responseUrl = await chrome.identity.launchWebAuthFlow({
            url: authUrl,
            interactive: true
        });
        
        console.log('Background: OAuth response URL:', responseUrl);
        
        // Parse response URL
        const url = new URL(responseUrl);
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');
        const error = url.searchParams.get('error');
        
        if (error) {
            throw new Error(`OAuth error: ${error}`);
        }
        
        if (!code) {
            throw new Error('No authorization code received');
        }
        
        if (returnedState !== state) {
            throw new Error('Invalid state parameter');
        }
        
        // Exchange code for access token via backend
        console.log('Background: Exchanging code for access token');
        const tokenData = await exchangeCodeForToken(code);
        
        // Get user information
        console.log('Background: Getting user information');
        const userData = await getGithubUser(tokenData.access_token);
        
        // Store token and user data
        await chrome.storage.sync.set({
            githubToken: tokenData.access_token,
            githubUser: userData
        });
        
        console.log('Background: GitHub authentication successful');
        
        // Notify popup about auth status change
        chrome.runtime.sendMessage({ action: 'authStatusChanged' });
        
        return { success: true, user: userData };
    } catch (error) {
        console.error('Background: GitHub auth error:', error);
        throw error;
    }
}

// Exchange OAuth code for access token via backend server
async function exchangeCodeForToken(code) {
    try {
        const response = await fetch(`${BACKEND_URL}/exchange_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Token exchange failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Background: Token exchange error:', error);
        throw new Error('Failed to exchange code for token. Make sure the backend server is running.');
    }
}

// Get GitHub user information
async function getGithubUser(accessToken) {
    try {
        const response = await fetch(`${GITHUB_API_BASE}/user`, {
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to get user information');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Background: Get user error:', error);
        throw error;
    }
}

// Handle pushing solution to GitHub
async function handlePushSolution(solutionData) {
    try {
        console.log('Background: Handling solution push:', solutionData);
        
        // Get stored GitHub token and repo URL
        const result = await chrome.storage.sync.get(['githubToken', 'repoUrl']);
        
        if (!result.githubToken) {
            throw new Error('Not authenticated with GitHub');
        }
        
        if (!result.repoUrl) {
            throw new Error('Repository URL not configured');
        }
        
        // Parse repository URL to get owner and repo
        const repoInfo = parseGithubUrl(result.repoUrl);
        if (!repoInfo) {
            throw new Error('Invalid GitHub repository URL');
        }
        
        // Create file content with metadata
        const fileContent = createSolutionFileContent(solutionData);
        
        // Generate filename
        const fileName = generateFileName(solutionData);
        
        console.log('Background: Pushing to repository:', repoInfo, 'File:', fileName);
        
        // Push to GitHub
        await pushToGithub(result.githubToken, repoInfo, fileName, fileContent, solutionData);
        
        // Notify popup about successful push
        chrome.runtime.sendMessage({
            action: 'solutionPushed',
            success: true,
            problemTitle: solutionData.title
        });
        
        return { success: true };
    } catch (error) {
        console.error('Background: Push solution error:', error);
        
        // Notify popup about failed push
        chrome.runtime.sendMessage({
            action: 'solutionPushed',
            success: false,
            error: error.message,
            problemTitle: solutionData.title
        });
        
        throw error;
    }
}

// Parse GitHub repository URL
function parseGithubUrl(url) {
    try {
        const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) return null;
        
        return {
            owner: match[1],
            repo: match[2].replace(/\.git$/, '') // Remove .git suffix if present
        };
    } catch (error) {
        console.error('Background: Error parsing GitHub URL:', error);
        return null;
    }
}

// Create solution file content with metadata
function createSolutionFileContent(solutionData) {
    const { title, code, language, difficulty, url, timestamp } = solutionData;
    
    // Create comment based on language
    const commentStart = getCommentStart(language);
    const commentEnd = getCommentEnd(language);
    
    const header = `${commentStart}
 * Problem: ${title}
 * Difficulty: ${difficulty}
 * Language: ${language}
 * Submitted: ${new Date(timestamp).toLocaleString()}
 * LeetCode URL: ${url}
 * 
 * Auto-generated by LeetCode GitHub Extension
 ${commentEnd}

`;
    
    return header + code;
}

// Get comment syntax based on language
function getCommentStart(language) {
    const lang = language.toLowerCase();
    if (lang.includes('python')) return '#';
    if (lang.includes('java') || lang.includes('javascript') || lang.includes('cpp') || lang.includes('c++')) return '/*';
    return '/*'; // Default
}

function getCommentEnd(language) {
    const lang = language.toLowerCase();
    if (lang.includes('python')) return '';
    if (lang.includes('java') || lang.includes('javascript') || lang.includes('cpp') || lang.includes('c++')) return ' */';
    return ' */'; // Default
}

// Generate filename for the solution
function generateFileName(solutionData) {
    const { title, language } = solutionData;
    
    // Clean title for filename
    let cleanTitle = title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    // Get file extension based on language
    const extension = getFileExtension(language);
    
    return `${cleanTitle}.${extension}`;
}

// Get file extension based on language
function getFileExtension(language) {
    const lang = language.toLowerCase();
    if (lang.includes('python')) return 'py';
    if (lang.includes('java')) return 'java';
    if (lang.includes('javascript')) return 'js';
    if (lang.includes('cpp') || lang.includes('c++')) return 'cpp';
    if (lang.includes('c')) return 'c';
    if (lang.includes('go')) return 'go';
    if (lang.includes('rust')) return 'rs';
    if (lang.includes('swift')) return 'swift';
    if (lang.includes('kotlin')) return 'kt';
    return 'txt'; // Default
}

// Push solution to GitHub repository
async function pushToGithub(accessToken, repoInfo, fileName, content, solutionData) {
    try {
        const { owner, repo } = repoInfo;
        const path = `solutions/${fileName}`;
        
        // Check if file already exists
        let sha = null;
        try {
            const existingFileResponse = await fetch(
                `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
                {
                    headers: {
                        'Authorization': `token ${accessToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            if (existingFileResponse.ok) {
                const existingFile = await existingFileResponse.json();
                sha = existingFile.sha;
                console.log('Background: File exists, will update with SHA:', sha);
            }
        } catch (error) {
            // File doesn't exist, which is fine for new solutions
            console.log('Background: File does not exist, will create new file');
        }
        
        // Prepare commit data
        const commitData = {
            message: `Add solution: ${solutionData.title}`,
            content: btoa(unescape(encodeURIComponent(content))), // Base64 encode
            branch: 'main' // You might want to make this configurable
        };
        
        if (sha) {
            commitData.sha = sha; // Required for updates
        }
        
        // Create or update file
        const response = await fetch(
            `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(commitData)
            }
        );
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Background: GitHub API error:', errorData);
            throw new Error(errorData.message || 'Failed to push to GitHub');
        }
        
        const result = await response.json();
        console.log('Background: Successfully pushed to GitHub:', result.content.html_url);
        
        return result;
    } catch (error) {
        console.error('Background: Push to GitHub error:', error);
        throw error;
    }
}

// Utility function to generate random state for OAuth
function generateRandomState() {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0].toString(16);
}

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Background: Extension started');
});

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Background: Extension installed/updated:', details.reason);
    
    if (details.reason === 'install') {
        // Open options page or show welcome message
        chrome.tabs.create({
            url: chrome.runtime.getURL('popup.html')
        });
    }
});