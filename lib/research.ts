import axios from 'axios';
import * as cheerio from 'cheerio';
import { UserInput, ResearchData, ValuePropositionCanvas, CustomerJob, CustomerPain, CustomerGain, ProductService, PainReliever, GainCreator, ConfidenceLevel } from '@/types';
import { callOpenAI } from './openai';

// Step 1: Job-to-Be-Done identification
export interface JobToBeDone {
  text: string;
  type: 'functional';
}

// Step 2: Pain Intensity Cluster
export interface PainIntensityCluster {
  userGroup: string;
  specificPain: string;
  frequency: string;
  consequences: string;
}

export async function performWebSearch(query: string): Promise<string[]> {
  // In production, integrate with a real search API (Google Custom Search, SerpAPI, etc.)
  // For now, return mock data structure
  // You'll need to add API keys in environment variables
  try {
    // Example: Using a search API
    // const response = await axios.get(`https://api.example.com/search?q=${encodeURIComponent(query)}`);
    // return response.data.results.map((r: any) => r.snippet);
    
    // Mock implementation - replace with real API
    return [
      `Market research for ${query} shows common challenges in this space.`,
      `Industry reports indicate growing demand for solutions addressing ${query}.`,
    ];
  } catch (error) {
    console.error('Web search error:', error);
    return [];
  }
}

/**
 * Extract content from HTML and discover links
 */
function extractContentAndLinks(html: string, baseUrl: string): { content: string; links: string[] } {
  const $ = cheerio.load(html);
  
  // Remove script and style elements
  $('script, style, nav, footer, header').remove();
  
  // Extract main content
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  
  // Extract meta description
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  
  // Extract headings
  const headings = $('h1, h2, h3').map((_, el) => $(el).text()).get().join(' ');
  
  // Extract page title
  const title = $('title').text() || '';
  
  const content = `${title} ${metaDescription} ${headings} ${text.substring(0, 3000)}`;
  
  // Discover links
  const links: string[] = [];
  const baseDomain = getBaseDomain(baseUrl);
  
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const normalized = normalizeUrl(href, baseUrl);
      if (normalized && normalized.startsWith(baseDomain)) {
        links.push(normalized);
      }
    }
  });
  
  return { content, links: [...new Set(links)] };
}

/**
 * Get the base domain from a URL
 */
function getBaseDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}`;
  } catch {
    return url;
  }
}

/**
 * Normalize URL to avoid duplicates
 */
function normalizeUrl(url: string, baseUrl: string): string | null {
  try {
    // Handle relative URLs
    if (url.startsWith('/')) {
      const base = new URL(baseUrl);
      return new URL(url, base.origin).href;
    }
    
    // Handle absolute URLs
    const urlObj = new URL(url);
    const baseUrlObj = new URL(baseUrl);
    
    // Only return if same domain
    if (urlObj.hostname === baseUrlObj.hostname) {
      // Remove hash and normalize
      urlObj.hash = '';
      return urlObj.href;
    }
    
    return null;
  } catch {
    return null;
  }
}


/**
 * Scrape website by exploring multiple pages
 * Crawls internal links to gather comprehensive content
 * Limited to 2-page depth: homepage (depth 0) + pages linked from homepage (depth 1)
 */
export async function scrapeWebsite(url: string, maxDepth: number = 1, signal?: AbortSignal): Promise<string> {
  const visited = new Set<string>();
  const urlDepths = new Map<string, number>(); // Track depth of each URL
  const toVisit: Array<{ url: string; depth: number }> = [{ url, depth: 0 }];
  const allContent: string[] = [];
  const baseDomain = getBaseDomain(url);
  const MAX_PAGES = 15; // Limit total pages to crawl
  const MAX_LINKS_PER_PAGE = 10; // Limit links discovered per page
  
  console.log(`Starting website crawl for ${url} (max depth: ${maxDepth}, max pages: ${MAX_PAGES})`);
  
  while (toVisit.length > 0 && visited.size < MAX_PAGES) {
    // Check if cancelled
    if (signal?.aborted) {
      console.log('Crawl cancelled via AbortSignal');
      break;
    }
    
    const current = toVisit.shift();
    
    if (!current) continue;
    
    const { url: currentUrl, depth } = current;
    
    // Skip if already visited or exceeds max depth
    if (visited.has(currentUrl) || depth > maxDepth) {
      continue;
    }
    
    // Stop if we've reached max pages
    if (visited.size >= MAX_PAGES) {
      console.log(`Reached maximum page limit (${MAX_PAGES}), stopping crawl`);
      break;
    }
    
    visited.add(currentUrl);
    urlDepths.set(currentUrl, depth);
    console.log(`Scraping page (depth ${depth}): ${currentUrl}`);
    
    try {
      // Fetch the page
      const response = await axios.get(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 8000, // Reduced timeout
        signal, // Support AbortSignal
      });
      
      // Extract content and discover links in one pass
      const { content, links } = extractContentAndLinks(response.data, currentUrl);
      
      if (content) {
        allContent.push(content);
      }
      
      // Only discover links if we haven't reached max depth
      if (depth < maxDepth && visited.size < MAX_PAGES) {
        // Limit the number of links we process per page
        const linksToProcess = links.slice(0, MAX_LINKS_PER_PAGE);
        
        // Add new links to visit queue (only at next depth level)
        for (const link of linksToProcess) {
          // Stop if we've reached max pages
          if (visited.size >= MAX_PAGES || toVisit.length >= MAX_PAGES) {
            break;
          }
          
          if (!visited.has(link) && !toVisit.some(item => item.url === link)) {
            // Prioritize important pages (about, features, pricing, product, solution, etc.)
            const importantKeywords = ['about', 'features', 'pricing', 'product', 'solution', 'how-it-works', 'benefits', 'use-cases'];
            const isImportant = importantKeywords.some(keyword => 
              link.toLowerCase().includes(keyword)
            );
            
            const nextDepth = depth + 1;
            const newItem = { url: link, depth: nextDepth };
            
            if (isImportant) {
              toVisit.unshift(newItem); // Add to front of queue
            } else {
              toVisit.push(newItem); // Add to back of queue
            }
          }
        }
      }
      
      // Small delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 300)); // Reduced delay
      
    } catch (error: any) {
      // Don't log AbortError as it's expected when cancelled
      if (error.name !== 'AbortError' && error.name !== 'CanceledError') {
        console.error(`Error processing ${currentUrl}:`, error);
      }
      continue;
    }
  }
  
  console.log(`Completed crawl: ${visited.size} pages scraped (max depth: ${maxDepth})`);
  
  // Combine all content
  const combinedContent = allContent.join(' ');
  
  // Limit total content size to avoid token limits
  return combinedContent.substring(0, 50000);
}

/**
 * Step 1: Identify the Job-to-Be-Done
 * Uses product name and paragraph description to identify core jobs
 */
export async function identifyJobToBeDone(input: UserInput): Promise<JobToBeDone[]> {
  const systemPrompt = `You are a senior strategist implementing a value mapping framework, and you must apply these rules to ANY industry (e.g., SaaS, healthcare, logistics, industrials, finance, consulting, manufacturing, hardware, education, cybersecurity, biotech, energy, HR tech).

