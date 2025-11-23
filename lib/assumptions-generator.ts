import { ValuePropositionCanvas, ValuePropositionStatement, Assumption } from '@/types';
import { callOpenAI } from './openai';

/**
 * Generate Assumptions and Experiments for a Value Proposition
 * Following value mapping methodology to identify key assumptions that must be validated
 */
export async function generateAssumptionsWithAI(
  canvas: ValuePropositionCanvas,
  valueProposition: ValuePropositionStatement
): Promise<Assumption[]> {
  const systemPrompt = `You are a senior strategist implementing a value mapping framework, and you must apply these rules to ANY industry (e.g., SaaS, healthcare, logistics, industrials, finance, consulting, manufacturing, hardware, education, cybersecurity, biotech, energy, HR tech).

GLOBAL RULES:
1) One canvas must focus on ONE segment only. Never mix user types or buyer types.
2) Do not invent product capabilities, technologies, or numerical results.
3) Use qualitative language if numerical proof is not explicitly provided.
4) Competitive contrast must reference REAL alternatives found in research or user inputs. Never make up vague comparisons such as "better than spreadsheets" unless spreadsheets are clearly relevant.
5) Emotional language must NOT appear in Jobs. Emotional concerns belong in Pains.

ASSUMPTIONS (key risks that must be validated):
- Identify critical assumptions that must be true for the value proposition to succeed
- Focus on assumptions about customer behavior, market fit, and value delivery
- Categorize assumptions by type:
  - customer_segment: Assumptions about the target customer segment
  - value_proposition: Assumptions about the value proposition itself
  - channel: Assumptions about how to reach customers
  - revenue: Assumptions about willingness to pay or pricing
  - cost: Assumptions about cost structure or delivery costs
  - other: Other critical assumptions
- For each assumption, suggest a concrete experiment to test it
- Rate testability: high (easy to test), medium (requires some effort), low (difficult to test)

FORMAT RULES:
- Use concise, precise language. Avoid hype, clichés, and slogans.
- Never use phrases like "game changer," "revolutionary," "unlock potential," "disruptive."
- Always prefer practical wording: "reliable," "supports," "helping teams reduce," "specialized for," "designed to assist with."`;

  const userPrompt = `Analyze the following value proposition and canvas to identify key assumptions that must be validated.

VALUE PROPOSITION:
${valueProposition.statement}

SEGMENT:
${valueProposition.segmentTargeted}

PRIMARY JOB-TO-BE-DONE:
${valueProposition.primaryJob}

KEY PAINS RELIEVED:
${valueProposition.keyPainsRelieved.map(id => {
  const pain = canvas.customerPains.find(p => p.id === id);
  return pain ? `- ${pain.text}` : `- ${id}`;
}).join('\n')}

KEY GAINS CREATED:
${valueProposition.keyGainsCreated.map(id => {
  const gain = canvas.customerGains.find(g => g.id === id);
  return gain ? `- ${gain.text}` : `- ${id}`;
}).join('\n')}

COMPETITIVE CONTRAST:
${valueProposition.competitiveContrast}

MEASURABLE IMPACT:
${valueProposition.measurableImpact}

TASK:
1. Identify 5-8 critical assumptions that must be true for this value proposition to succeed
2. For each assumption:
   - State it clearly and concretely
   - Categorize it (customer_segment, value_proposition, channel, revenue, cost, or other)
   - Rate testability (high, medium, or low)
   - Suggest a concrete experiment to test it

Return a JSON object with this structure:
{
  "assumptions": [
    {
      "statement": "Clear statement of the assumption",
      "category": "customer_segment | value_proposition | channel | revenue | cost | other",
      "testability": "high | medium | low",
      "experiment": "Concrete experiment to test this assumption"
    }
  ]
}

Be specific and actionable. Focus on assumptions that are critical to the value proposition's success. Return ONLY valid JSON object, no markdown formatting.`;

  const response = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.6,
    maxTokens: 3000,
    response_format: { type: 'json_object' },
  });

  if (!response) {
    return [];
  }

  try {
    const parsed = typeof response === 'string' ? JSON.parse(response) : response;
    
    if (!parsed.assumptions || !Array.isArray(parsed.assumptions)) {
      return [];
    }

    return parsed.assumptions.map((assumption: any, idx: number) => {
      const validCategory = ['customer_segment', 'value_proposition', 'channel', 'revenue', 'cost', 'other'].includes(assumption.category)
        ? assumption.category
        : 'other';
      
      const validTestability = ['high', 'medium', 'low'].includes(assumption.testability)
        ? assumption.testability
        : 'medium';
      
      return {
        id: `assumption-${idx + 1}`,
        statement: assumption.statement || '',
        category: validCategory as Assumption['category'],
        testability: validTestability as Assumption['testability'],
        experiment: assumption.experiment || '',
      };
    }).filter((assumption: Assumption) => assumption.statement.length > 0);
  } catch (error) {
    console.error('Failed to parse assumptions:', error);
    return [];
  }
}


