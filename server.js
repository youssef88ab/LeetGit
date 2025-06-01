// Backend server for handling GitHub OAuth token exchange
// This server keeps the client secret secure and exchanges OAuth codes for access tokens

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // You may need to install: npm install node-fetch@2
require('dotenv').config(); // For environment variables

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*', // In production, specify your extension's origin
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Environment variables validation
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    console.error('❌ Missing required environment variables:');
    console.error('   GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set');
    console.error('   Create a .env file with these variables');
    process.exit(1);
}

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'LeetCode GitHub Extension Backend Server',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// OAuth token exchange endpoint
app.post('/exchange_token', async (req, res) => {
    try {
        console.log('📨 Token exchange request received');
        
        const { code } = req.body;
        
        if (!code) {
            console.log('❌ No authorization code provided');
            return res.status(400).json({
                error: 'Authorization code is required'
            });
        }
        
        console.log('🔄 Exchanging code for access token...');
        
        // Exchange code for access token with GitHub
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'LeetCode-GitHub-Extension'
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code: code
            })
        });
        
        if (!tokenResponse.ok) {
            console.error('❌ GitHub token exchange failed:', tokenResponse.status, tokenResponse.statusText);
            return res.status(500).json({
                error: 'Failed to exchange code for token'
            });
        }
        
        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
            console.error('❌ GitHub OAuth error:', tokenData);
            return res.status(400).json({
                error: tokenData.error_description || tokenData.error
            });
        }
        
        if (!tokenData.access_token) {
            console.error('❌ No access token in response:', tokenData);
            return res.status(500).json({
                error: 'No access token received from GitHub'
            });
        }
        
        console.log('✅ Token exchange successful');
        
        // Return the access token to the extension
        res.json({
            access_token: tokenData.access_token,
            token_type: tokenData.token_type || 'bearer',
            scope: tokenData.scope
        });
        
    } catch (error) {
        console.error('❌ Token exchange error:', error);
        res.status(500).json({
            error: 'Internal server error during token exchange'
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error);
    res.status(500).json({
        error: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 LeetCode GitHub Extension Backend Server');
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑 GitHub Client ID: ${GITHUB_CLIENT_ID}`);
    console.log('✅ Server ready to handle token exchanges');
    console.log('');
    console.log('📋 Available endpoints:');
    console.log(`   GET  http://localhost:${PORT}/       - Server status`);
    console.log(`   GET  http://localhost:${PORT}/health - Health check`);
    console.log(`   POST http://localhost:${PORT}/exchange_token - OAuth token exchange`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});