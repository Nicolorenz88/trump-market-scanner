# 🦅 Trump Market Scanner

Scansione quotidiana automatica di dichiarazioni di Trump su Truth Social, X e testate finanziarie. Estrazione ticker automatica via AI, analisi impatto portfolio personale.

**Stack:** HTML · Vercel Serverless Functions · Claude Sonnet 4 (web_search)  
**Deploy:** Vercel — zero configurazione locale, zero proxy, zero CORS issues

---

## Struttura

```
trump-scanner/
├── api/
│   ├── scan.js        ← Serverless function: chiama Claude con web_search
│   └── health.js      ← Health check endpoint
├── public/
│   └── index.html     ← Frontend completo (HTML/CSS/JS)
├── vercel.json        ← Routing config
├── package.json
└── README.md
```

---

## Deploy su Vercel (5 minuti)

### 1. Crea il repo su GitHub

```bash
git init
git add .
git commit -m "initial commit"
gh repo create trump-market-scanner --public --push
# oppure crea il repo su github.com e fai push manuale
```

### 2. Importa su Vercel

1. Vai su [vercel.com/new](https://vercel.com/new)
2. Clicca **"Import Git Repository"**
3. Seleziona `trump-market-scanner`
4. Clicca **Deploy** (lascia tutto di default)

### 3. Aggiungi la API key

1. Vai su **Settings → Environment Variables** del tuo progetto Vercel
2. Aggiungi:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-...` (la tua key da [console.anthropic.com](https://console.anthropic.com))
   - **Environment:** Production + Preview + Development
3. Clicca **Save**
4. Vai su **Deployments** → clicca **Redeploy** sull'ultimo deploy

### 4. Apri l'app

Vercel ti dà un URL tipo `trump-market-scanner.vercel.app` — aprilo nel browser e premi **⚡ SCANSIONA ORA**.

---

## Come funziona

```
Browser (index.html)
    ↓  POST /api/scan  { portfolio: ["TSLA","NVDA"] }
Vercel Serverless Function (api/scan.js)
    ↓  Anthropic SDK — claude-sonnet-4 + web_search tool
    ↓  Claude cerca notizie Trump + market news in tempo reale
    ↓  Estrae ticker, score, url degli articoli
    ↓  Restituisce JSON strutturato
Browser
    ↓  Renderizza alerts, news, analisi portfolio
```

Nessun CORS perché il frontend e le API sono sullo stesso dominio Vercel.  
Nessun proxy locale perché la API key è una env var server-side.

---

## Sviluppo locale

```bash
npm install -g vercel
npm install

# Crea .env.local con la tua key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local

# Avvia in locale (simula Vercel)
vercel dev
# → http://localhost:3000
```

---

## Costi stimati

| Voce | Costo |
|------|-------|
| Vercel Hobby (frontend + functions) | **Gratis** |
| Claude Sonnet 4 per scansione | ~$0.05–0.15 (web_search incluso) |
| 1 scansione/giorno × 30 giorni | ~**$1.50–4.50/mese** |

---

## Funzionalità

- **Alert tab** — notizie Trump con ticker estratti automaticamente, score 0-100, priorità HIGH/MEDIUM/LOW
- **Market News tab** — 5-7 notizie finanziarie significative del giorno con ticker e link agli articoli, ordinate dalla più recente
- **My Portfolio tab** — analisi impatto delle notizie Trump sui tuoi ticker specifici (positivo/negativo/neutro/watch)
- **Ticker leaderboard** — classifica dei titoli più citati nelle scansioni
- **Notifiche browser + audio** — alert immediati per notizie HIGH priority
- **Countdown** — timer alla prossima scansione automatica (1h / 6h / 24h configurabile)
- **Score threshold** — filtra alert per rilevanza minima (≥50 / ≥65 / ≥80)
