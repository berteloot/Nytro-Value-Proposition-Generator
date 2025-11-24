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
- Must clearly describe HOW product features reduce a pain or create a gain FOR THE SPECIFIC SEGMENT.
- Must reference mechanisms, not repeat benefits.
  Example: "Automated validation rules prevent incorrect submissions before approval," NOT "Reduces errors."
- Must be segment-specific: Consider how THIS segment works, their industry context, role, and unique challenges.
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
- If a pain or gain cannot reasonably be influenced by the product FOR THIS SEGMENT, either:
  - omit it, or
  - mark it as low-confidence and explain why.
- CRITICAL: Do NOT start descriptions with "Addresses:" or "Enables:" - these are labels, not part of the description text.
- CRITICAL: Write complete, full sentences. Never truncate or cut off mid-sentence.
- CRITICAL: All pain relievers and gain creators must be relevant to the specific segment's context, jobs, and needs.

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
      "title": "short label (optional, do not include 'Addresses:' prefix)",
      "description": "how the product relieves this pain in clear, concrete terms. Write a complete sentence explaining the mechanism. Do NOT start with 'Addresses:' - that is a label, not part of the description. Ensure the description is complete and never truncated.",
      "productsUsed": ["optional list of product/service names"],
      "confidence": "high | medium | low",
      "evidenceSource": "user_input | website | research | inferred"
    }
  ],
  "gainCreators": [
    {
      "gainId": "string",       // id of the gain this enables
      "title": "short label (optional, do not include 'Enables:' prefix)",
      "description": "how the product creates or supports this gain in clear, concrete terms. Write a complete sentence explaining the mechanism. Do NOT start with 'Enables:' - that is a label, not part of the description. Ensure the description is complete and never truncated.",
      "productsUsed": ["optional list of product/service names"],
      "confidence": "high | medium | low",
      "evidenceSource": "user_input | website | research | inferred"
    }
  ]
}

IMPORTANT: All descriptions must be complete, full sentences. Never truncate descriptions mid-sentence. If you need to be concise, write shorter but complete sentences.`;

  const userPrompt = `CONTEXT:
We are building a value mapping framework using established value proposition design principles.

CRITICAL - SEGMENT CONTEXT (all pain relievers and gain creators must be tailored to this specific segment):
${canvas.segment || 'Not specified'}

This segment's context matters because:
- Pain relievers must address pains that THIS segment experiences
- Gain creators must create gains that THIS segment values
- The mechanisms must be relevant to how THIS segment works
- Consider the segment's industry, role, and unique challenges when explaining how products help

CUSTOMER JOBS (context for understanding what this segment is trying to accomplish):
${JSON.stringify(canvas.customerJobs.map(j => ({ id: j.id, text: j.text, type: j.type })), null, 2)}

CUSTOMER PAINS (with ids) - these are the specific pains experienced by ${canvas.segment || 'this segment'}:
${JSON.stringify(canvas.customerPains.map(p => ({ id: p.id, text: p.text, intensity: p.intensity })), null, 2)}

CUSTOMER GAINS (with ids) - these are the specific gains desired by ${canvas.segment || 'this segment'}:
${JSON.stringify(canvas.customerGains.map(g => ({ id: g.id, text: g.text, type: g.type })), null, 2)}

PRODUCTS & SERVICES:
${JSON.stringify(canvas.productsServices.map(p => ({ id: p.id, text: p.text })), null, 2)}

WEBSITE / RESEARCH SNIPPETS (context about how the company/product addresses this segment):
${researchSnippets ? researchSnippets.substring(0, 5000) : 'None provided'}

IMPORTANT INSTRUCTIONS:
- Write complete, full sentences for all descriptions
- Do NOT start descriptions with "Addresses:" or "Enables:" - these are labels we add separately
- Do NOT truncate descriptions - write complete thoughts even if concise
- Each description should be a standalone sentence explaining the mechanism

TASK:
1. For each pain that the products can realistically influence FOR THIS SEGMENT, propose 1–2 concrete Pain Relievers.
2. For each gain that the products can realistically influence FOR THIS SEGMENT, propose 1–2 concrete Gain Creators.
3. Be specific about HOW the product helps THIS SEGMENT, considering their unique context and needs.
4. Use conservative, compliant language and do not invent capabilities or quantitative claims that are not supported.
5. Consider the segment's jobs, industry context, and role when explaining mechanisms.
6. Reference how the product features align with what ${canvas.segment || 'this segment'} needs based on their jobs and context.

