import { ValuePropositionCanvas, ProspectSegment } from '@/types';
import { callOpenAI } from './openai';

export async function generateProspectUniverse(canvas: ValuePropositionCanvas): Promise<ProspectSegment[]> {
  const segments: ProspectSegment[] = [];

  // Group pains by intensity and category
  const prioritizedPains = canvas.customerPains.filter(p => p.isPrioritized);

  // Try to use OpenAI for better prospect universe generation
  const aiSegments = await generateUniverseWithAI(canvas, prioritizedPains);
  
  if (aiSegments && aiSegments.length > 0) {
    return aiSegments;
  }

  // Fallback to template-based generation
  return generateFallbackUniverse(canvas, prioritizedPains);
}

export async function generateUniverseWithAI(
  canvas: ValuePropositionCanvas,
  prioritizedPains: any[]
): Promise<ProspectSegment[] | null> {
  const segment = canvas.segment || 'Target customers';
  const primaryJob = canvas.customerJobs.find(j => j.id === canvas.primaryJobId) || canvas.customerJobs[0];
  
  const systemPrompt = `You are a senior strategist implementing a value mapping framework, and you must apply these rules to ANY industry (e.g., SaaS, healthcare, logistics, industrials, finance, consulting, manufacturing, hardware, education, cybersecurity, biotech, energy, HR tech).

GLOBAL RULES:
1) One canvas must focus on ONE segment only. Never mix user types or buyer types.
2) Do not invent product capabilities, technologies, or numerical results.
3) Use qualitative language if numerical proof is not explicitly provided.
4) Competitive contrast must reference REAL alternatives found in research or user inputs. Never make up vague comparisons such as "better than spreadsheets" unless spreadsheets are clearly relevant.
5) Emotional language must NOT appear in Jobs. Emotional concerns belong in Pains.

PROSPECT UNIVERSE:
- Must match the same segment as the value proposition. Never broaden the segment after the fact.
- Buying triggers must be business events (budget cycle, regulation, audits, leadership change, cost pressure, workflow failure, shutdown, expansion, merger, pilot test, technology refresh).
- Avoid emotional triggers. Focus on events that force action.

FORMAT RULES:
- Use concise, precise language. Avoid hype, clichés, and slogans.
- Never use phrases like "game changer," "revolutionary," "unlock potential," "disruptive."
- Always prefer practical wording: "reliable," "supports," "helping teams reduce," "specialized for," "designed to assist with."`;

  const prompt = `Convert the following value proposition canvas into ONE targetable prospect segment for LinkedIn and B2B marketing.

IMPORTANT: Generate ONE segment that aligns with the value proposition's target segment. Do not mix different user types (e.g., clinical users vs. administrative buyers).

SEGMENT (single, focused):
${segment}

PRIMARY JOB-TO-BE-DONE:
${primaryJob ? primaryJob.text : 'Not specified'}

Customer Jobs:
${canvas.customerJobs.map(j => `- ${j.text} (${j.type})`).join('\n')}

Prioritized Pains:
${prioritizedPains.map((p, i) => `${i + 1}. ${p.text}`).join('\n')}

Customer Gains:
${canvas.customerGains.map(g => `- ${g.text}`).join('\n')}

Generate ONE prospect segment aligned with the segment above. Provide:
- Specific LinkedIn job titles (8-12 titles) - must match the segment (e.g., if segment is "neurosurgeons", include neurosurgeon titles, not hospital admins)
- Relevant industries (5-7 industries) - must be realistic for the segment (e.g., neurosurgeons work in "Hospital & Health Care", "Higher Education", not "Medical Devices" companies)
- Company size ranges (e.g., "50-200", "200-1000", "1000+")
- Buying triggers (6-8 specific business events - budget cycle, regulation, audits, leadership change, cost pressure, workflow failure, shutdown, expansion, merger, pilot test, technology refresh. Avoid emotional triggers.)
- Tools likely in their stack (5-8 tools) - List tool CATEGORIES (e.g., "Surgical microscopes (e.g., Zeiss)", "Navigation systems (e.g., Brainlab)") rather than specific competitor brands. Only list specific brands if they are industry-standard equipment categories, not direct product substitutes.
- Keywords for targeting (10-15 keywords)
- Hashtags they follow (8-10 hashtags)
- Industry events they attend (3-5 events)

Return a JSON object with this structure:
{
  "name": "Segment name aligned with value proposition",
  "jobTitles": ["title1", "title2", ...],
  "industries": ["industry1", "industry2", ...],
  "companySize": ["50-200", "200-1000", "1000+"],
  "buyingTriggers": ["trigger1", "trigger2", ...],
  "toolsInStack": ["tool category1 (e.g., brand)", "tool category2 (e.g., brand)", ...],
  "keywords": ["keyword1", "keyword2", ...],
  "hashtags": ["hashtag1", "hashtag2", ...],
  "events": ["event1", "event2", ...]
}

Be specific and realistic. Ensure job titles and industries match the segment. Return ONLY valid JSON object, no markdown formatting.`;

  const response = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ], {
    temperature: 0.6,
    maxTokens: 2500,
    response_format: { type: 'json_object' },
  });

  if (!response) {
    return null;
  }

  try {
    const parsed = typeof response === 'string' ? JSON.parse(response) : response;
    
    // Handle both single object and array responses
    const segments = Array.isArray(parsed) ? parsed : [parsed];
    
    if (segments.length === 0) {
      return null;
    }

    return segments.map((seg: any, idx: number) => ({
      id: `segment-${idx + 1}`,
      name: seg.name || `Segment ${idx + 1}`,
      jobTitles: Array.isArray(seg.jobTitles) ? seg.jobTitles : [],
      industries: Array.isArray(seg.industries) ? seg.industries : [],
      companySize: Array.isArray(seg.companySize) ? seg.companySize : ['50-200', '200-1000', '1000+'],
      buyingTriggers: Array.isArray(seg.buyingTriggers) ? seg.buyingTriggers : [],
      toolsInStack: Array.isArray(seg.toolsInStack) ? seg.toolsInStack : [],
      keywords: Array.isArray(seg.keywords) ? seg.keywords : [],
      hashtags: Array.isArray(seg.hashtags) ? seg.hashtags : [],
      events: Array.isArray(seg.events) ? seg.events : [],
    }));
  } catch (error) {
    console.error('Failed to parse AI universe:', error);
    return null;
  }
}

