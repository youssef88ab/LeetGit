// Content script for LeetCode pages
// Monitors for solution submissions and extracts problem data

console.log('LeetCode GitHub Extension: Content script loaded');

class LeetCodeMonitor {
    constructor() {
        this.isMonitoring = false;
        this.lastSubmissionTime = 0;
        this.submissionCooldown = 5000; // 5 seconds cooldown between submissions
        
        this.init();
    }
    
    init() {
        // Wait for page to fully load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.startMonitoring());
        } else {
            this.startMonitoring();
        }
    }
    
    startMonitoring() {
        console.log('LeetCode GitHub Extension: Starting to monitor for submissions');
        
        // Monitor for successful submissions using multiple methods
        this.monitorSubmissionButton();
        this.monitorSubmissionResults();
        this.monitorURLChanges();
        
        this.isMonitoring = true;
    }
    
    // Method 1: Monitor submission button clicks
    monitorSubmissionButton() {
        // Look for submit button and add click listener
        const checkForSubmitButton = () => {
            const submitButton = document.querySelector('button[data-e2e-locator="console-submit-button"]') ||
                                document.querySelector('button:contains("Submit")') ||
                                document.querySelector('[data-cy="submit-btn"]') ||
                                document.querySelector('button[type="submit"]');
            
            if (submitButton && submitButton.textContent.toLowerCase().includes('submit')) {
                submitButton.addEventListener('click', () => {
                    console.log('LeetCode GitHub Extension: Submit button clicked');
                    // Wait a bit for submission to process, then check for success
                    setTimeout(() => this.checkForSuccessfulSubmission(), 3000);
                });
            }
        };
        
        checkForSubmitButton();
        
        // Re-check periodically as LeetCode is a SPA
        setInterval(checkForSubmitButton, 2000);
    }
    
    // Method 2: Monitor for submission result elements
    monitorSubmissionResults() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check for success indicators
                        if (this.isSuccessElement(node)) {
                            console.log('LeetCode GitHub Extension: Success element detected');
                            this.handleSuccessfulSubmission();
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Method 3: Monitor URL changes for submission pages
    monitorURLChanges() {
        let currentUrl = window.location.href;
        
        const urlChangeHandler = () => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                
                // Check if we're on a submission result page
                if (currentUrl.includes('/submissions/') || currentUrl.includes('/submit/')) {
                    setTimeout(() => this.checkForSuccessfulSubmission(), 2000);
                }
            }
        };
        
        // Listen for navigation events
        window.addEventListener('popstate', urlChangeHandler);
        
        // Also check periodically
        setInterval(urlChangeHandler, 1000);
    }
    
    isSuccessElement(element) {
        const successIndicators = [
            'accepted',
            'success',
            'congratulations',
            'well done',
            'correct answer'
        ];
        
        const text = element.textContent?.toLowerCase() || '';
        const className = element.className?.toLowerCase() || '';
        
        return successIndicators.some(indicator => 
            text.includes(indicator) || className.includes(indicator)
        );
    }
    
    checkForSuccessfulSubmission() {
        // Prevent multiple rapid submissions
        const now = Date.now();
        if (now - this.lastSubmissionTime < this.submissionCooldown) {
            return;
        }
        
        // Look for success indicators
        const successSelectors = [
            '[data-e2e-locator="submission-result"]:contains("Accepted")',
            '.text-green-s', // LeetCode success color class
            '[class*="accepted"]',
            '[class*="success"]'
        ];
        
        let isSuccess = false;
        
        // Check each selector
        for (const selector of successSelectors) {
            const elements = document.querySelectorAll(selector.split(':')[0]);
            for (const element of elements) {
                const text = element.textContent?.toLowerCase() || '';
                if (text.includes('accepted') || text.includes('success')) {
                    isSuccess = true;
                    break;
                }
            }
            if (isSuccess) break;
        }
        
        // Also check for green checkmarks or success icons
        if (!isSuccess) {
            const successIcons = document.querySelectorAll('[class*="check"], [class*="success"], .text-green-s');
            for (const icon of successIcons) {
                if (icon.offsetParent !== null) { // Element is visible
                    isSuccess = true;
                    break;
                }
            }
        }
        
        if (isSuccess) {
            console.log('LeetCode GitHub Extension: Successful submission detected');
            this.handleSuccessfulSubmission();
        }
    }
    
    async handleSuccessfulSubmission() {
        this.lastSubmissionTime = Date.now();
        
        try {
            const problemData = await this.extractProblemData();
            
            if (problemData) {
                console.log('LeetCode GitHub Extension: Extracted problem data:', problemData);
                
                // Send to background script
                chrome.runtime.sendMessage({
                    action: 'pushSolution',
                    data: problemData
                });
            } else {
                console.warn('LeetCode GitHub Extension: Could not extract problem data');
            }
        } catch (error) {
            console.error('LeetCode GitHub Extension: Error handling submission:', error);
        }
    }
    
    async extractProblemData() {
        const data = {
            title: this.extractProblemTitle(),
            code: this.extractSolutionCode(),
            language: this.extractLanguage(),
            difficulty: this.extractDifficulty(),
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
        
        // Validate extracted data
        if (!data.title || !data.code) {
            console.warn('LeetCode GitHub Extension: Missing required data - title or code');
            return null;
        }
        
        return data;
    }
    
    extractProblemTitle() {
        // Try multiple selectors for problem title
        const titleSelectors = [
            '[data-e2e-locator="question-title"]',
            '.css-v3d350', // Common LeetCode title class
            'h1',
            '[class*="title"]',
            '.question-title'
        ];
        
        for (const selector of titleSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                return element.textContent.trim();
            }
        }
        
        // Fallback: extract from URL
        const match = window.location.pathname.match(/\/problems\/([^\/]+)/);
        if (match) {
            return match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        
        return null;
    }
    
    extractSolutionCode() {
        // Try to find the code editor
        const codeSelectors = [
            '.monaco-editor textarea',
            '.CodeMirror-code',
            '[class*="code-editor"] textarea',
            '[class*="editor"] textarea',
            'textarea[class*="code"]'
        ];
        
        for (const selector of codeSelectors) {
            const element = document.querySelector(selector);
            if (element && element.value) {
                return element.value;
            }
        }
        
        // Try to get code from Monaco editor (LeetCode's current editor)
        if (window.monaco && window.monaco.editor) {
            const editors = window.monaco.editor.getEditors();
            for (const editor of editors) {
                const code = editor.getValue();
                if (code && code.trim()) {
                    return code;
                }
            }
        }
        
        // Fallback: try to find code in pre or code tags
        const codeElements = document.querySelectorAll('pre, code, [class*="code"]');
        for (const element of codeElements) {
            const code = element.textContent || element.innerText;
            if (code && code.includes('class') || code.includes('def') || code.includes('function')) {
                return code;
            }
        }
        
        return null;
    }
    
    extractLanguage() {
        // Try to find language selector
        const langSelectors = [
            '[data-e2e-locator="console-lang-select"]',
            '[class*="lang"] button',
            '[class*="language"] button',
            'select[class*="lang"]'
        ];
        
        for (const selector of langSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const text = element.textContent || element.value;
                if (text) {
                    return text.toLowerCase();
                }
            }
        }
        
        // Try to detect from code syntax
        const code = this.extractSolutionCode();
        if (code) {
            if (code.includes('class Solution:') || code.includes('def ')) return 'python';
            if (code.includes('class Solution {') || code.includes('public ')) return 'java';
            if (code.includes('var ') || code.includes('function ') || code.includes('=>')) return 'javascript';
            if (code.includes('#include') || code.includes('int main')) return 'cpp';
        }
        
        return 'unknown';
    }
    
    extractDifficulty() {
        // Try to find difficulty indicator
        const difficultySelectors = [
            '[class*="difficulty"]',
            '[class*="easy"]',
            '[class*="medium"]',
            '[class*="hard"]'
        ];
        
        for (const selector of difficultySelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const text = element.textContent?.toLowerCase();
                if (text?.includes('easy')) return 'Easy';
                if (text?.includes('medium')) return 'Medium';
                if (text?.includes('hard')) return 'Hard';
            }
        }
        
        return 'Unknown';
    }
}

// Initialize the monitor
const leetcodeMonitor = new LeetCodeMonitor();

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'checkStatus') {
        sendResponse({ 
            isMonitoring: leetcodeMonitor.isMonitoring,
            url: window.location.href 
        });
    }
});