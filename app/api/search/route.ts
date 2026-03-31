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

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    let allFailures: Failure[] = [];
    let usingLocalFallback = false;

    // 1. Read from Redis
    if (redis) {
      try {
        const ids = await redis.smembers("failure:ids");
        if (ids && ids.length > 0) {
          const pipeline = redis.pipeline();
          ids.forEach(id => pipeline.hgetall(`failure:${id}`));
          const results = await pipeline.exec();
          allFailures = results.filter(f => f && (f as Record<string, unknown>).id) as unknown as Failure[];
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

    if (allFailures.length === 0) {
      // In case Redis was empty (not seeded yet) and we didn't fallback
      allFailures = [...SEEDED_FAILURES];
    }

    const existingIds = new Set(allFailures.map(f => f.id));

    // 2. Exa Search
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

    // 3. Extraction Pass
    let newlyExtracted: Failure[] = [];
    if (exaResultsText && OR_KEY) {
      const extractSystemPrompt = `You are a failure analyst for Graveyard, a cross-domain failure intelligence database.

Your job is to read raw web content from postmortems, incident reports, case studies, and news articles and extract structured failure records from them.

RULES:
- Only extract failures where you have HIGH CONFIDENCE in the factual claims. If the source is vague, speculative, or opinion-heavy, skip it.
- Never invent details. If a field cannot be filled from the source text, use null for optional fields or skip the record entirely.
- The "real_cause" must be different from "official_cause". If you cannot identify a deeper structural cause beyond what was officially stated, skip the record.
- The "abstracted_pattern" is the most important field. It must describe the failure with ALL domain-specific language removed. No company names, no industry jargon. Just the structural shape of what happened. It must be specific enough that a reader in a completely different field would recognize the same pattern in their own domain.
- The "broken_assumption" must be written as a belief — the actual thing the people involved believed to be true, stated from their perspective, not as a post-hoc criticism.
- mechanisms must be one or more from this exact list only:
  authority_gradient, normalization_of_deviance, optimism_bias, sunk_cost_continuation, groupthink, overconfidence, incentive_misalignment, information_siloing, diffusion_of_responsibility, scope_creep, key_person_dependency, timing_mismatch, regulatory_blindside, incumbent_response_underestimated, customer_behavior_assumption_wrong, distribution_channel_assumption_wrong, correlation_mistaken_for_causation, survivorship_bias, single_model_overgeneralized, ignored_prior_art_in_adjacent_field, false_consensus_from_weak_source, lab_to_field_gap, automation_overconfidence, automation_eroding_manual_competency

OUTPUT FORMAT:
Return ONLY a valid JSON array. No markdown, no preamble, no explanation. If nothing qualifies, return [].

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
  "scale": "Quantified impact where available"
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
              { role: "user", content: `Raw web content over multiple results:\n\n${exaResultsText}` }
            ]
          })
        });

        if (extractRes.status === 429) {
          return NextResponse.json({ error: "Rate limited" }, { status: 429 });
        }

        const extractData = await extractRes.json();
        const contentStr = extractData.choices?.[0]?.message?.content || "[]";
        const cleanContent = contentStr.replace(/^\s*```[a-z]*\n/, "").replace(/\n```\s*$/, "").trim();
        newlyExtracted = JSON.parse(cleanContent);
        if (!Array.isArray(newlyExtracted)) newlyExtracted = [];
      } catch (e) {
        console.error("Extraction error:", e);
      }
    }

    // 4. Deduplicate and write
    if (newlyExtracted.length > 0 && redis && !usingLocalFallback) {
      for (const extracted of newlyExtracted) {
        if (!existingIds.has(extracted.id) && extracted.id) {
          try {
            await redis.hset(`failure:${extracted.id}`, extracted);
            await redis.sadd("failure:ids", extracted.id);
            allFailures.push(extracted);
            existingIds.add(extracted.id);
          } catch (err) {
            console.error(`Failed to write extracted failure to redis:`, err);
          }
        }
      }
    } else if (usingLocalFallback && newlyExtracted.length > 0) {
      // Ephemeral fallback merge
      for (const extracted of newlyExtracted) {
        if (!existingIds.has(extracted.id) && extracted.id) {
          allFailures.push(extracted);
          existingIds.add(extracted.id);
        }
      }
    }

    // 5. Score and filter Top 4
    const tokenize = (text: string) => text.toLowerCase().match(/\w+/g) || [];
    const queryTokens = new Set(tokenize(query));
    
    const scoredFailures = allFailures.map(f => {
      const docStr = `${f.abstracted_pattern || ''} ${(f.mechanisms || []).join(' ')} ${f.domain || ''}`;
      const docTokens = tokenize(docStr);
      let matchCount = 0;
      docTokens.forEach(t => {
        if (queryTokens.has(t)) matchCount++;
      });
      // Normalize by query length (prevent division by zero)
      const score = queryTokens.size > 0 ? matchCount / queryTokens.size : 0;
      return { failure: f, score };
    });

    scoredFailures.sort((a, b) => b.score - a.score);
    const topFailures = scoredFailures.slice(0, 4).map(sf => sf.failure);

    // 6. Synthesis Pass
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
If the failures provided do not contain enough signal to answer the query well, say so in the "uncomfortable_truth" field: "The indexed failures do not yet contain sufficient examples in this domain to synthesize reliable patterns. The following is based on limited evidence." Then still do your best.

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

    const synthesisUserPrompt = `Query: ${query}

SEEDED FAILURES (high-confidence, curated):
${JSON.stringify(topFailures, null, 2)}

LIVE SOURCES (from web, variable quality):
${JSON.stringify(rawExaResults, null, 2)}`;

    const synthRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OR_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-super-120b-a12b:free",
        temperature: 0.3,
        messages: [
          { role: "system", content: synthesisSystemPrompt },
          { role: "user", content: synthesisUserPrompt }
        ]
      })
    });

    if (synthRes.status === 429) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const synthData = await synthRes.json();
    let finalJsonStr = synthData.choices?.[0]?.message?.content || "{}";
    finalJsonStr = finalJsonStr.replace(/^\s*```[a-z]*\n/, "").replace(/\n```\s*$/, "").trim();

    let taxonomyCard;
    try {
      taxonomyCard = JSON.parse(finalJsonStr);
    } catch (e) {
      console.error("Failed to parse synthesis JSON:", e);
      return NextResponse.json({ error: "Synthesis output malformed" }, { status: 500 });
    }

    return NextResponse.json({
      card: taxonomyCard,
      meta: {
        databaseSize: allFailures.length,
        exaFailed,
        usingLocalFallback
      }
    });

  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
