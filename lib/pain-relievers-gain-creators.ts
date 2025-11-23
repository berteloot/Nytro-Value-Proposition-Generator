import { ValuePropositionCanvas, PainReliever, GainCreator } from '@/types';
import { callOpenAI } from './openai';

/**
 * Generate Pain Relievers and Gain Creators with specific mechanisms
 * Following value mapping methodology with strict guardrails
 */
export async function generatePainRelieversAndGainCreators(
  canvas: ValuePropositionCanvas,
  researchSnippets?: string
): Promise<{ painRelievers: PainReliever[]; gainCreators: GainCreator[] }> {
  const systemPrompt = `You are a senior strategist implementing a value mapping framework, and you must apply these rules to ANY industry (e.g., SaaS, healthcare, logistics, industrials, finance, consulting, manufacturing, hardware, education, cybersecurity, biotech, energy, HR tech).

GLOBAL RULES:
1) One canvas must focus on ONE segment only. Never mix user types or buyer types.
2) Do not invent product capabilities, technologies, or numerical results.
3) Use qualitative language if numerical proof is not explicitly provided.
4) Competitive contrast must reference REAL alternatives found in research or user inputs. Never make up vague comparisons such as "better than spreadsheets" unless spreadsheets are clearly relevant.
5) Emotional language must NOT appear in Jobs. Emotional concerns belong in Pains.

PAIN RELIEVERS AND GAIN CREATORS (must explain HOW):
- Must clearly describe HOW product features reduce a pain or create a gain.
- Must reference mechanisms, not repeat benefits.
  Example: "Automated validation rules prevent incorrect submissions before approval," NOT "Reduces errors."
- If mechanisms are unknown, use phrasing like "is designed to help" or "supports" without inventing capabilities.
- Only use capabilities that are clearly implied by:
  - Products & services provided by the user
  - Website or research snippets
- Do NOT invent new technologies or capabilities (e.g. AI, automation, robotics, dashboards, analytics) unless they appear explicitly in the inputs.
- Do NOT invent clinical or numerical claims.
- Use conservative, compliant phrasing such as:
  - "is designed to help"
  - "supports"
  - "can help reduce"
  - "may contribute to"
- If a pain or gain cannot reasonably be influenced by the product, either:
  - omit it, or
  - mark it as low-confidence and explain why.

FORMAT RULES:
- Use concise, precise language. Avoid hype, clichés, and slogans.
- Never use phrases like "game changer," "revolutionary," "unlock potential," "disruptive."
- Always prefer practical wording: "reliable," "supports," "helping teams reduce," "specialized for," "designed to assist with."

OUTPUT FORMAT:
Return JSON with:
{
  "painRelievers": [
    {
      "painId": "string",       // id of the pain this addresses
      "title": "short label",
      "description": "how the product relieves this pain in clear, concrete terms",
      "productsUsed": ["optional list of product/service names"],
      "confidence": "high | medium | low",
      "evidenceSource": "user_input | website | research | inferred"
    }
  ],
  "gainCreators": [
    {
      "gainId": "string",       // id of the gain this enables
      "title": "short label",
      "description": "how the product creates or supports this gain in clear, concrete terms",
      "productsUsed": ["optional list of product/service names"],
      "confidence": "high | medium | low",
      "evidenceSource": "user_input | website | research | inferred"
    }
  ]
}`;

  const userPrompt = `CONTEXT:
We are building a value mapping framework using established value proposition design principles.

SEGMENT (single, focused):
${canvas.segment || 'Not specified'}

CUSTOMER PAINS (with ids):
${JSON.stringify(canvas.customerPains.map(p => ({ id: p.id, text: p.text })), null, 2)}

CUSTOMER GAINS (with ids):
${JSON.stringify(canvas.customerGains.map(g => ({ id: g.id, text: g.text })), null, 2)}

PRODUCTS & SERVICES:
${JSON.stringify(canvas.productsServices.map(p => ({ id: p.id, text: p.text })), null, 2)}

WEBSITE / RESEARCH SNIPPETS (optional):
${researchSnippets ? researchSnippets.substring(0, 5000) : 'None provided'}

TASK:
1. For each pain that the products can realistically influence, propose 1–2 concrete Pain Relievers.
2. For each gain that the products can realistically influence, propose 1–2 concrete Gain Creators.
3. Be specific about HOW the product helps, not just "addresses this pain".
4. Use conservative, compliant language and do not invent capabilities or quantitative claims that are not supported.

Return JSON only in the format specified by the system prompt.`;

  const response = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.6,
    maxTokens: 4000,
    response_format: { type: 'json_object' },
  });

  if (!response) {
    // Fallback to simple mapping
    return generateFallbackRelieversAndCreators(canvas);
  }

  try {
    const parsed = typeof response === 'string' ? JSON.parse(response) : response;
    
    const painRelievers: PainReliever[] = (parsed.painRelievers || []).map((pr: any) => {
      const originalPain = canvas.customerPains.find(p => p.id === pr.painId);
      return {
        id: `reliever-${pr.painId}`,
        text: pr.title || pr.description || `Addresses: ${originalPain?.text || ''}`,
        title: pr.title,
        description: pr.description,
        productsUsed: pr.productsUsed || [],
        confidence: (pr.confidence === 'high' || pr.confidence === 'medium' || pr.confidence === 'low') 
          ? pr.confidence 
          : 'medium' as const,
        painId: pr.painId,
        evidenceSource: pr.evidenceSource || 'inferred',
      };
    });

    const gainCreators: GainCreator[] = (parsed.gainCreators || []).map((gc: any) => {
      const originalGain = canvas.customerGains.find(g => g.id === gc.gainId);
      return {
        id: `creator-${gc.gainId}`,
        text: gc.title || gc.description || `Enables: ${originalGain?.text || ''}`,
        title: gc.title,
        description: gc.description,
        productsUsed: gc.productsUsed || [],
        confidence: (gc.confidence === 'high' || gc.confidence === 'medium' || gc.confidence === 'low') 
          ? gc.confidence 
          : 'medium' as const,
        gainId: gc.gainId,
        evidenceSource: gc.evidenceSource || 'inferred',
      };
    });

    return { painRelievers, gainCreators };
  } catch (error) {
    console.error('Failed to parse Pain Relievers/Gain Creators:', error);
    return generateFallbackRelieversAndCreators(canvas);
  }
}

// NOTE: This is a last-resort fallback that creates generic "Addresses/Enables" labels
// when the AI call fails. It does NOT implement full mechanism-level detail
// and should be replaced by AI-generated relievers/gain creators whenever possible.
export function generateFallbackRelieversAndCreators(canvas: ValuePropositionCanvas): {
  painRelievers: PainReliever[];
  gainCreators: GainCreator[];
} {
  const painRelievers: PainReliever[] = canvas.customerPains.slice(0, 6).map((pain, idx) => ({
    id: `reliever-${idx + 1}`,
    text: `Addresses: ${pain.text.substring(0, 50)}...`,
    confidence: pain.confidence,
    painId: pain.id,
    evidenceSource: 'inferred',
  }));

  const gainCreators: GainCreator[] = canvas.customerGains.slice(0, 5).map((gain, idx) => ({
    id: `creator-${idx + 1}`,
    text: `Enables: ${gain.text}`,
    confidence: gain.confidence,
    gainId: gain.id,
    evidenceSource: 'inferred',
  }));

  return { painRelievers, gainCreators };
}