GLOBAL RULES:
1) One canvas must focus on ONE segment only. Never mix user types or buyer types.
2) Do not invent product capabilities, technologies, or numerical results.
3) Use qualitative language if numerical proof is not explicitly provided.
4) Competitive contrast must reference REAL alternatives found in research or user inputs. Never make up vague comparisons such as "better than spreadsheets" unless spreadsheets are clearly relevant.
5) Emotional language must NOT appear in Jobs. Emotional concerns belong in Pains.

CUSTOMER JOBS (functional, not emotional):
- Write Jobs as tasks users need to accomplish or outcomes they seek (functional, operational, practical).
- Do NOT include emotions, stress, anxiety, fear, recognition, confidence, status, or reputation in Jobs.
- CRITICAL: If a Job contains words like stress, anxiety, worry, confidence, fear, or reputation → it belongs in Pains, not Jobs.
- Always include at least one primary functional job.
- Examples of GOOD Jobs: "Safely access the dura mater", "Effectively repair dural tears", "Complete surgical procedures"
- Examples of BAD Jobs (emotional - belongs in Pains): "Reduce stress about complications", "Build confidence in procedures", "Avoid anxiety about mastering procedures"

Return a JSON array with this structure:
[
  {
    "text": "Job statement from user's perspective (functional, operational, practical task or outcome)",
    "type": "functional"
  },
  ...
]

Return ONLY valid JSON array, no markdown formatting.`;

  const prompt = `Analyze the following product/service and identify the core job-to-be-done that motivates people to use a tool like this.

Product Name: ${input.productName}
Product Description: ${input.description}

Identify 4–6 variants of the job phrased from the user's point of view.
- Jobs must be functional, operational, practical tasks or outcomes.
- Do NOT include emotions, stress, anxiety, fear, recognition, confidence, status, or reputation in Jobs.
- Set "type" to "functional" for all jobs.

