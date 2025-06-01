// DOM elements
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authStatus = document.getElementById('authStatus');
const authStatusDot = document.getElementById('authStatusDot');
const userInfo = document.getElementById('userInfo');
const authError = document.getElementById('authError');

const repoUrl = document.getElementById('repoUrl');
const saveRepoBtn = document.getElementById('saveRepoBtn');
const repoStatus = document.getElementById('repoStatus');
const repoStatusDot = document.getElementById('repoStatusDot');
const repoError = document.getElementById('repoError');
const repoSuccess = document.getElementById('repoSuccess');

const extensionStatus = document.getElementById('extensionStatus');

// Initialize popup
document.addEventListener('DOMContentLoaded', initializePopup);

async function initializePopup() {
    try {
        // Check authentication status
        await checkAuthStatus();
        
        // Load repository configuration
        await loadRepoConfig();
        
        // Update overall status
        updateExtensionStatus();
    } catch (error) {
        console.error('Error initializing popup:', error);
    }
}

// Authentication functions
async function checkAuthStatus() {
    try {
        const result = await chrome.storage.sync.get(['githubToken', 'githubUser']);
        
        if (result.githubToken && result.githubUser) {
            showAuthenticatedState(result.githubUser);
        } else {
            showUnauthenticatedState();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        showError(authError, 'Error checking authentication status');
    }
}

function showAuthenticatedState(user) {
    authStatus.textContent = 'Connected';
    authStatusDot.className = 'status-dot connected';
    userInfo.textContent = `Logged in as: ${user.login}`;
    userInfo.classList.remove('hidden');
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    hideError(authError);
}

function showUnauthenticatedState() {
    authStatus.textContent = 'Not connected';
    authStatusDot.className = 'status-dot disconnected';
    userInfo.classList.add('hidden');
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
}

// Repository configuration functions
async function loadRepoConfig() {
    try {
        const result = await chrome.storage.sync.get(['repoUrl']);
        
        if (result.repoUrl) {
            repoUrl.value = result.repoUrl;
            showRepoConfigured();
        } else {
            showRepoNotConfigured();
        }
    } catch (error) {
        console.error('Error loading repo config:', error);
        showError(repoError, 'Error loading repository configuration');
    }
}

function showRepoConfigured() {
    repoStatus.textContent = 'Configured';
    repoStatusDot.className = 'status-dot connected';
}

function showRepoNotConfigured() {
    repoStatus.textContent = 'Not configured';
    repoStatusDot.className = 'status-dot disconnected';
}

// Event listeners
loginBtn.addEventListener('click', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
saveRepoBtn.addEventListener('click', handleSaveRepo);

async function handleLogin() {
    try {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        hideError(authError);
        
        // Send message to background script to initiate OAuth flow
        const response = await chrome.runtime.sendMessage({
            action: 'initiateGithubAuth'
        });
        
        if (response.success) {
            await checkAuthStatus();
            showSuccess(authError, 'Successfully logged in to GitHub!');
        } else {
            throw new Error(response.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError(authError, error.message || 'Login failed. Please try again.');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login with GitHub';
    }
}

async function handleLogout() {
    try {
        // Clear stored data
        await chrome.storage.sync.remove(['githubToken', 'githubUser']);
        
        // Update UI
        showUnauthenticatedState();
        updateExtensionStatus();
        
        showSuccess(authError, 'Successfully logged out');
        setTimeout(() => hideError(authError), 2000);
    } catch (error) {
        console.error('Logout error:', error);
        showError(authError, 'Error logging out. Please try again.');
    }
}

async function handleSaveRepo() {
    try {
        const url = repoUrl.value.trim();
        
        if (!url) {
            showError(repoError, 'Please enter a repository URL');
            return;
        }
        
        // Validate GitHub URL format
        const githubRepoRegex = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/;
        if (!githubRepoRegex.test(url)) {
            showError(repoError, 'Please enter a valid GitHub repository URL (e.g., https://github.com/username/repo)');
            return;
        }
        
        saveRepoBtn.disabled = true;
        saveRepoBtn.textContent = 'Saving...';
        hideError(repoError);
        hideSuccess(repoSuccess);
        
        // Save to storage
        await chrome.storage.sync.set({ repoUrl: url });
        
        // Update UI
        showRepoConfigured();
        updateExtensionStatus();
        showSuccess(repoSuccess, 'Repository saved successfully!');
        
        setTimeout(() => hideSuccess(repoSuccess), 2000);
    } catch (error) {
        console.error('Save repo error:', error);
        showError(repoError, 'Error saving repository. Please try again.');
    } finally {
        saveRepoBtn.disabled = false;
        saveRepoBtn.textContent = 'Save Repository';
    }
}

// Utility functions
function updateExtensionStatus() {
    chrome.storage.sync.get(['githubToken', 'repoUrl'], (result) => {
        if (result.githubToken && result.repoUrl) {
            extensionStatus.innerHTML = '✅ <strong>Ready!</strong> Extension is fully configured and monitoring LeetCode.';
        } else if (result.githubToken) {
            extensionStatus.innerHTML = '⚠️ <strong>Almost ready!</strong> Please configure your repository URL.';
        } else {
            extensionStatus.innerHTML = '❌ <strong>Setup required.</strong> Please login with GitHub and configure repository.';
        }
    });
}

function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
    element.classList.add('error');
    element.classList.remove('success');
}

function hideError(element) {
    element.classList.add('hidden');
}

function showSuccess(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
    element.classList.add('success');
    element.classList.remove('error');
}

function hideSuccess(element) {
    element.classList.add('hidden');
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'authStatusChanged') {
        checkAuthStatus();
    } else if (message.action === 'solutionPushed') {
        if (message.success) {
            extensionStatus.innerHTML = `✅ <strong>Success!</strong> Solution "${message.problemTitle}" pushed to GitHub!`;
        } else {
            extensionStatus.innerHTML = `❌ <strong>Error:</strong> Failed to push "${message.problemTitle}" - ${message.error}`;
        }
        
        // Reset status after 5 seconds
        setTimeout(updateExtensionStatus, 5000);
    }
});