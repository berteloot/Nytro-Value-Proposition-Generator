import {
  UserInput,
  ValuePropositionCanvas,
  PainReliever,
  GainCreator,
  ProspectSegment,
  ValuePropositionStatement,
  Assumption,
  CustomerPain,
  ResearchData,
  CompanyPositioningSummary,
} from '@/types';
import {
  extractWithAI,
  identifyJobToBeDone,
  identifyPainIntensityClusters,
  generateCustomerGains,
  generateProductsServices,
  getWebsiteContent,
  conductResearch,
  type JobToBeDone,
  type PainIntensityCluster,
} from './research';
import {
  generatePainRelieversAndGainCreators,
  generateFallbackRelieversAndCreators,
} from './pain-relievers-gain-creators';
import {
  generateValuePropositions,
  generateFallbackPropositions,
} from './proposition-generator';
import {
  generateUniverseWithAI,
  generateFallbackUniverse,
  addReachabilityToSegments,
} from './universe-generator';
import {
  generateAssumptionsWithAI,
} from './assumptions-generator';
import {
  validateJobsAndExtractEmotionalPains,
} from './job-validator';
import {
  buildCompanyPositioningSummary,
} from './company-positioning';

export interface ValuePropFlowResult {
  canvas: ValuePropositionCanvas;
  painRelievers: PainReliever[];
  gainCreators: GainCreator[];
  valuePropositions: ValuePropositionStatement[];
  prospectUniverse: ProspectSegment[];
  assumptions: Assumption[];
  companyPositioning: CompanyPositioningSummary;
}

/**
 * Main orchestrator: runs the complete Value Proposition Engine flow.
 *
 * Steps:
 * 1. Research & extraction (optional, from website/inputs)
 * 2. Jobs → Pains → Gains → Products/Services → Initial Canvas
 * 3. Pain Relievers & Gain Creators (mechanism-level)
 * 4. Value Propositions (internal + customer-facing contrast)
 * 5. Prospect Universe & Reachability
 * 6. Assumptions & Experiments
 */