Return ONLY valid JSON array, no markdown formatting.`;

  const response = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ], {
    temperature: 0.7,
    maxTokens: 2000,
  });

  if (!response) {
    // Fallback to basic functional jobs only
    const descSnippet = input.description.substring(0, 100);
    return [
      {
        text: `Complete ${descSnippet}...`,
        type: 'functional' as const,
      },
      {
        text: `Manage ${descSnippet.toLowerCase()}... more reliably and consistently`,
        type: 'functional' as const,
      },
    ];
  }

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const descSnippet = input.description.substring(0, 100);
      return [
        {
          text: `Complete ${descSnippet}...`,
          type: 'functional' as const,
        },
      ];
    }

    return parsed.map((job: any) => ({
      text: job.text || '',
      type: 'functional' as const,
    })).filter((job: JobToBeDone) => job.text.length > 0);
  } catch (error) {
    console.error('Failed to parse job-to-be-done:', error);
    const descSnippet = input.description.substring(0, 100);
    return [
      {
        text: `Complete ${descSnippet}...`,
        type: 'functional' as const,
      },
    ];
  }
}

/**
 * Step 2: Identify Pain Intensity Clusters
 * Based on the identified job-to-be-done
 */
export async function identifyPainIntensityClusters(
  jobs: JobToBeDone[],
  input: UserInput
): Promise<PainIntensityCluster[]> {
  const jobsText = jobs.map(j => `- ${j.text} (${j.type})`).join('\n');
  
  const systemPrompt = `You are a senior strategist implementing a value mapping framework, and you must apply these rules to ANY industry (e.g., SaaS, healthcare, logistics, industrials, finance, consulting, manufacturing, hardware, education, cybersecurity, biotech, energy, HR tech).

GLOBAL RULES:
1) One canvas must focus on ONE segment only. Never mix user types or buyer types.
2) Do not invent product capabilities, technologies, or numerical results.
3) Use qualitative language if numerical proof is not explicitly provided.
4) Competitive contrast must reference REAL alternatives found in research or user inputs. Never make up vague comparisons such as "better than spreadsheets" unless spreadsheets are clearly relevant.
5) Emotional language must NOT appear in Jobs. Emotional concerns belong in Pains.

CUSTOMER PAINS (emotional + risk + operational):
- Emotional concerns (stress, fear, anxiety, pressure, reputation risk) belong here.
- Include operational and financial risks that result from failure to complete the job well.
- Include at least one concrete, real-world pain tied to failure of the job (e.g., delays, errors, rework, downtime, compliance failure, quality issues, audit issues, safety risks).
- Do NOT restate jobs as pains.`;

  const prompt = `Based on the following job-to-be-done, identify user groups who experience this job most intensely.

Jobs-to-Be-Done:
${jobsText}

Product: ${input.productName}
Target Decision Maker: ${input.primarySegment || input.targetDecisionMaker || 'Target users'}

Identify 8–10 user groups who experience this job-to-be-done most intensely.

For each group, describe:
- the specific pain they feel (emotional concerns, operational risks, financial risks, or concrete failures like delays, errors, rework, downtime, compliance failure, quality issues, audit issues, safety risks)
- how frequently the pain occurs
- the operational or financial consequences of not solving it

IMPORTANT:
- Do NOT restate jobs as pains.
- Include emotional concerns (stress, fear, anxiety, pressure, reputation risk) in pains, not in jobs.
- Include at least one concrete, real-world pain tied to failure of the job.

Return a JSON array with this structure:
[
  {
    "userGroup": "Specific user group description",
    "specificPain": "The specific pain they feel (emotional, operational, or financial risk/failure)",
    "frequency": "How frequently the pain occurs (e.g., daily, weekly, monthly, during specific events)",
    "consequences": "Operational or financial consequences of not solving it"
  },
  ...
]

