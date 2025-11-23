import { ValuePropositionCanvas, ValuePropositionStatement, UserInput, EvidenceMetric } from '@/types';
import { callOpenAI } from './openai';

/**
 * Detects whether the offering is a product, service, or both based on keywords
 */
function detectProductType(productName: string, description: string): 'product' | 'service' | 'both' {
  const lowerName = productName.toLowerCase();
  const lowerDesc = description.toLowerCase();
  
  const serviceKeywords = ['agency', 'consulting', 'services', 'service', 'advisory', 'firm', 'partners', 'group', 'marketing', 'advertising'];
  const productKeywords = ['software', 'platform', 'tool', 'app', 'system', 'solution', 'product', 'device'];
  
  const hasServiceKeywords = serviceKeywords.some(kw => lowerName.includes(kw) || lowerDesc.includes(kw));
  const hasProductKeywords = productKeywords.some(kw => lowerName.includes(kw) || lowerDesc.includes(kw));
  
  if (hasServiceKeywords && hasProductKeywords) return 'both';
  if (hasServiceKeywords) return 'service';
  if (hasProductKeywords) return 'product';
  return 'both'; // Default to 'both' if unclear
}

/**
 * Gets the appropriate statement prefix based on product type
 * For services: "[Company Name] helps..." or "We help..."
 * For products: "Our [product name] helps..."
 */
function getStatementPrefix(productName: string, productType: 'product' | 'service' | 'both'): string {
  switch (productType) {
    case 'service':
      // For services: use company name directly if it's a proper name (not generic)
      // If productName looks like a company name (no generic terms), use it directly
      if (productName.length < 40 && 
          !productName.toLowerCase().includes('service') && 
          !productName.toLowerCase().includes('tool') &&
          !productName.toLowerCase().includes('platform') &&
          !productName.toLowerCase().includes('software')) {
        return productName;
      }
      return 'We';
    case 'product':
      return `Our ${productName}`;
    case 'both':
    default:
      return `Our ${productName}`;
  }
}

export async function generateValuePropositions(
  canvas: ValuePropositionCanvas,
  userInput: UserInput
): Promise<ValuePropositionStatement[]> {
  const prioritizedPains = canvas.customerPains.filter(p => p.isPrioritized).slice(0, 3);
  const prioritizedGains = canvas.customerGains.filter(g => g.isPrioritized).slice(0, 3);
  
  if (prioritizedPains.length < 3 || prioritizedGains.length < 3) {
    throw new Error('Must prioritize exactly 3 pains and 3 gains');
  }

  // Get all customer jobs (not just primary) - we'll use different jobs for different propositions
  const allCustomerJobs = canvas.customerJobs;
  const primaryJobId = canvas.primaryJobId || (canvas.customerJobs.length > 0 ? canvas.customerJobs[0].id : undefined);
  const primaryJob = canvas.customerJobs.find(j => j.id === primaryJobId) || canvas.customerJobs[0];
  
  // Use canvas segment (single, focused) - prioritize userInput.primarySegment if available
  const segment = userInput.primarySegment || canvas.segment || (userInput.targetDecisionMaker ? `${userInput.targetDecisionMaker} in organizations` : 'Target customers');

  // Get alternatives from canvas (from research)
  const alternatives = canvas.alternatives || [];
  
  // Get evidence/metrics from canvas
  const evidenceMetrics = canvas.evidenceMetrics || [];

  // Try to use OpenAI for better value propositions
  const aiPropositions = await generateWithAI(
    canvas, 
    userInput, 
    prioritizedPains, 
    prioritizedGains, 
    allCustomerJobs, // Pass all jobs, not just primary
    primaryJob, // Keep primary for reference
    segment,
    alternatives,
    evidenceMetrics
  );
  
  if (aiPropositions) {
    return aiPropositions;
  }

  // Fallback to template-based generation
  return generateFallbackPropositions(canvas, userInput);
}