Return JSON only in the format specified by the system prompt.`;

  const response = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.6,
    maxTokens: 8000, // Increased to ensure complete descriptions aren't truncated
    response_format: { type: 'json_object' },
  });

  if (!response) {
    // Fallback to simple mapping
    return generateFallbackRelieversAndCreators(canvas);
  }

  try {
    const parsed = typeof response === 'string' ? JSON.parse(response) : response;
    
    // Log for debugging - check if descriptions are complete or truncated
    if (parsed.painRelievers) {
      parsed.painRelievers.forEach((pr: any, idx: number) => {
        const desc = pr.description || pr.title || '';
        if (desc.endsWith('...') || desc.endsWith('…') || (desc.length > 0 && desc.length < 20)) {
          console.warn(`Pain reliever ${idx} description may be incomplete:`, desc);
        }
        // Check if description starts with "Addresses:" which should be removed
        if (desc.toLowerCase().startsWith('addresses:')) {
          console.warn(`Pain reliever ${idx} description incorrectly starts with "Addresses:":`, desc);
        }
      });
    }
    
    const painRelievers: PainReliever[] = (parsed.painRelievers || []).map((pr: any) => {
      const originalPain = canvas.customerPains.find(p => p.id === pr.painId);
      
      // Clean up description - remove "Addresses:" prefix if AI mistakenly included it
      let cleanDescription = pr.description || pr.title || '';
      
      // Remove "Addresses:" prefix from description if present (case-insensitive, handle variations)
      // Also remove any trailing ellipsis that might indicate truncation
      cleanDescription = cleanDescription
        .replace(/^addresses:\s*/i, '')
        .replace(/^addresses\s*/i, '')
        .replace(/\.\.\.$/, '')
        .replace(/…$/, '')
        .trim();
      
      // Remove "Addresses:" prefix from title if present
      let cleanTitle = pr.title ? pr.title
        .replace(/^addresses:\s*/i, '')
        .replace(/^addresses\s*/i, '')
        .trim() : '';
      
      // If description is still empty after cleaning, use title as description
      if (!cleanDescription && cleanTitle) {
        cleanDescription = cleanTitle;
        cleanTitle = '';
      }
      
      // If we still don't have a description, create one from the pain text
      // but NEVER add "Addresses:" prefix
      if (!cleanDescription && originalPain) {
        cleanDescription = `Helps address ${originalPain.text.toLowerCase()}`;
      }
      
      // Final safety check: ensure no "Addresses:" prefix slipped through
      if (cleanDescription.toLowerCase().startsWith('addresses:')) {
        console.warn('Final safety check: Removing "Addresses:" prefix from pain reliever:', cleanDescription);
        cleanDescription = cleanDescription.replace(/^addresses:\s*/i, '').trim();
      }
      
      // Use description as the display text (never add "Addresses:" prefix)
      const displayText = cleanDescription;
      
      return {
        id: `reliever-${pr.painId}`,
        text: displayText,
        title: cleanTitle || undefined,
        description: cleanDescription,
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
      
      // Clean up description - remove "Enables:" prefix if AI mistakenly included it
      let cleanDescription = gc.description || gc.title || '';
      
      // Remove "Enables:" prefix from description if present (case-insensitive, handle variations)
      // Also remove any trailing ellipsis that might indicate truncation
      cleanDescription = cleanDescription
        .replace(/^enables:\s*/i, '')
        .replace(/^enables\s*/i, '')
        .replace(/\.\.\.$/, '')
        .replace(/…$/, '')
        .trim();
      
      // Remove "Enables:" prefix from title if present
      let cleanTitle = gc.title ? gc.title
        .replace(/^enables:\s*/i, '')
        .replace(/^enables\s*/i, '')
        .trim() : '';
      
      // If description is still empty after cleaning, use title as description
      if (!cleanDescription && cleanTitle) {
        cleanDescription = cleanTitle;
        cleanTitle = '';
      }
      
      // If we still don't have a description, create one from the gain text
      // but NEVER add "Enables:" prefix
      if (!cleanDescription && originalGain) {
        cleanDescription = `Helps enable ${originalGain.text.toLowerCase()}`;
      }
      
      // Final safety check: ensure no "Enables:" prefix slipped through
      if (cleanDescription.toLowerCase().startsWith('enables:')) {
        console.warn('Final safety check: Removing "Enables:" prefix from gain creator:', cleanDescription);
        cleanDescription = cleanDescription.replace(/^enables:\s*/i, '').trim();
      }
      
      // Use description as the display text (never add "Enables:" prefix)
      const displayText = cleanDescription;
      
      return {
        id: `creator-${gc.gainId}`,
        text: displayText,
        title: cleanTitle || undefined,
        description: cleanDescription,
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

// NOTE: This is a last-resort fallback that creates generic descriptions
// when the AI call fails. It does NOT implement full mechanism-level detail
// and should be replaced by AI-generated relievers/gain creators whenever possible.
export function generateFallbackRelieversAndCreators(canvas: ValuePropositionCanvas): {
  painRelievers: PainReliever[];
  gainCreators: GainCreator[];
} {
  const painRelievers: PainReliever[] = canvas.customerPains.slice(0, 6).map((pain, idx) => ({
    id: `reliever-${idx + 1}`,
    text: `Helps address ${pain.text.toLowerCase()}`, // Never use "Addresses:" prefix
    description: `Helps address ${pain.text.toLowerCase()}`,
    confidence: pain.confidence,
    painId: pain.id,
    evidenceSource: 'inferred',
  }));

  const gainCreators: GainCreator[] = canvas.customerGains.slice(0, 5).map((gain, idx) => ({
    id: `creator-${idx + 1}`,
    text: `Helps enable ${gain.text.toLowerCase()}`, // Never use "Enables:" prefix
    description: `Helps enable ${gain.text.toLowerCase()}`,
    confidence: gain.confidence,
    gainId: gain.id,
    evidenceSource: 'inferred',
  }));

  return { painRelievers, gainCreators };
}