Be specific and realistic. Focus on real pain points with measurable consequences. Return ONLY valid JSON array, no markdown formatting.`;

  const response = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ], {
    temperature: 0.6,
    maxTokens: 3000,
  });

  if (!response) {
    const fallbackTarget = input.targetDecisionMaker || input.primarySegment || 'decision makers';
    // Fallback clusters
    return [
      {
        userGroup: `${fallbackTarget} in growing companies`,
        specificPain: `Struggling to manage ${input.description.substring(0, 50)}...`,
        frequency: 'Daily',
        consequences: 'Reduced productivity and increased operational costs',
      },
    ];
  }

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    const fallbackTarget = input.targetDecisionMaker || input.primarySegment || 'decision makers';
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [
        {
          userGroup: `${fallbackTarget} in growing companies`,
          specificPain: `Struggling to manage ${input.description.substring(0, 50)}...`,
          frequency: 'Daily',
          consequences: 'Reduced productivity and increased operational costs',
        },
      ];
    }

    return parsed.map((cluster: any) => ({
      userGroup: cluster.userGroup || '',
      specificPain: cluster.specificPain || '',
      frequency: cluster.frequency || 'Unknown',
      consequences: cluster.consequences || '',
    })).filter((cluster: PainIntensityCluster) => 
      cluster.userGroup.length > 0 && cluster.specificPain.length > 0
    );
  } catch (error) {
    console.error('Failed to parse pain intensity clusters:', error);
    const fallbackTarget = input.targetDecisionMaker || input.primarySegment || 'decision makers';
    return [
      {
        userGroup: `${fallbackTarget} in growing companies`,
        specificPain: `Struggling to manage ${input.description.substring(0, 50)}...`,
        frequency: 'Daily',
        consequences: 'Reduced productivity and increased operational costs',
      },
    ];
  }
}

export async function conductResearch(input: UserInput): Promise<ResearchData> {
  const searchQueries = [
    `${input.productName} market`,
    `${input.targetDecisionMaker} challenges`,
    `${input.productName} alternatives`,
    `${input.targetDecisionMaker} pain points`,
  ];

  // Use getWebsiteContent which includes caching
  const websiteContent = await getWebsiteContent(input);

  const searchResults = await Promise.all(
    searchQueries.map(q => performWebSearch(q))
  );
  const allResults = searchResults.flat();

  // Combine all research data
  const combinedText = `${input.description} ${websiteContent} ${allResults.join(' ')}`;

  // Try to use OpenAI for better extraction, fallback to simple extraction
  const aiResult = await extractWithAI(combinedText, input);
  
  if (aiResult) {
    return {
      problemSpace: aiResult.problemSpace,
      typicalPains: aiResult.typicalPains,
      buyingTriggers: aiResult.buyingTriggers,
      competitiveAlternatives: aiResult.competitiveAlternatives,
      source: input.websiteUrl || 'web research',
    };
  }

  // Fallback to simple extraction
  const problemSpace = extractProblemSpace(combinedText, input);
  const typicalPains = extractPains(combinedText, input);
  const buyingTriggers = extractBuyingTriggers(combinedText, input);
  const competitiveAlternatives = extractAlternatives(combinedText, input);

  return {
    problemSpace,
    typicalPains,
    buyingTriggers,
    competitiveAlternatives,
    source: input.websiteUrl || 'web research',
  };
}

// Simple in-memory cache for website content (TTL: 5 minutes)
interface CacheEntry {
  content: string;
  timestamp: number;
}

const websiteContentCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

function getCachedContent(url: string): string | null {
  const entry = websiteContentCache.get(url);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.content;
  }
  if (entry) {
    // Expired entry, remove it
    websiteContentCache.delete(url);
  }
  return null;
}

function setCachedContent(url: string, content: string): void {
  websiteContentCache.set(url, {
    content,
    timestamp: Date.now(),
  });
}

/**
 * Export website content for use in canvas generation
 * Uses caching to avoid re-scraping the same URL within 5 minutes
 */
export async function getWebsiteContent(input: UserInput, signal?: AbortSignal): Promise<string> {
  if (!input.websiteUrl) {
    return '';
  }

  // Check cache first
  const cachedContent = getCachedContent(input.websiteUrl);
  if (cachedContent) {
    console.log(`Using cached website content for ${input.websiteUrl}`);
    return cachedContent;
  }

  // Scrape and cache
  const content = await scrapeWebsite(input.websiteUrl, 1, signal);
  setCachedContent(input.websiteUrl, content);
  return content;
}

export async function extractWithAI(text: string, input: UserInput): Promise<ResearchData | null> {
  const prompt = `You are a market research analyst. Analyze the following information about a product/service and extract key insights.

Product: ${input.productName}
Description: ${input.description}
Target Decision Maker: ${input.targetDecisionMaker}
Research Data: ${text.substring(0, 8000)}

Extract and return a JSON object with the following structure:
{
  "problemSpace": "A 2-3 sentence description of the problem space and market context",
  "typicalPains": ["pain 1", "pain 2", "pain 3", ...] (8-10 specific customer pain points),
  "buyingTriggers": ["trigger 1", "trigger 2", ...] (6-8 events that trigger purchases),
  "competitiveAlternatives": ["alternative 1", "alternative 2", ...] (6-8 current alternatives customers use)
}