// NOTE: This is a generic, last-resort fallback for prospect universe generation.
// It does not guarantee a perfect match to the canvas segment and is only used when the AI call fails.
export function generateFallbackUniverse(
  canvas: ValuePropositionCanvas,
  prioritizedPains?: any[]
): ProspectSegment[] {
  const pains = prioritizedPains || canvas.customerPains.slice(0, 3);
  const segments: ProspectSegment[] = [];

  // Create segments based on pain clusters
  pains.forEach((pain, idx) => {
    const segment: ProspectSegment = {
      id: `segment-${idx + 1}`,
      name: `Segment ${idx + 1}: ${pain.text.substring(0, 50)}...`,
      jobTitles: generateJobTitles(canvas, pain),
      industries: generateIndustries(canvas, pain),
      companySize: ['50-200', '200-1000', '1000+'],
      buyingTriggers: generateBuyingTriggers(canvas, pain),
      toolsInStack: generateToolsInStack(canvas, pain),
      keywords: generateKeywords(canvas, pain),
      hashtags: generateHashtags(canvas, pain),
      events: generateEvents(canvas, pain),
    };
    segments.push(segment);
  });

  // If we have fewer than 3 segments, create additional ones based on jobs
  if (segments.length < 3) {
    canvas.customerJobs.slice(0, 3 - segments.length).forEach((job, idx) => {
      const segment: ProspectSegment = {
        id: `segment-job-${idx + 1}`,
        name: `Segment: ${job.text.substring(0, 50)}...`,
        jobTitles: generateJobTitlesFromJob(canvas, job),
        industries: generateIndustriesFromJob(canvas, job),
        companySize: ['50-200', '200-1000', '1000+'],
        buyingTriggers: generateBuyingTriggersFromJob(canvas, job),
        toolsInStack: generateToolsInStackFromJob(canvas, job),
        keywords: generateKeywordsFromJob(canvas, job),
        hashtags: generateHashtagsFromJob(canvas, job),
        events: generateEventsFromJob(canvas, job),
      };
      segments.push(segment);
    });
  }

  return segments.slice(0, 3);
}

