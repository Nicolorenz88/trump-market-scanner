import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// We need process.env.ANTHROPIC_API_KEY
if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('your-anthropic-api-key-here')) {
  console.warn('\x1b[33m%s\x1b[0m', '⚠️ Warning: ANTHROPIC_API_KEY is not configured or still has the default placeholder in .env.local.');
  console.warn('\x1b[33m%s\x1b[0m', 'The application will fallback to simulated demo data when scanning. Update .env.local to run real scans.');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Serve static files from 'public' directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// Import Vercel API handlers
import scanHandler from './api/scan.js';
import healthHandler from './api/health.js';

// Route handlers compatible with Vercel serverless signature (req, res)
app.all('/api/scan', async (req, res) => {
  try {
    await scanHandler(req, res);
  } catch (err) {
    console.error('Error in scan handler:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

app.all('/api/health', async (req, res) => {
  try {
    await healthHandler(req, res);
  } catch (err) {
    console.error('Error in health handler:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// For any other routes, serve index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('\x1b[36m%s\x1b[0m', `🚀 Trump Market Scanner is running locally!`);
  console.log(`🔗 Frontend URL: http://localhost:${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🛠️ Mode: Local Express Simulation`);
});