Be specific and avoid generic statements. Focus on real, actionable insights. Return ONLY valid JSON, no markdown formatting.`;

  const response = await callOpenAI([
    { role: 'system', content: 'You are a market research analyst expert in Jobs-to-Be-Done and Value Proposition Design.' },
    { role: 'user', content: prompt }
  ], {
    temperature: 0.3, // Lower temperature for more consistent extraction
    maxTokens: 3000, // Increased for comprehensive extraction
  });

  if (!response) {
    return null;
  }

  try {
    // Clean the response (remove markdown code blocks if present)
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    return {
      problemSpace: parsed.problemSpace || '',
      typicalPains: Array.isArray(parsed.typicalPains) ? parsed.typicalPains : [],
      buyingTriggers: Array.isArray(parsed.buyingTriggers) ? parsed.buyingTriggers : [],
      competitiveAlternatives: Array.isArray(parsed.competitiveAlternatives) ? parsed.competitiveAlternatives : [],
      source: input.websiteUrl || 'web research',
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return null;
  }
}

function extractProblemSpace(text: string, input: UserInput): string {
  // Simplified extraction - in production, use LLM
  return `The ${input.targetDecisionMaker} faces challenges in ${input.description.toLowerCase()}. Market research indicates growing complexity in this space.`;
}

function extractPains(text: string, input: UserInput): string[] {
  // Common pain patterns
  const painKeywords = ['frustration', 'challenge', 'difficulty', 'problem', 'issue', 'barrier', 'risk', 'cost', 'time', 'inefficient', 'struggle', 'pain', 'bottleneck', 'inefficiency'];
  const pains: string[] = [];
  
  // Extract based on keywords and context
  const sentences = text.split(/[.!?]+/);
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    if (painKeywords.some(keyword => lowerSentence.includes(keyword))) {
      const cleanSentence = sentence.trim();
      if (cleanSentence.length > 20 && cleanSentence.length < 200) {
        // Avoid duplicates
        if (!pains.some(p => p.toLowerCase() === cleanSentence.toLowerCase())) {
          pains.push(cleanSentence);
        }
      }
    }
  });

  // If we found few pains, add some contextual ones based on input
  if (pains.length < 3) {
    pains.push(
      `Managing ${input.description.toLowerCase()} is time-consuming`,
      `Lack of tools for effective ${input.description.toLowerCase()}`,
      `Difficulty tracking and measuring ${input.description.toLowerCase()} outcomes`,
    );
  }

  return pains.slice(0, 10);
}

function extractBuyingTriggers(text: string, input: UserInput): string[] {
  const triggerKeywords = ['scaling', 'growth', 'expansion', 'new', 'change', 'upgrade', 'compliance', 'deadline', 'budget', 'hiring'];
  const triggers: string[] = [];
  
  const sentences = text.split(/[.!?]+/);
  sentences.forEach(sentence => {
    if (triggerKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
      const cleanSentence = sentence.trim();
      if (cleanSentence.length > 20 && cleanSentence.length < 200) {
        triggers.push(cleanSentence);
      }
    }
  });

  return triggers.slice(0, 8);
}

function extractAlternatives(text: string, input: UserInput): string[] {
  const alternativeKeywords = ['alternative', 'competitor', 'solution', 'tool', 'software', 'platform', 'service', 'manual', 'spreadsheet'];
  const alternatives: string[] = [];
  
  const sentences = text.split(/[.!?]+/);
  sentences.forEach(sentence => {
    if (alternativeKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
      const cleanSentence = sentence.trim();
      if (cleanSentence.length > 20 && cleanSentence.length < 200) {
        alternatives.push(cleanSentence);
      }
    }
  });

  return alternatives.slice(0, 8);
}

/**
 * Generate Customer Gains using AI based on product context
 */
export async function generateCustomerGains(
  input: UserInput,
  jobs?: JobToBeDone[],
  painClusters?: PainIntensityCluster[],
  websiteContent?: string,
  researchData?: ResearchData
): Promise<CustomerGain[]> {
  // Extract key information from description without using the full text
  const descriptionSummary = input.description.split(/[.!?]/)[0].substring(0, 100) || input.description.substring(0, 100);
  
  // Get segment context
  const segment = input.primarySegment || input.targetDecisionMaker || 'target customers';
  
  const systemPrompt = `You are a senior strategist implementing a value mapping framework, and you must apply these rules to ANY industry (e.g., SaaS, healthcare, logistics, industrials, finance, consulting, manufacturing, hardware, education, cybersecurity, biotech, energy, HR tech).

GLOBAL RULES:
1) One canvas must focus on ONE segment only. Never mix user types or buyer types.
2) Do not invent product capabilities, technologies, or numerical results.
3) Use qualitative language if numerical proof is not explicitly provided.
4) Competitive contrast must reference REAL alternatives found in research or user inputs. Never make up vague comparisons such as "better than spreadsheets" unless spreadsheets are clearly relevant.
5) Emotional language must NOT appear in Jobs. Emotional concerns belong in Pains.

CUSTOMER GAINS (outcomes, efficiency, recognition):
- Gains must be OUTCOME-BASED (noun statements), not verb-based actions.
- Use noun-based outcomes: "Shorter recovery times after surgery" NOT "Accelerate patient recovery times"
- Use noun-based outcomes: "More consistent surgical precision and clinical results" NOT "Enhance surgical precision and outcomes"
- Include functional results (fewer errors, faster flow, smoother adoption) as outcomes.
- Include recognition or team trust only as a social gain.
- DO NOT repeat the product description.
- DO NOT use phrases like "save time on [product description]".
- Each gain should be a SHORT, specific outcome (max 10-12 words).
- Focus on what the customer achieves (as a result/outcome), not what the product does.
- Avoid vague gains like "increase efficiency" without specifying the context.
- RULE: Gains should be noun-based outcomes, not verbs. Examples: "Reduced neurosurgical procedure errors" (good), "Reduce neurosurgical procedure errors" (bad - verb-based).

