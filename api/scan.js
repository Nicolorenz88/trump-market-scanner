/**
 * /api/scan.js — Vercel Serverless Function
 *
 * Receives POST from the frontend with { prompt, portfolio }
 * Calls Anthropic API with web_search tool (server-side, no CORS issues)
 * Returns JSON with { alerts, news, portfolio, sourceCounts }
 *
 * Environment variable required in Vercel dashboard:
 *   ANTHROPIC_API_KEY = sk-ant-...
 */

import Anthropic from '@anthropic-ai/sdk';

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { portfolio = [], datetime: clientDatetime } = req.body || {};

    const now = new Date();
    const dateStr = now.toLocaleDateString('it-IT');
    const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const ptf = portfolio.length ? portfolio.join(', ') : 'no portfolio specified';

    const prompt = `You are a financial intelligence AI. Today is ${dateStr} at ${timeStr} (Italian time).

IMPORTANT: Do exactly 2 web searches total — no more. Be fast.
Search 1: "Trump market news ${dateStr}"
Search 2: "stock market news today ${dateStr}"

Return ONLY a JSON object, no markdown, no explanation:
{
  "alerts": [
    {
      "id": "a1",
      "source": "Reuters",
      "sourceIcon": "📰",
      "headline": "headline text",
      "tickers": ["NVDA"],
      "keywords": ["tariff"],
      "score": 88,
      "priority": "HIGH",
      "time": "${timeStr}",
      "datetime": "${now.toISOString().slice(0,19)}",
      "url": "",
      "rationale": "1-sentence explanation"
    }
  ],
  "news": [
    {
      "id": "n1",
      "source": "Bloomberg",
      "headline": "Market news headline",
      "snippet": "1 sentence summary",
      "tickers": ["NVDA"],
      "tag": "markets",
      "datetime": "${now.toISOString().slice(0,19)}",
      "url": "",
      "time": "${timeStr}"
    }
  ],
  "portfolio": [
    {
      "ticker": "NVDA",
      "impact": "positive",
      "headline": "Relevant headline",
      "reason": "1 sentence",
      "url": "",
      "time": "${timeStr}"
    }
  ],
  "sourceCounts": {"reuters":0,"ap":0,"cnbc":0,"politico":0,"guardian":0,"bloomberg":0,"wsj":0,"ft":0}
}

RULES:
- alerts: max 3, only Trump mentions of companies/assets. Tickers: real NYSE/NASDAQ or ETFs (ITA,XLE,XLF,SMH). Score 0-100, priority HIGH≥85/MEDIUM 65-84/LOW 50-64, omit below 50.
- news: max 3 market/financial items. tag: markets|politics|macro|trade.
- portfolio: analyze impact for: ${ptf}. impact: positive|negative|neutral|watch.`;

    const msg = await ai.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract final text block (after tool use cycles)
    const textBlock = (msg.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    if (!textBlock) {
      return res.status(500).json({ error: 'No text in Claude response' });
    }

    const clean = textBlock.replace(/```json|```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'No JSON found in response', raw: clean.slice(0, 300) });
    }

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);

  } catch (err) {
    console.error('[/api/scan] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
