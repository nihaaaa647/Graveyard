# GRAVEYARD
**Cross-Domain Failure Intelligence System**

[![Status: Early Access](https://img.shields.io/badge/Status-Early_Access-red.svg?style=flat-square)](#) 
[![Stack: Next.js 14](https://img.shields.io/badge/Stack-Next.js_14-black.svg?style=flat-square)](#)

> Every field relearns the same lessons. Graveyard indexes failure so you don't have to repeat it.

Graveyard is an open-source research instrument designed to extract, synthesize, and categorize structural failure mechanisms across disparate professional domains. Instead of presenting surface-level symptoms, Graveyard acts as a failure intelligence engine—deploying neural search and 120B parameter large language models to uncover the abstracted patterns and broken assumptions behind why complex systems crash, businesses fold, and technologies fail.

---

## 🏛 The Architecture

Graveyard operates entirely within the Next.js `App Router`, operating a dual-pronged retrieval pipeline optimized for speed and analytical depth.

1. **Retrieval**: 
    - The engine simultaneously hits an **Upstash Redis** index mapping exact query similarity against previously ingested failure events.
    - In parallel, it dispatches a neural web query via the **Exa AI API** to crawl live unstructured diagnostics, post-mortems, and incident reports.
2. **Synthesis (Streaming)**:
    - Results are merged and fed into OpenRouter (`nvidia/nemotron-3-super-120b-a12b:free`) to synthesize a **Taxonomy Card** in real-time.
    - The UI acts as a stream consumer, assembling the mechanisms, cross-domain translations, and uncomfortable truths into an editorial taxonomy as bytes arrive.
3. **Database Accretion**:
    - After the real-time stream closes, the engine triggers a deferred background job. It re-evaluates raw Exa results, securely extracting high-confidence novel failures, and writes them back into Redis—meaning the system grows structurally smarter with every query.

## 🛠 Tech Stack

* **Framework:** Next.js 14 (App Router)
* **Design:** React, Custom CSS Tokens, WorldQuant/Foundry Editorial Aesthetic
* **Live Search:** Exa AI (Neural Web Search)
* **Inference Engine:** OpenRouter (Nemotron-3 Super 120B)
* **Storage/Index:** Upstash Redis (Serverless)

---

## 🚀 Setup & Deployment

### 1. Prerequisites
You need Node.js `^18.17.0` and API keys for Exa, OpenRouter, and Upstash Redis.

### 2. Installation
Clone the repository and install the dependencies:
\`\`\`bash
git clone https://github.com/your-username/graveyard.git
cd graveyard
npm install
\`\`\`

### 3. Environment Configuration
Create a \`.env.local\` file in the root directory: \
\`\`\`env \
EXA_API_KEY=your_exa_key \
OPENROUTER_API_KEY=your_openrouter_key \
UPSTASH_REDIS_REST_URL=your_upstash_url \
UPSTASH_REDIS_REST_TOKEN=your_upstash_token 
\`\`\`

### 4. Database Seeding
Initialize your Upstash Redis database with the baseline 10 high-confidence historical failures (e.g., Air France 447, Theranos, Healthcare.gov).
\`\`\`bash
npm run seed
\`\`\`

### 5. Running the Engine
Start your local development server:
\`\`\`bash
npm run dev
\`\`\`
Visit \`http://localhost:3000\` to access the terminal.

---
