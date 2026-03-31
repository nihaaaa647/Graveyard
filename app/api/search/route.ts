import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import Exa from 'exa-js';
import { SEEDED_FAILURES, Failure } from '@/lib/failures';

const EXA_KEY = process.env.EXA_API_KEY;
const OR_KEY = process.env.OPENROUTER_API_KEY;
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = (REDIS_URL && REDIS_TOKEN) ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;
const exa = EXA_KEY ? new Exa(EXA_KEY) : null;

// Next.js config for streaming
export const maxDuration = 60; // Allow sufficient time for the connection
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // 1 & 2. Parallelize Redis Fetch+Score and Exa Search
    const [redisData, exaData] = await Promise.all([
      (async () => {
        let allFailures: Failure[] = [];
        let usingLocalFallback = false;
        
        if (redis) {
          try {
            const ids = await redis.smembers("failure:ids");
            if (ids && ids.length > 0) {
              const pipeline = redis.pipeline();
              ids.forEach(id => pipeline.hgetall(`failure:${id}`));
              const results = await pipeline.exec();
              allFailures = results.filter(f => f && (f as Record<string, unknown>).id) as unknown as Failure[];
            } else {
              allFailures = [...SEEDED_FAILURES];
            }
          } catch (e) {
            console.error("Redis read error:", e);
            allFailures = [...SEEDED_FAILURES];
            usingLocalFallback = true;
          }
        } else {
          allFailures = [...SEEDED_FAILURES];
          usingLocalFallback = true;
        }

        if (allFailures.length === 0) allFailures = [...SEEDED_FAILURES];

        if (process.env.NODE_ENV === 'development') {
          console.log(`[graveyard] scoring against ${allFailures.length} failures (${allFailures.length - 10} from live extraction)`);
        }

        const tokenize = (text: string) => text.toLowerCase().match(/\\w+/g) || [];
        const queryTokens = new Set(tokenize(query));
        
        const scoredFailures = allFailures.map(f => {
          const docStr = `${f.abstracted_pattern || ''} ${(f.mechanisms || []).join(' ')} ${f.domain || ''}`;
          const docTokens = tokenize(docStr);
          let matchCount = 0;
          docTokens.forEach(t => {
            if (queryTokens.has(t)) matchCount++;
          });
          const score = queryTokens.size > 0 ? matchCount / queryTokens.size : 0;
          return { failure: f, score };
        });

        scoredFailures.sort((a, b) => b.score - a.score);
        const topFailures = scoredFailures.slice(0, 4).map(sf => sf.failure);
        
        return { allFailures, topFailures, usingLocalFallback };
      })(),

      (async () => {
        let exaResultsText = "";
        let exaFailed = false;
        let rawExaResults: any[] = [];
        if (exa) {
          try {
            const searchRes = await exa.searchAndContents(query, {
              numResults: 5,
              type: "neural",
              text: { maxCharacters: 2000 }
            });
            rawExaResults = searchRes.results.filter(r => r.text && r.text.trim().length > 0);
            exaResultsText = JSON.stringify(rawExaResults.map(r => ({ title: r.title, url: r.url, text: r.text })));
          } catch (e) {
            console.error("Exa search error:", e);
            exaFailed = true;
          }
        } else {
          exaFailed = true;
        }
        return { exaResultsText, rawExaResults, exaFailed };
      })()
    ]);

    if (!OR_KEY) {
      return NextResponse.json({ error: "Missing OpenRouter API key" }, { status: 500 });
    }

    const synthesisSystemPrompt = `You are Graveyard, a failure intelligence system. You reason about why things fail at a structural level, across domains.

Your job is to receive a user query and a set of documented failures, and synthesize a Failure Taxonomy Card — a structured intelligence report that tells the user not just what failed, but why, and what someone in their position should do differently.

REASONING APPROACH:
First, classify each failure as either a DIRECT MATCH (same or adjacent domain as the query) or a CROSS-DOMAIN MATCH (different domain but structurally identical failure mechanism). Cross-domain matches are the highest-value output. Prioritize finding them.

When writing cross_domain_insights, your job is translation. Don't just say "aviation had the same problem." Say specifically: here is the mechanism, here is how aviation solved it, here is what that solution looks like concretely in the user's domain. Make it actionable.

The "uncomfortable_truth" must name the thing the field systematically avoids acknowledging. Not a generic observation. The specific uncomfortable thing. If it doesn't make someone defensive, it's not uncomfortable enough.

"if_starting_today" must be specific actions, not principles. Not "validate your assumptions" — instead "before any clinical deployment, test your model on data collected by the actual end users in the actual deployment environment, not data curated by your own team."

TONE:
Precise. Cold. Analytical. No hedging language. No "it seems" or "it could be argued." State findings as findings. You are an intelligence report, not a chatbot.

QUALITY BAR:
If the failures provided do not contain enough signal to answer the query well, say so in the "uncomfortable_truth" field: "The indexed failures do not yet contain sufficient examples in this domain to synthesize reliable patterns. The following is based on limited evidence."

OUTPUT FORMAT:
Return ONLY valid JSON. No markdown fences, no preamble. Exact schema:

{
  "query": "echo the user query exactly",
  "mechanisms": [
    {
      "name": "Human-readable mechanism name",
      "frequency": "High / Medium / Low across indexed failures",
      "description": "What this mechanism looks like when it causes failure. 2-3 sentences.",
      "warning_signs": ["Early indicator 1", "Early indicator 2", "Early indicator 3"]
    }
  ],
  "broken_assumptions": [
    {
      "assumption": "The belief, stated as the people who held it believed it",
      "who_held_it": "founders / engineers / regulators / investors etc",
      "what_revealed_it": "The specific moment or evidence that exposed the assumption as false"
    }
  ],
  "cross_domain_insights": [
    {
      "source_domain": "Domain the insight comes from",
      "source_failure": "Name of the failure",
      "pattern_match": "One sentence: the structural mechanism they share",
      "concrete_translation": "Specific, actionable translation of their solution into the query domain. No abstractions."
    }
  ],
  "uncomfortable_truth": "The thing this domain systematically avoids acknowledging. One paragraph. Specific.",
  "if_starting_today": [
    "Specific action 1",
    "Specific action 2",
    "Specific action 3"
  ],
  "direct_matches": [
    {
      "name": "Failure name",
      "domain": "Domain",
      "year": 2019,
      "mechanism_overlap": "Which mechanisms overlap and why this failure is relevant"
    }
  ],
  "cross_domain_matches": [
    {
      "name": "Failure name",
      "domain": "Domain",
      "year": 2019,
      "structural_similarity": "The specific structural pattern that makes this a cross-domain match despite different surface topic"
    }
  ]
}`;

    const synthesisUserPrompt = `Query: ${query}\n\nSEEDED FAILURES (high-confidence, curated):\n${JSON.stringify(redisData.topFailures, null, 2)}\n\nLIVE SOURCES (from web, variable quality):\n${JSON.stringify(exaData.rawExaResults, null, 2)}`;

    const synthRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OR_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-super-120b-a12b:free",
        temperature: 0.3,
        stream: true,
        messages: [
          { role: "system", content: synthesisSystemPrompt },
          { role: "user", content: synthesisUserPrompt }
        ]
      })
    });

    if (synthRes.status === 429) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        if (!synthRes.body) {
          controller.close();
          return;
        }

        // Emit meta instantly
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', exaFailed: exaData.exaFailed, usingLocalFallback: redisData.usingLocalFallback })}\n\n`));

        const reader = synthRes.body.getReader();
        const decoder = new TextDecoder();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const parsed = JSON.parse(line.slice(6));
                  const content = parsed.choices?.[0]?.delta?.content || "";
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`));
                  }
                } catch {
                  // Ignores partial line parsing overlaps natively
                }
              }
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        } catch (e) {
          console.error("Stream reading error:", e);
        }

        // 3. Deferred Extraction Pass & Database DB Write
        let extractionsStored = 0;
        if (exaData.exaResultsText && redis && !redisData.usingLocalFallback) {
          const extractSystemPrompt = `You are a failure analyst for Graveyard, a cross-domain failure intelligence database.