export async function runValuePropFlow(userInput: UserInput): Promise<ValuePropFlowResult> {
  try {
    // 1. Research / extraction (optional but recommended when website is provided)
    let research: ResearchData | null = null;
    let websiteContent: string = '';

    if (userInput.websiteUrl) {
      try {
        websiteContent = await getWebsiteContent(userInput);
        if (websiteContent) {
          // Use extractWithAI for better extraction
          research = await extractWithAI(
            `${userInput.description} ${websiteContent}`,
            userInput
          );
        }
      } catch (err) {
        console.warn('Failed to extract website content, continuing without it:', err);
      }
    }

    // If research extraction failed, use conductResearch as fallback
    if (!research) {
      try {
        research = await conductResearch(userInput);
      } catch (err) {
        console.warn('Failed to conduct research, continuing without it:', err);
        // Create minimal research data
        research = {
          problemSpace: `The ${userInput.targetDecisionMaker} faces challenges in ${userInput.description.toLowerCase()}.`,
          typicalPains: [],
          buyingTriggers: [],
          competitiveAlternatives: [],
          source: 'inferred',
        };
      }
    }

    // 2. Jobs-to-be-done
    const rawJobs = await identifyJobToBeDone(userInput);
  
    if (!rawJobs || rawJobs.length === 0) {
      throw new Error('Failed to identify jobs-to-be-done');
    }

    // Validate Jobs: Remove emotional language and move to Pains
    const jobsWithIds = rawJobs.map((job, idx) => ({
      id: `job-${idx + 1}`,
      text: job.text,
      type: job.type,
      confidence: (idx < 2 ? 'high' : 'medium') as 'high' | 'medium' | 'low',
      source: 'job-to-be-done analysis',
    }));
    
    const { validJobs, extractedPains } = validateJobsAndExtractEmotionalPains(jobsWithIds);
    
    if (validJobs.length === 0) {
      throw new Error('No valid functional jobs found after validation - all jobs contained emotional language');
    }
    
    const jobs = validJobs.map(j => ({ text: j.text, type: 'functional' as const }));

    // 3. Pains (via Pain Intensity Clusters)
    const painClusters = await identifyPainIntensityClusters(jobs, userInput);
  
    if (!painClusters || painClusters.length === 0) {
      throw new Error('Failed to identify pain intensity clusters');
    }
  
    // Extract prioritized pains from pain clusters
    const customerPains: CustomerPain[] = painClusters.slice(0, 10).map((cluster, idx) => {
      // Check if this pain is in research data
      const inResearch = research?.typicalPains.some(p => 
        p.toLowerCase().includes(cluster.specificPain.toLowerCase()) ||
        cluster.specificPain.toLowerCase().includes(p.toLowerCase())
      );
    
      return {
        id: `pain-${idx + 1}`,
        text: cluster.specificPain,
        confidence: inResearch ? 'high' : 'medium',
        intensity: idx < 3 ? 'high' : idx < 6 ? 'medium' : 'low',
        category: idx % 4 === 0 ? 'frustration' : idx % 4 === 1 ? 'barrier' : idx % 4 === 2 ? 'risk' : 'financial',
        source: inResearch ? (research?.source || 'research') : 'pain intensity cluster',
      };
    });

    // Add any pains extracted from Jobs (emotional language moved from Jobs)
    if (extractedPains.length > 0) {
      customerPains.push(...extractedPains);
    }

    // Add research pains that aren't already covered
    if (research && research.typicalPains.length > 0) {
      research.typicalPains.forEach((painText, idx) => {
        if (!customerPains.some(p => 
          p.text.toLowerCase().includes(painText.toLowerCase()) ||
          painText.toLowerCase().includes(p.text.toLowerCase())
        )) {
          customerPains.push({
            id: `pain-research-${idx + 1}`,
            text: painText,
            confidence: 'high',
            intensity: 'medium',
            category: 'frustration',
            source: research.source,
          });
        }
      });
    }

    // Limit to 10 pains, but ensure we have at least 3
    const prioritizedPains = customerPains.slice(0, 10);
  
    if (prioritizedPains.length < 3) {
      // If we don't have enough pains, add some fallback ones
      const fallbackPains: CustomerPain[] = [
      {
        id: 'pain-fallback-1',
        text: `Difficulty managing ${userInput.description.substring(0, 50).toLowerCase()}... efficiently`,
        confidence: 'medium',
        intensity: 'high',
        category: 'frustration',
        source: 'inferred',
      },
      {
        id: 'pain-fallback-2',
        text: `Lack of visibility into ${userInput.description.substring(0, 50).toLowerCase()}... processes`,
        confidence: 'medium',
        intensity: 'medium',
        category: 'barrier',
        source: 'inferred',
      },
      {
        id: 'pain-fallback-3',
        text: `Time-consuming manual processes and risk of errors`,
        confidence: 'medium',
        intensity: 'medium',
        category: 'risk',
        source: 'inferred',
      },
    ];
      prioritizedPains.push(...fallbackPains.slice(0, 3 - prioritizedPains.length));
    }

    // 4. Gains
    const customerGains = await generateCustomerGains(userInput, jobs, painClusters, websiteContent, research);
  
    // Ensure we have at least 3 gains
    if (customerGains.length < 3) {
      const fallbackGains = [
      {
        id: 'gain-fallback-1',
        text: 'Save time and increase productivity',
        type: 'required' as const,
        confidence: 'medium' as const,
      },
      {
        id: 'gain-fallback-2',
        text: 'Improve accuracy and reduce errors',
        type: 'expected' as const,
        confidence: 'medium' as const,
      },
      {
        id: 'gain-fallback-3',
        text: 'Gain better insights and visibility',
        type: 'desired' as const,
        confidence: 'medium' as const,
      },
    ];
      customerGains.push(...fallbackGains.slice(0, 3 - customerGains.length));
    }

    // 5. Products & Services
    const productsAndServices = await generateProductsServices(userInput, websiteContent);
  
    if (productsAndServices.length === 0) {
      // At minimum, add the product name
      productsAndServices.push({
      id: 'product-1',
      text: userInput.productName,
      confidence: 'high',
        source: 'user input',
      });
    }

    // 6. Build initial canvas (without relievers/creators yet)
    const segment = userInput.primarySegment || 
      (userInput.targetDecisionMaker ? `${userInput.targetDecisionMaker} in organizations` : 'Target customers');

    // Use validated jobs (already have IDs from validation step)
    const customerJobs = validJobs;

    // Ensure we have a valid primaryJobId
    let primaryJobId = userInput.primaryJobId;
    if (!primaryJobId || !customerJobs.find(j => j.id === primaryJobId)) {
      primaryJobId = customerJobs.length > 0 ? customerJobs[0].id : undefined;
    }

    // Ensure we have at least one job
    if (customerJobs.length === 0) {
      throw new Error('No customer jobs found - cannot create canvas');
    }

    const canvas: ValuePropositionCanvas = {
    customerJobs,
    customerPains: prioritizedPains,
    customerGains,
    productsServices: productsAndServices,
    painRelievers: [],
    gainCreators: [],
    segment,
    primaryJobId,
    alternatives: research?.competitiveAlternatives || [],
    evidenceMetrics: [],
    };

    // 7. Pain Relievers & Gain Creators (mechanism-level detail)
    let painRelievers: PainReliever[] = [];
    let gainCreators: GainCreator[] = [];

    try {
      const relieversAndCreators = await generatePainRelieversAndGainCreators(
        canvas,
        websiteContent
      );
      painRelievers = relieversAndCreators.painRelievers;
      gainCreators = relieversAndCreators.gainCreators;
    } catch (err) {
      console.error('Error generating Pain Relievers / Gain Creators with AI, using fallback:', err);
      // Fallback (generic, label-only)
      const fallback = generateFallbackRelieversAndCreators(canvas);
      painRelievers = fallback.painRelievers;
      gainCreators = fallback.gainCreators;
    }

    // Attach relievers/creators to canvas for downstream steps
    const enrichedCanvas: ValuePropositionCanvas = {
      ...canvas,
      painRelievers,
      gainCreators,
    };

    // Note: Value propositions require exactly 3 prioritized pains and 3 prioritized gains
    // Ensure we have at least 3 of each, and mark them as prioritized
    const availablePains = enrichedCanvas.customerPains.length;
    const availableGains = enrichedCanvas.customerGains.length;
  
    if (availablePains < 3) {
      throw new Error(`Not enough customer pains (${availablePains}) - need at least 3`);
    }
  
    if (availableGains < 3) {
      throw new Error(`Not enough customer gains (${availableGains}) - need at least 3`);
    }
  
    // Mark the first 3 of each as prioritized
    const painsForVP = enrichedCanvas.customerPains
      .slice(0, 3)
      .map(pain => ({
        ...pain,
        isPrioritized: true,
      }));
  
    const gainsForVP = enrichedCanvas.customerGains
      .slice(0, 3)
      .map(gain => ({
        ...gain,
        isPrioritized: true,
      }));

    // Create a temporary canvas with prioritized items for VP generation
    const canvasForVP: ValuePropositionCanvas = {
      ...enrichedCanvas,
      customerPains: [
        ...painsForVP,
        ...enrichedCanvas.customerPains.slice(painsForVP.length).map(p => ({
          ...p,
          isPrioritized: false,
        })),
      ],
      customerGains: [
        ...gainsForVP,
        ...enrichedCanvas.customerGains.slice(gainsForVP.length).map(g => ({
          ...g,
          isPrioritized: false,
        })),
      ],
    };

    // 8. Value Propositions (with internal vs customer-facing contrast inside the generator)
    let valuePropositions: ValuePropositionStatement[] = [];
    try {
      valuePropositions = await generateValuePropositions(canvasForVP, userInput);
    } catch (err) {
      console.error('Error generating Value Propositions with AI, using fallback:', err);
      valuePropositions = generateFallbackPropositions(canvasForVP, userInput);
    }

    // 9. Prospect Universe (segments for GTM)
    let prospectUniverse: ProspectSegment[] = [];
    try {
      const rawUniverse = await generateUniverseWithAI(
        enrichedCanvas,
        painsForVP
      );
      if (rawUniverse && rawUniverse.length > 0) {
        prospectUniverse = await addReachabilityToSegments(rawUniverse);
      } else {
        throw new Error('No universe generated');
      }
    } catch (err) {
      console.error('Error generating Prospect Universe with AI, using fallback:', err);
      const fallbackUniverse = generateFallbackUniverse(enrichedCanvas, painsForVP);
      prospectUniverse = await addReachabilityToSegments(fallbackUniverse);
    }

    // 10. Assumptions & Experiments
    let assumptions: Assumption[] = [];
    try {
      const primaryVP = valuePropositions[0] || null;
      if (primaryVP) {
        assumptions = await generateAssumptionsWithAI(enrichedCanvas, primaryVP);
      }
    } catch (err) {
      console.error('Error generating assumptions with AI:', err);
      assumptions = [];
    }

    // 11. Company Positioning Summary
    // Note: Currently using single canvas, but function supports multiple canvases for multi-segment portfolios
    const companyPositioning = buildCompanyPositioningSummary(
      [enrichedCanvas],    // Pass as array - supports single or multiple canvases
      valuePropositions,
      userInput
    );

    return {
      canvas: enrichedCanvas,
      painRelievers,
      gainCreators,
      valuePropositions,
      prospectUniverse,
      assumptions,
      companyPositioning,
    };
  } catch (error: any) {
    console.error('Error in runValuePropFlow:', error);
    throw new Error(`Failed to run value proposition flow: ${error.message || 'Unknown error'}`);
  }
}