function generateJobTitles(canvas: ValuePropositionCanvas, pain: any): string[] {
  // Extract job titles from context or generate based on pain
  const baseTitles = [
    'VP of Operations',
    'Director of Operations',
    'Operations Manager',
    'Head of Operations',
    'Chief Operating Officer',
  ];

  // Add variations based on pain category
  if (pain.category === 'financial') {
    return [
      'CFO',
      'VP of Finance',
      'Finance Director',
      'Financial Controller',
      'Head of Finance',
    ];
  }

  return baseTitles;
}

function generateJobTitlesFromJob(canvas: ValuePropositionCanvas, job: any): string[] {
  // Jobs are now modeled as functional-only in this app, so we delegate to the generic title generator.
  return generateJobTitles(canvas, {});
}

function generateIndustries(canvas: ValuePropositionCanvas, pain: any): string[] {
  return [
    'Technology',
    'Professional Services',
    'Manufacturing',
    'Healthcare',
    'Financial Services',
    'Retail',
    'E-commerce',
  ];
}

function generateIndustriesFromJob(canvas: ValuePropositionCanvas, job: any): string[] {
  return generateIndustries(canvas, {});
}

function generateBuyingTriggers(canvas: ValuePropositionCanvas, pain: any): string[] {
  return [
    'Company is scaling rapidly',
    'New compliance requirements',
    'Current solution is failing',
    'Budget approval for new tools',
    'Team expansion',
    'Merger or acquisition',
    'New leadership',
    'Performance issues with current process',
  ];
}

function generateBuyingTriggersFromJob(canvas: ValuePropositionCanvas, job: any): string[] {
  return generateBuyingTriggers(canvas, {});
}

function generateToolsInStack(canvas: ValuePropositionCanvas, pain: any): string[] {
  return [
    'Excel',
    'Google Sheets',
    'Slack',
    'Asana',
    'Trello',
    'Jira',
    'Salesforce',
    'HubSpot',
  ];
}

function generateToolsInStackFromJob(canvas: ValuePropositionCanvas, job: any): string[] {
  return generateToolsInStack(canvas, {});
}

function generateKeywords(canvas: ValuePropositionCanvas, pain: any): string[] {
  const keywords: string[] = [];
  
  // Extract keywords from pain text
  const words = pain.text.toLowerCase().split(/\s+/);
  words.forEach((word: string) => {
    if (word.length > 4 && !['that', 'this', 'with', 'from', 'their'].includes(word)) {
      keywords.push(word);
    }
  });

  // Add common B2B keywords
  keywords.push('operations', 'efficiency', 'automation', 'productivity', 'management');

  return [...new Set(keywords)].slice(0, 15);
}

function generateKeywordsFromJob(canvas: ValuePropositionCanvas, job: any): string[] {
  const keywords: string[] = [];
  
  const words = job.text.toLowerCase().split(/\s+/);
  words.forEach((word: string) => {
    if (word.length > 4 && !['that', 'this', 'with', 'from', 'their'].includes(word)) {
      keywords.push(word);
    }
  });

  keywords.push('operations', 'management', 'strategy', 'execution');

  return [...new Set(keywords)].slice(0, 15);
}

function generateHashtags(canvas: ValuePropositionCanvas, pain: any): string[] {
  return [
    'operations',
    'productivity',
    'automation',
    'efficiency',
    'management',
    'leadership',
    'business',
    'strategy',
  ];
}

function generateHashtagsFromJob(canvas: ValuePropositionCanvas, job: any): string[] {
  return generateHashtags(canvas, {});
}

function generateEvents(canvas: ValuePropositionCanvas, pain: any): string[] {
  return [
    'Operations Summit',
    'Business Transformation Conference',
    'Productivity Expo',
    'Management Leadership Forum',
  ];
}

function generateEventsFromJob(canvas: ValuePropositionCanvas, job: any): string[] {
  return generateEvents(canvas, {});
}

/**
 * Add reachability metadata to prospect segments
 * This helps identify how easily each segment can be reached via marketing channels
 */
export async function addReachabilityToSegments(
  segments: ProspectSegment[]
): Promise<ProspectSegment[]> {
  // For now, this is a simple pass-through function
  // In the future, this could analyze:
  // - LinkedIn search availability for job titles
  // - Industry targeting options
  // - Event accessibility
  // - Digital presence indicators
  
  return segments.map(segment => ({
    ...segment,
    // Future: add reachabilityScore, channelAvailability, etc.
  }));
}