Your job is to read raw web content from postmortems, incident reports, case studies, and news articles and extract structured failure records from them.

RULES:
- Only extract failures where you have HIGH CONFIDENCE in the factual claims. If the source is vague, speculative, or opinion-heavy, skip it.
- Never invent details. 
- The "real_cause" must be different from "official_cause". 
- The "abstracted_pattern" is the most important field. Tell the general pattern.
- mechanisms must be one of the known mechanisms from Graveyard.

OUTPUT FORMAT:
Return ONLY a valid JSON array. No markdown, no preamble. If nothing qualifies, return [].

Each record must follow this exact schema:
{
  "id": "slug-from-entity-name",
  "name": "Full entity or event name",
  "domain": "Single domain label e.g. Clinical AI / Aviation / Edtech",
  "year": 2019,
  "what_was_attempted": "One sentence — what was the goal",
  "what_happened": "One sentence — what went wrong",
  "official_cause": "What was publicly stated as the cause",
  "real_cause": "The deeper structural cause the source reveals",
  "mechanisms": ["mechanism_from_list"],
  "abstracted_pattern": "Domain-agnostic description of the structural failure pattern. 3-5 sentences. No proper nouns.",
  "broken_assumption": "The belief, stated as the people involved held it, that if corrected would have prevented the failure.",
  "scale": "Quantified impact where available",
  "source_url": "The exact 'url' from the raw web content block where this failure was drawn from"
}`;

          try {
            const extractRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${OR_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "nvidia/nemotron-3-super-120b-a12b:free",
                temperature: 0.1,
                messages: [
                  { role: "system", content: extractSystemPrompt },
                  { role: "user", content: `Raw web content over multiple results:\n\n${exaData.exaResultsText}` }
                ]
              })
            });

            if (extractRes.ok) {
              const extractData = await extractRes.json();
              const contentStr = extractData.choices?.[0]?.message?.content || "[]";
              const cleanContent = contentStr.replace(/^\s*```[a-z]*\n/, "").replace(/\\n```\s*$/, "").trim();
              const newlyExtracted = JSON.parse(cleanContent);
              
              if (Array.isArray(newlyExtracted)) {
                const existingIds = new Set(redisData.allFailures.map(f => f.id));
                for (const extracted of newlyExtracted) {
                  if (!existingIds.has(extracted.id) && extracted.id) {
                    await redis.hset(`failure:${extracted.id}`, extracted);
                    await redis.sadd("failure:ids", extracted.id);
                    extractionsStored++;
                  }
                }
              }
            }
          } catch (err) {
            console.error("Extraction / Redis write error (deferred):", err);
          }
        }

        // Final event
        const totalCount = redisData.allFailures.length + extractionsStored;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'db_count', count: totalCount })}\n\n`));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