async function generateWithAI(
  canvas: ValuePropositionCanvas,
  userInput: UserInput,
  prioritizedPains: any[],
  prioritizedGains: any[],
  allCustomerJobs: any[], // All available jobs
  primaryJob: any, // Primary job for reference
  segment: string,
  alternatives: string[],
  evidenceMetrics: EvidenceMetric[]
): Promise<ValuePropositionStatement[] | null> {
  // Detect product type for phrasing adaptation
  const productType = userInput.productType || detectProductType(userInput.productName, userInput.description);
  const statementPrefix = getStatementPrefix(userInput.productName, productType);
  const systemPrompt = `You are a senior strategist implementing a value mapping framework, and you must apply these rules to ANY industry (e.g., SaaS, healthcare, logistics, industrials, finance, consulting, manufacturing, hardware, education, cybersecurity, biotech, energy, HR tech).

GLOBAL RULES:
1) One canvas must focus on ONE segment only. Never mix user types or buyer types.
2) Do not invent product capabilities, technologies, or numerical results.
3) Use qualitative language if numerical proof is not explicitly provided.
4) Competitive contrast must reference REAL alternatives found in research or user inputs. Never make up vague comparisons such as "better than spreadsheets" unless spreadsheets are clearly relevant.
5) Represent functional jobs clearly. Emotional and social jobs are allowed, but must be explicit and concrete (e.g., 'feel confident when presenting findings to clients'), not vague. Emotional language belongs primarily in Pains and Gains, but may be referenced when naming emotional or social jobs when necessary.

METRICS (no invention allowed):
- You may ONLY use numerical claims if they come from:
  a) user inputs,
  b) uploaded files,
  c) website evidence,
  d) research text provided.
- If no evidence exists, write:
  "Qualitative: designed to support faster onboarding and reduce errors."
- Never invent percentages, dollar values, or performance numbers.

UNSATISFIED JOBS PRIORITY:
- Prefer unresolved pains, unsatisfied jobs, and unrealized gains that are not well served by existing alternatives.

CUSTOMER SUCCESS ALIGNMENT:
- Align measurableImpact and coreOutcome with how customers already measure success (e.g., time, money, errors, risk, satisfaction). Use qualitative wording if no numbers are explicitly sourced.

PAYING PROBLEMS:
- Favor pains and gains that either affect many in this segment or represent problems customers are willing to pay significantly to solve.

COMPETITIVE CONTRAST:
- Must compare against real alternatives (manual methods, DIY, specific competitors, outsourcing, existing vendor, status quo).
- Must NOT compare against fictional technologies, generic "legacy systems," or invented competitors.
- If competitor names are not found, use generic category labels (e.g., "generic contract management tools," "traditional outsourced providers").
- CRITICAL: Use neutral, factual differentiation. NEVER make superiority claims (e.g., "superior," "better," "best," "outperforms") unless explicitly sourced from website or research.
- Instead, use factual contrast format: "Designed specifically for [specific use case], whereas alternatives often serve [broader/different applications]."
- Focus on specialization, design intent, or fit differences without implying proof of superiority.

FORMAT RULES:
- Use concise, precise language. Avoid hype, clichés, and slogans.
- Never use phrases like "game changer," "revolutionary," "unlock potential," "disruptive."
- Always prefer practical wording: "reliable," "supports," "helping teams reduce," "specialized for," "designed to assist with."

Your job:
- Take a validated Customer Profile and Value Map.
- Generate 3 sharp Value Proposition options for the SAME segment, each varying by:
  - Different jobs-to-be-done (use different jobs from the available customer jobs list), OR
  - Different pain/gain combinations (emphasize different prioritized pains and gains), OR
  - Different value angles (pain-focused vs gain-focused vs balanced)
- Each proposition must focus on:
  - ONE clear segment (the same segment for all 3)
  - ONE primary job-to-be-done (can be different for each proposition)
  - ONE dominant outcome (pain removed and/or gain created)
- IMPORTANT: Create meaningful variation between the 3 propositions - don't just rephrase the same value proposition three times.
- Do NOT invent technologies or product capabilities that are not present in:
  - Products & services
  - Pain relievers / gain creators
  - Website or research snippets

VALUE PROPOSITION STATEMENT FORMAT (Ad-Lib Template):
You MUST structure the "statement" field using the ad-lib template format, adapting the prefix based on whether this is a product or service:

FOR SERVICES/AGENCIES:
Use natural phrasing that sounds like a service provider:
- "[Company/Service Name] help(s) [customer segment] who want to [jobs to be done] by [verb] [gain] and want to [verb] [pain], unlike [competing value proposition]."
- OR "We help [customer segment] who want to [jobs to be done] by [verb] [gain] and want to [verb] [pain], unlike [competing value proposition]."
- Avoid "Our [Company Name]" for services - it sounds awkward. Use "[Company Name]" directly or "We".

FOR PRODUCTS:
Use standard product phrasing:
- "Our [product name] help(s) [customer segment] who want to [jobs to be done] by [verb] [gain] and want to [verb] [pain], unlike [competing value proposition]."

The statement should be a single, flowing sentence that follows this ad-lib structure naturally and sounds natural for the type of offering.

OUTPUT FORMAT:
Return JSON with:
{
  "valueProps": [
    {
      "id": "string",
      "label": "short internal label",
      "statement": "Value proposition following ad-lib template structure",
      "segmentTargeted": "who this is for (role + context)",
      "primaryJob": "the main job-to-be-done you anchor on",
      "coreOutcome": "the main outcome (pain removed / gain created)",
      "measurableImpact": "either (a) a provided metric, or (b) a qualitative description if no metrics are provided",
      "keyPainsRelieved": ["painId1", "painId2", "painId3"],
      "keyGainsCreated": ["gainId1", "gainId2", "gainId3"],
      "competitiveContrast": "how this differs vs named alternatives in the inputs",
      "assumptions": ["short list of key assumptions that must be true for this VP to resonate"]
    }
  ]
}`;

  const userPrompt = `CONTEXT:
We are generating Value Proposition options using value mapping principles.

PRODUCT TYPE CONTEXT:
This is a ${productType === 'service' ? 'service/agency' : productType === 'product' ? 'product' : 'product/service combination'}.
Product/Service Name: ${userInput.productName}
${productType === 'service' ? 'IMPORTANT: For services/agencies, use natural phrasing like "[Company Name] helps..." or "We help..." instead of "Our [Company Name] helps..." which sounds awkward for services.' : productType === 'product' ? 'Use standard product phrasing: "Our [product name] helps..."' : 'Adapt phrasing appropriately - can use either product or service phrasing depending on what sounds most natural.'}

CRITICAL - SEGMENT (MUST USE THIS EXACT SEGMENT - DO NOT CHANGE OR INVENT A DIFFERENT ONE):
${segment}

IMPORTANT: You MUST use the exact segment provided above in ALL value propositions. Do NOT invent, modify, or substitute a different segment. All 3 value propositions must target this exact same segment.

ALL AVAILABLE CUSTOMER JOBS (use different jobs for different propositions to create variation):
${JSON.stringify(allCustomerJobs.map(j => ({ id: j.id, text: j.text, type: j.type })), null, 2)}

PRIMARY JOB-TO-BE-DONE (user-selected, can be used as reference but you may use different jobs for different propositions):
${primaryJob.text}

TOP PAINS (ids and descriptions):
${JSON.stringify(prioritizedPains.map(p => ({ id: p.id, text: p.text })), null, 2)}

TOP GAINS (ids and descriptions):
${JSON.stringify(prioritizedGains.map(g => ({ id: g.id, text: g.text })), null, 2)}

PRODUCTS & SERVICES:
${JSON.stringify(canvas.productsServices.map(p => ({ id: p.id, text: p.text })), null, 2)}

PAIN RELIEVERS:
${JSON.stringify(canvas.painRelievers.map(pr => ({ 
  id: pr.id, 
  title: pr.title || pr.text, 
  description: pr.description || pr.text,
  relatedPainId: pr.relatedPainId 
})), null, 2)}

GAIN CREATORS:
${JSON.stringify(canvas.gainCreators.map(gc => ({ 
  id: gc.id, 
  title: gc.title || gc.text, 
  description: gc.description || gc.text,
  relatedGainId: gc.relatedGainId 
})), null, 2)}

ALTERNATIVES (current ways customers solve the problem):
${alternatives.length > 0 ? JSON.stringify(alternatives, null, 2) : '["Standard manual processes", "Existing tools and methods"]'}

AVAILABLE EVIDENCE / METRICS (if any):
${evidenceMetrics.length > 0 
  ? JSON.stringify(evidenceMetrics, null, 2) 
  : '[]'}
(If this section is empty or contains no explicit numeric claims tied to this product, you must NOT invent metrics.)

TASK:
1. Propose 3 Value Proposition options that create meaningful variation.
2. Each option must:
   - CRITICAL: Target the EXACT segment provided above ("${segment}"). Do NOT change, modify, or invent a different segment. All propositions must use this exact segment.
   - Anchor on a DIFFERENT job-to-be-done from the available customer jobs list (or use different pain/gain combinations if jobs are limited).
   - Emphasize different combinations of the top pains and gains to create variation:
     * Proposition 1: Could focus on pains 1-2 and gains 1-2
     * Proposition 2: Could focus on pains 2-3 and gains 2-3  
     * Proposition 3: Could focus on pains 1,3 and gains 1,3
   - OR vary by angle: pain-focused, gain-focused, and balanced approaches.
3. Create meaningful differentiation between the 3 propositions - they should feel like distinct value proposition options, not just rephrased versions of the same idea.
   - CRITICAL: The "statement" field MUST follow the ad-lib template structure, adapted for product type:
     ${productType === 'service' ? 'For services: "[Company Name] help(s)..." or "We help..." (NOT "Our [Company Name] helps...")' : 'For products: "Our [product name] help(s)..."'}
     Full structure: "[prefix] help(s) [customer segment] who want to [jobs to be done] by [verb] [gain] and want to [verb] [pain], unlike [competing value proposition]."
   - Use appropriate verbs: for gains use "increasing," "enabling," "creating," "supporting"; for pains use "reducing," "avoiding," "eliminating," "minimizing."
   - Make it a single, natural-flowing sentence that reads smoothly and sounds natural for a ${productType === 'service' ? 'service provider' : 'product'}.
3. For "measurableImpact":
   - If explicit metrics are provided in the input (e.g. "reduced CSF leak rate from X to Y"), you may restate them.
   - If no explicit metrics are provided, write a qualitative description and explicitly mark it as qualitative (e.g. "Qualitative: designed to help reduce post-operative complications and support faster recovery.").
4. For "competitiveContrast":
   - Compare against actual alternatives in the ALTERNATIVES list.
   - Do not mention spreadsheets, manual processes, AI, or automation unless they appear in the alternatives or product description.
   - Use neutral, factual differentiation format: "Designed specifically for [specific use case], whereas alternatives often serve [broader/different applications]."
   - NEVER use superiority claims like "superior," "better," "best," "outperforms," "provides superior X" unless explicitly sourced from website or research.
   - Example of CORRECT format: "Designed specifically for reliable stabilization in neurosurgical positioning, whereas alternatives often serve broader surgical applications."
   - Example of INCORRECT format: "Provides superior stabilization compared to [competitor]." (This implies proof without source)

Return JSON only in the format specified by the system prompt.`;

  const response = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.7,
    maxTokens: 4000,
    response_format: { type: 'json_object' },
  });

  if (!response) {
    return null;
  }

  try {
    const parsed = typeof response === 'string' ? JSON.parse(response) : response;
    
    if (!parsed.valueProps || !Array.isArray(parsed.valueProps) || parsed.valueProps.length === 0) {
      return null;
    }

    return parsed.valueProps.map((prop: any, idx: number) => {
      // CRITICAL: Enforce the correct segment - always use the provided segment
      let correctedSegmentTargeted = prop.segmentTargeted || segment;
      
      // If the segmentTargeted doesn't match our segment, force it to use the correct one
      if (correctedSegmentTargeted.toLowerCase() !== segment.toLowerCase()) {
        console.warn(`Value proposition ${idx + 1} had incorrect segment "${correctedSegmentTargeted}", correcting to "${segment}"`);
        correctedSegmentTargeted = segment;
      }
      
      return {
        id: prop.id || `prop-${idx + 1}`,
        label: prop.label,
        statement: prop.statement || '',
        segmentTargeted: correctedSegmentTargeted, // Always use the correct segment
        primaryJob: prop.primaryJob || (allCustomerJobs.length > 0 ? allCustomerJobs[0].text : primaryJob.text),
        coreOutcome: prop.coreOutcome || prioritizedGains[0].text,
        keyPainsRelieved: prop.keyPainsRelieved || prioritizedPains.map(p => p.id),
        keyGainsCreated: prop.keyGainsCreated || prioritizedGains.map(g => g.id),
        competitiveContrast: prop.competitiveContrast || '',
        measurableImpact: prop.measurableImpact || 'Qualitative: designed to help address key customer pains and support desired gains.',
        assumptions: prop.assumptions || [],
      };
    });
  } catch (error) {
    console.error('Failed to parse AI propositions:', error);
    return null;
  }
}