SEGMENT-SPECIFIC GAINS:
- Gains must be relevant to the specific customer segment provided
- Consider the segment's unique context, industry, role, and challenges
- Gains should reflect outcomes that matter to THIS specific segment, not generic benefits
- Use the segment's jobs, pains, and context to identify what gains would be most valuable to them

Return a JSON array with this structure:
[
  {
    "text": "Short specific gain (5-12 words max)",
    "type": "required" | "expected" | "desired" | "unexpected"
  },
  ...
]

Return ONLY valid JSON array, no markdown formatting.`;

  const prompt = `Based on the following product and customer segment, identify 5-6 customer gains (benefits/outcomes).

CUSTOMER SEGMENT (CRITICAL - tailor gains to this specific segment):
${segment}

Product Name: ${input.productName}
What it does: ${descriptionSummary}

${jobs && jobs.length > 0 ? `CUSTOMER JOBS (context for what this segment is trying to accomplish):
${JSON.stringify(jobs.map(j => j.text), null, 2)}` : ''}

${websiteContent ? `WEBSITE CONTEXT (how the company positions itself):
${websiteContent.substring(0, 2000)}` : ''}

${researchData?.typicalPains && researchData.typicalPains.length > 0 ? `RESEARCH INSIGHTS - Common Pains in this Segment:
${JSON.stringify(researchData.typicalPains.slice(0, 5), null, 2)}

Use these pains to understand what gains would be most valuable to ${segment}.` : ''}

Generate customer gains that are:
- Segment-specific: Relevant to ${segment} and their unique context
- Short and specific (5-12 words each)
- Outcome-focused (what ${segment} achieves as a result)
- NOUN-BASED outcomes, not verb-based actions
- Relevant to this product type AND this specific segment
- NOT a description of the product itself
- Examples of good gains (noun-based outcomes): "Reduced order processing errors", "Shorter onboarding time for new hires", "Fewer neurosurgical procedure errors"
- Examples of BAD gains (verb-based actions): "Reduce order processing errors", "Accelerate patient recovery times", "Enhance surgical precision", "Increase efficiency" (too vague)
- RULE: Rewrite any verb-based gain into a noun-based outcome. "Accelerate X" → "Shorter X", "Enhance X" → "More consistent X", "Reduce X" → "Reduced X" or "Fewer X"
- Consider what outcomes would be most valuable to ${segment} based on their jobs and context

Return ONLY valid JSON array, no markdown formatting.`;

  const response = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ], {
    temperature: 0.7,
    maxTokens: 1500,
  });

  if (!response) {
    // Fallback gains
    return [
      {
        id: 'gain-1',
        text: 'Save time and increase productivity',
        type: 'required',
        confidence: 'high',
      },
      {
        id: 'gain-2',
        text: 'Improve accuracy and reduce errors',
        type: 'expected',
        confidence: 'medium',
      },
      {
        id: 'gain-3',
        text: 'Gain better insights and visibility',
        type: 'desired',
        confidence: 'medium',
      },
      {
        id: 'gain-4',
        text: 'Automate repetitive tasks',
        type: 'desired',
        confidence: 'medium',
      },
      {
        id: 'gain-5',
        text: 'Achieve competitive advantage',
        type: 'unexpected',
        confidence: 'low',
      },
    ];
  }

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [
        {
          id: 'gain-1',
          text: 'Save time and increase productivity',
          type: 'required',
          confidence: 'high',
        },
      ];
    }

    // Filter and validate gains
    const validGains = parsed.slice(0, 6)
      .map((gain: any, idx: number) => ({
        id: `gain-${idx + 1}`,
        text: (gain.text || '').trim(),
        type: (gain.type === 'required' || gain.type === 'expected' || gain.type === 'desired' || gain.type === 'unexpected')
          ? gain.type
          : 'desired' as const,
        confidence: (idx < 2 ? 'high' : 'medium') as ConfidenceLevel,
      }))
      .filter((gain: any) => {
        // Filter out invalid gains
        if (!gain.text || gain.text.length === 0) return false;
        
        // Filter out gains that are too long (likely the full description)
        if (gain.text.length > 100) return false;
        
        // Filter out gains that contain the full product description
        const descriptionLower = input.description.toLowerCase();
        const gainLower = gain.text.toLowerCase();
        if (descriptionLower.length > 50 && gainLower.includes(descriptionLower.substring(0, 50))) {
          return false;
        }
        
        // Filter out gains that start with "Save time on" followed by long text
        if (gainLower.startsWith('save time on') && gain.text.length > 30) {
          return false;
        }
        
        return true;
      });

    // If we filtered out too many, add fallback gains
    if (validGains.length === 0) {
      return [
        {
          id: 'gain-1',
          text: 'Save time and increase productivity',
          type: 'required',
          confidence: 'high',
        },
        {
          id: 'gain-2',
          text: 'Improve accuracy and reduce errors',
          type: 'expected',
          confidence: 'medium',
        },
      ];
    }

    return validGains;
  } catch (error) {
    console.error('Failed to parse customer gains:', error);
    return [
      {
        id: 'gain-1',
        text: 'Save time and increase productivity',
        type: 'required',
        confidence: 'high',
      },
    ];
  }
}

/**
 * Generate Products/Services from product description and website
 * Extracts specific product lines, brand names, and solution families
 */
export async function generateProductsServices(input: UserInput, websiteContent?: string): Promise<ProductService[]> {
  const researchSnippets = websiteContent ? websiteContent.substring(0, 5000) : '';
  
  const prompt = `You are a product strategist. Based on the following product information, identify 5-10 specific products, services, or solution families.