export function generateFallbackPropositions(
  canvas: ValuePropositionCanvas,
  userInput: UserInput
): ValuePropositionStatement[] {
  let prioritizedPains = canvas.customerPains.filter(p => p.isPrioritized).slice(0, 3);
  let prioritizedGains = canvas.customerGains.filter(g => g.isPrioritized).slice(0, 3);
  
  if (prioritizedPains.length < 3) {
    // Use first 3 pains if not enough prioritized
    prioritizedPains = canvas.customerPains.slice(0, 3);
  }
  if (prioritizedGains.length < 3) {
    // Use first 3 gains if not enough prioritized
    prioritizedGains = canvas.customerGains.slice(0, 3);
  }
  
  // Use different jobs for variation if available
  const allJobs = canvas.customerJobs;
  const primaryJobId = canvas.primaryJobId || (canvas.customerJobs.length > 0 ? canvas.customerJobs[0].id : undefined);
  const mainJob = canvas.customerJobs.find(j => j.id === primaryJobId) || canvas.customerJobs[0];
  const job2 = allJobs.length > 1 ? allJobs[1] : mainJob;
  const job3 = allJobs.length > 2 ? allJobs[2] : (allJobs.length > 1 ? allJobs[1] : mainJob);
  
  // Use canvas segment (single, focused) - prioritize userInput.primarySegment if available
  const segment = userInput.primarySegment || canvas.segment || (userInput.targetDecisionMaker ? `${userInput.targetDecisionMaker} in organizations` : 'Target customers');
  const alternatives = canvas.alternatives || [];
  const propositions: ValuePropositionStatement[] = [];
  const alternative = alternatives.length > 0 ? alternatives[0] : 'current alternatives';

  // Get product/service description
  const productService = canvas.productsServices.length > 0 
    ? canvas.productsServices[0].text 
    : userInput.productName;

  // Detect product type and get appropriate statement prefix
  const productType = userInput.productType || detectProductType(userInput.productName, userInput.description);
  const statementPrefix = getStatementPrefix(productService, productType);
  
  // Helper to determine verb agreement based on prefix
  const getVerbAgreement = (prefix: string, productName: string): string => {
    const lowerPrefix = prefix.toLowerCase();
    // "We" always uses "help"
    if (lowerPrefix === 'we') return 'help';
    // If prefix is "Our [product]", check if product name is plural
    if (lowerPrefix.startsWith('our ')) {
      const productPart = lowerPrefix.replace('our ', '');
      return productPart.endsWith('s') ? 'help' : 'helps';
    }
    // If prefix is a company name (not starting with "Our"), treat as singular unless it ends with 's'
    return lowerPrefix.endsWith('s') ? 'help' : 'helps';
  };
  
  const verbForm = getVerbAgreement(statementPrefix, productService);

  // Proposition 1: Pain-focused (uses job 1, pain 1, gain 1)
  const painVerb = 'reducing';
  const gainVerb = 'enabling';
  propositions.push({
    id: 'prop-1',
    label: 'Pain-focused value proposition',
    statement: `${statementPrefix} ${verbForm} ${segment.toLowerCase()} who want to ${mainJob.text.toLowerCase()} by ${gainVerb} ${prioritizedGains[0].text.toLowerCase()} and want to ${painVerb} ${prioritizedPains[0].text.toLowerCase()}, unlike ${alternative}.`,
    segmentTargeted: segment,
    primaryJob: mainJob.text,
    coreOutcome: prioritizedGains[0].text,
    keyPainsRelieved: [prioritizedPains[0].id],
    keyGainsCreated: [prioritizedGains[0].id],
    competitiveContrast: `${userInput.productName} is designed specifically for ${prioritizedPains[0].text.toLowerCase()}, whereas ${alternative} often serves broader applications.`,
    measurableImpact: 'Qualitative: designed to help address key customer pains and support desired gains.',
    assumptions: [
      `Customers experience ${prioritizedPains[0].text.toLowerCase()}`,
      `Customers value ${prioritizedGains[0].text.toLowerCase()}`,
    ],
  });

  // Proposition 2: Gain-focused (uses job 2 if available, pain 2, gain 2)
  const gainVerb2 = 'creating';
  const painVerb2 = 'avoiding';
  propositions.push({
    id: 'prop-2',
    label: 'Gain-focused value proposition',
    statement: `${statementPrefix} ${verbForm} ${segment.toLowerCase()} who want to ${job2.text.toLowerCase()} by ${gainVerb2} ${prioritizedGains[1].text.toLowerCase()} and want to ${painVerb2} ${prioritizedPains[1].text.toLowerCase()}, unlike ${alternative}.`,
    segmentTargeted: segment,
    primaryJob: job2.text,
    coreOutcome: prioritizedGains[1].text,
    keyPainsRelieved: [prioritizedPains[1].id],
    keyGainsCreated: [prioritizedGains[1].id],
    competitiveContrast: `${userInput.productName} is designed specifically to support ${prioritizedGains[1].text.toLowerCase()}, whereas ${alternative} often serves broader applications.`,
    measurableImpact: 'Qualitative: designed to help improve outcomes for this segment.',
    assumptions: [
      `Customers seek ${prioritizedGains[1].text.toLowerCase()}`,
      `Current alternatives do not adequately address ${prioritizedPains[1].text.toLowerCase()}`,
    ],
  });

  // Proposition 3: Balanced (uses job 3 if available, pain 3, gain 3)
  const gainVerb3 = 'supporting';
  const painVerb3 = 'minimizing';
  propositions.push({
    id: 'prop-3',
    label: 'Balanced value proposition',
    statement: `${statementPrefix} ${verbForm} ${segment.toLowerCase()} who want to ${job3.text.toLowerCase()} by ${gainVerb3} ${prioritizedGains[2].text.toLowerCase()} and want to ${painVerb3} ${prioritizedPains[2].text.toLowerCase()}, unlike ${alternative}.`,
    segmentTargeted: segment,
    primaryJob: job3.text,
    coreOutcome: `${prioritizedGains[0].text} and ${prioritizedGains[1].text}`,
    keyPainsRelieved: prioritizedPains.map(p => p.id),
    keyGainsCreated: prioritizedGains.map(g => g.id),
    competitiveContrast: `${userInput.productName} is designed specifically for this segment's needs, whereas ${alternative} often serves broader applications.`,
    measurableImpact: 'Qualitative: designed to help address multiple pains and gains for this segment.',
    assumptions: [
      `Customers need to ${mainJob.text.toLowerCase()}`,
      `Multiple pains and gains are relevant to this segment`,
    ],
  });

  return propositions;
}