Product Name: ${input.productName}
Product Description: ${input.description}
${researchSnippets ? `Website/Research Content: ${researchSnippets}` : ''}

Extract specific products, services, or solution families. These should be:
- Concrete product names, brand names, or product categories
- Specific solution lines or product families
- Indication-based groupings (e.g., specific product types for specific use cases)
- NOT generic category labels like "solutions" or "services"
- At least 5-10 items if possible

Examples of good product/service items:
- "Invoice automation module for mid-market finance teams"
- "Route optimization engine for delivery fleets"
- "Managed payroll service for small businesses"
- "Brand X endpoint security platform"

Examples of BAD items (too generic):
- "Solutions"
- "Services"
- "Analytics platform"
- "Industry-specific solutions"

Return a JSON array with this structure:
[
  {
    "text": "Specific product name, brand, or solution family",
    "category": "Optional category (e.g., 'implants', 'instruments', 'monitoring')"
  },
  ...
]

Return ONLY valid JSON array, no markdown formatting.`;

  const response = await callOpenAI([
    { role: 'system', content: 'You are a product strategist. Extract specific, concrete product names, brands, and solution families. Avoid generic category labels.' },
    { role: 'user', content: prompt }
  ], {
    temperature: 0.6,
    maxTokens: 2000,
  });

  if (!response) {
    // Fallback - use product name only
    return [
      {
        id: 'product-1',
        text: input.productName,
        confidence: 'high',
        source: 'user input',
      },
    ];
  }

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [
        {
          id: 'product-1',
          text: input.productName,
          confidence: 'high',
          source: 'user input',
        },
      ];
    }

    const services: ProductService[] = [
      {
        id: 'product-1',
        text: input.productName,
        confidence: 'high',
        source: 'user input',
      },
      ...parsed.slice(0, 9).map((item: any, idx: number) => ({
        id: `product-${idx + 2}`,
        text: item.text || '',
        category: item.category || undefined,
        confidence: 'medium' as ConfidenceLevel,
        source: researchSnippets ? 'website' : 'inferred',
      })).filter((item: ProductService) => item.text.length > 0 && item.text.length < 200),
    ];

    return services;
  } catch (error) {
    console.error('Failed to parse products/services:', error);
    return [
      {
        id: 'product-1',
        text: input.productName,
        confidence: 'high',
        source: 'user input',
      },
    ];
  }
}

/**
 * Generate a focused segment description
 * Format: "[primary role] in [type of institution / setting]"
 */
function generateSegment(input: UserInput, jobs?: JobToBeDone[]): string {
  // If user provided a primary segment, use it
  if (input.primarySegment) {
    return input.primarySegment;
  }
  
  // Otherwise, generate from target decision maker
  // Remove any product description that might have been concatenated
  const role = (input.targetDecisionMaker || 'Decision makers').trim();
  
  // Try to infer setting from description or default to generic
  let setting = 'organizations';
  const descLower = input.description.toLowerCase();
  if (descLower.includes('hospital') || descLower.includes('healthcare') || descLower.includes('medical')) {
    setting = 'hospitals and healthcare institutions';
  } else if (descLower.includes('academic') || descLower.includes('university')) {
    setting = 'academic institutions';
  } else if (descLower.includes('enterprise') || descLower.includes('large')) {
    setting = 'enterprise organizations';
  }
  
  return `${role} in ${setting}`;
}

export async function generateCanvas(
  research: ResearchData, 
  input: UserInput,
  jobs?: JobToBeDone[],
  painClusters?: PainIntensityCluster[],
  websiteContent?: string
): Promise<ValuePropositionCanvas> {
  // Generate Customer Jobs from Step 1 (Job-to-Be-Done identification)
  const customerJobs: CustomerJob[] = jobs && jobs.length > 0
    ? jobs.map((job, idx) => ({
        id: `job-${idx + 1}`,
        text: job.text,
        type: job.type,
        confidence: idx < 2 ? 'high' : 'medium',
        source: 'job-to-be-done analysis',
      }))
    : [
        // Fallback if jobs not provided
        {
          id: 'job-1',
          text: `Manage ${input.description.substring(0, 100).toLowerCase()}... effectively`,
          type: 'functional' as const,
          confidence: 'high' as const,
          source: 'user input',
        },
        {
          id: 'job-2',
          text: `Make data-driven decisions about ${input.description.substring(0, 50).toLowerCase()}...`,
          type: 'functional' as const,
          confidence: 'medium' as const,
        },
        {
          id: 'job-3',
          text: `Prepare clear, well-supported recommendations for stakeholders`,
          type: 'functional' as const,
          confidence: 'medium' as const,
          source: 'user input',
        },
        {
          id: 'job-4',
          text: `Make consistent, informed decisions with available data`,
          type: 'functional' as const,
          confidence: 'medium' as const,
        },
      ];

  // Generate Customer Pains from Step 2 (Pain Intensity Clusters) and research
  const painSources: string[] = [];
  
  // Add pains from pain intensity clusters (Step 2)
  if (painClusters && painClusters.length > 0) {
    painClusters.forEach(cluster => {
      painSources.push(cluster.specificPain);
    });
  }
  
  // Add pains from research
  if (research.typicalPains.length > 0) {
    research.typicalPains.forEach(pain => {
      if (!painSources.some(p => p.toLowerCase() === pain.toLowerCase())) {
        painSources.push(pain);
      }
    });
  }
  
  // Fallback pains if no sources
  if (painSources.length === 0) {
    painSources.push(
      `Difficulty managing ${input.description.substring(0, 50).toLowerCase()}... efficiently`,
      `Lack of visibility into ${input.description.substring(0, 50).toLowerCase()}... processes`,
      `Time-consuming manual processes`,
      `Risk of errors in ${input.description.substring(0, 50).toLowerCase()}...`,
    );
  }
  
  const customerPains: CustomerPain[] = painSources.slice(0, 10).map((pain, idx) => {
    // Try to find matching pain cluster for additional context
    const matchingCluster = painClusters?.find(c => c.specificPain === pain);
    
    return {
      id: `pain-${idx + 1}`,
      text: pain,
      confidence: (idx < 3 && (research.typicalPains.length > 0 || matchingCluster)) ? 'high' : 'medium',
      intensity: idx < 3 ? 'high' : idx < 6 ? 'medium' : 'low',
      category: idx % 4 === 0 ? 'frustration' : idx % 4 === 1 ? 'barrier' : idx % 4 === 2 ? 'risk' : 'financial',
      source: matchingCluster ? 'pain intensity cluster' : (research.typicalPains.length > 0 ? research.source : 'inferred'),
    };
  });

  // Generate Customer Gains - use AI to create contextually relevant gains
  const customerGains: CustomerGain[] = await generateCustomerGains(input, jobs, painClusters, websiteContent, research);

  // Generate Products/Services - extract specific products from website/research
  const productsServices: ProductService[] = await generateProductsServices(input, websiteContent);

  // Generate segment (single, focused)
  const segment = generateSegment(input, jobs);
  
  // Set primary job if user selected one, otherwise use first job
  const primaryJobId = input.primaryJobId || (customerJobs.length > 0 ? customerJobs[0].id : undefined);

  // TODO: Replace these stubbed Pain Relievers / Gain Creators with an AI-generated step
  // that explains concrete mechanisms for how products relieve pains and create gains, 
  // instead of simple "Addresses" / "Enables" labels.
  // Generate Pain Relievers (will be improved in separate step with mechanism)
  // NOTE: This is a fallback stub - should use generatePainRelieversAndGainCreators() instead
  const painRelievers: PainReliever[] = customerPains.slice(0, 6).map((pain, idx) => ({
    id: `reliever-${idx + 1}`,
    text: `Helps address ${pain.text.toLowerCase()}`, // Never use "Addresses:" prefix
    description: `Helps address ${pain.text.toLowerCase()}`,
    confidence: pain.confidence,
    painId: pain.id,
    evidenceSource: 'inferred' as const,
  }));

  // Generate Gain Creators (will be improved in separate step with mechanism)
  const gainCreators: GainCreator[] = customerGains.slice(0, 5).map((gain, idx) => ({
    id: `creator-${idx + 1}`,
    text: `Helps enable ${gain.text.toLowerCase()}`, // Never use "Enables:" prefix
    description: `Helps enable ${gain.text.toLowerCase()}`,
    confidence: gain.confidence,
    gainId: gain.id,
    evidenceSource: 'inferred' as const,
  }));

  return {
    customerJobs,
    customerPains,
    customerGains,
    productsServices,
    painRelievers,
    gainCreators,
    segment,
    primaryJobId,
    alternatives: research.competitiveAlternatives,
    evidenceMetrics: [], // Will be populated if user provides metrics
  };
}

