import axios from 'axios';
import { ValuePropositionCanvas, ValuePropositionStatement, ProspectSegment, UserInput, CompanyPositioningSummary } from '@/types';

const HUBSPOT_API_BASE = 'https://api.hubapi.com';

/**
 * Format the report data as a text note for HubSpot
 */
export function formatReportAsNote(
  canvas: ValuePropositionCanvas,
  propositions: ValuePropositionStatement[],
  segments: ProspectSegment[],
  userInput: UserInput,
  companyPositioning?: CompanyPositioningSummary
): string {
  const lines: string[] = [];

  lines.push('VALUE PROPOSITION CANVAS REPORT');
  lines.push('='.repeat(50));
  lines.push('');

  // Product Information
  lines.push('PRODUCT INFORMATION');
  lines.push('-'.repeat(50));
  lines.push(`Product Name: ${userInput.productName}`);
  lines.push(`Description: ${userInput.description}`);
  lines.push(`Target Segment: ${userInput.primarySegment || userInput.targetDecisionMaker}`);
  if (userInput.websiteUrl) {
    lines.push(`Website: ${userInput.websiteUrl}`);
  }
  lines.push('');

  // Customer Jobs
  lines.push('CUSTOMER JOBS');
  lines.push('-'.repeat(50));
  canvas.customerJobs.forEach((job, idx) => {
    lines.push(`${idx + 1}. ${job.text} [${job.type}] (${job.confidence} confidence)`);
  });
  lines.push('');

  // Customer Pains
  lines.push('CUSTOMER PAINS');
  lines.push('-'.repeat(50));
  canvas.customerPains.forEach((pain, idx) => {
    const intensity = pain.intensity ? ` [${pain.intensity} intensity]` : '';
    const prioritized = pain.isPrioritized ? ' [TOP 3]' : '';
    lines.push(`${idx + 1}. ${pain.text}${intensity}${prioritized}`);
  });
  lines.push('');

  // Customer Gains
  lines.push('CUSTOMER GAINS');
  lines.push('-'.repeat(50));
  canvas.customerGains.forEach((gain, idx) => {
    const prioritized = gain.isPrioritized ? ' [TOP 3]' : '';
    lines.push(`${idx + 1}. ${gain.text} [${gain.type}]${prioritized}`);
  });
  lines.push('');

  // Products & Services
  lines.push('PRODUCTS & SERVICES');
  lines.push('-'.repeat(50));
  canvas.productsServices.forEach((product, idx) => {
    lines.push(`${idx + 1}. ${product.text}`);
  });
  lines.push('');

  // Pain Relievers
  if (canvas.painRelievers.length > 0) {
    lines.push('PAIN RELIEVERS');
    lines.push('-'.repeat(50));
    canvas.painRelievers.forEach((reliever, idx) => {
      lines.push(`${idx + 1}. ${reliever.title || reliever.text}`);
      if (reliever.description) {
        lines.push(`   ${reliever.description}`);
      }
    });
    lines.push('');
  }

  // Gain Creators
  if (canvas.gainCreators.length > 0) {
    lines.push('GAIN CREATORS');
    lines.push('-'.repeat(50));
    canvas.gainCreators.forEach((creator, idx) => {
      lines.push(`${idx + 1}. ${creator.title || creator.text}`);
      if (creator.description) {
        lines.push(`   ${creator.description}`);
      }
    });
    lines.push('');
  }

  // Company Positioning Summary
  if (companyPositioning) {
    lines.push('COMPANY POSITIONING SUMMARY');
    lines.push('-'.repeat(50));
    lines.push(`Overarching Promise: ${companyPositioning.overarchingPromise}`);
    lines.push('');
    lines.push(`Positioning Statement: ${companyPositioning.positioningStatement}`);
    lines.push('');
    lines.push(`Unified Job Statement: ${companyPositioning.unifiedJobStatement}`);
    lines.push('');
    
    if (companyPositioning.sharedPains.length > 0) {
      lines.push('Shared Pains:');
      companyPositioning.sharedPains.forEach(pain => {
        lines.push(`  - ${pain}`);
      });
      lines.push('');
    }
    
    if (companyPositioning.sharedGains.length > 0) {
      lines.push('Shared Gains:');
      companyPositioning.sharedGains.forEach(gain => {
        lines.push(`  - ${gain}`);
      });
      lines.push('');
    }
    
    if (companyPositioning.sharedDifferentiators.length > 0) {
      lines.push('Shared Differentiators:');
      companyPositioning.sharedDifferentiators.forEach(diff => {
        lines.push(`  - ${diff}`);
      });
      lines.push('');
    }
    
    if (companyPositioning.primarySegments.length > 0) {
      lines.push(`Based on Segment(s): ${companyPositioning.primarySegments.join(', ')}`);
      lines.push('');
    }
  }

  // Value Propositions
  lines.push('VALUE PROPOSITIONS');
  lines.push('-'.repeat(50));
  propositions.forEach((prop, idx) => {
    lines.push(`\nValue Proposition ${idx + 1}: ${prop.label || 'Untitled'}`);
    lines.push(`Statement: ${prop.statement}`);
    lines.push(`Segment Targeted: ${prop.segmentTargeted}`);
    lines.push(`Primary Job: ${prop.primaryJob}`);
    lines.push(`Core Outcome: ${prop.coreOutcome}`);
    lines.push(`Competitive Contrast: ${prop.competitiveContrast}`);
    lines.push(`Measurable Impact: ${prop.measurableImpact}`);
    
    if (prop.keyPainsRelieved.length > 0) {
      lines.push('Key Pains Relieved:');
      prop.keyPainsRelieved.forEach(painId => {
        const pain = canvas.customerPains.find(p => p.id === painId);
        lines.push(`  - ${pain ? pain.text : painId}`);
      });
    }
    
    if (prop.keyGainsCreated.length > 0) {
      lines.push('Key Gains Created:');
      prop.keyGainsCreated.forEach(gainId => {
        const gain = canvas.customerGains.find(g => g.id === gainId);
        lines.push(`  - ${gain ? gain.text : gainId}`);
      });
    }
  });
  lines.push('');

  // Prospect Universe
  lines.push('PROSPECT UNIVERSE');
  lines.push('-'.repeat(50));
  segments.forEach((segment, idx) => {
    lines.push(`\nSegment ${idx + 1}: ${segment.name}`);
    lines.push(`Job Titles: ${segment.jobTitles.join(', ')}`);
    lines.push(`Industries: ${segment.industries.join(', ')}`);
    if (segment.companySize && segment.companySize.length > 0) {
      lines.push(`Company Size: ${segment.companySize.join(', ')}`);
    }
    lines.push('Buying Triggers:');
    segment.buyingTriggers.forEach(trigger => {
      lines.push(`  - ${trigger}`);
    });
    if (segment.toolsInStack && segment.toolsInStack.length > 0) {
      lines.push(`Tools in Stack: ${segment.toolsInStack.join(', ')}`);
    }
    lines.push(`Keywords: ${segment.keywords.join(', ')}`);
    lines.push(`Hashtags: ${segment.hashtags.map(h => (h.startsWith('#') ? h : `#${h}`)).join(', ')}`);
    if (segment.events && segment.events.length > 0) {
      lines.push(`Events: ${segment.events.join(', ')}`);
    }
  });
  lines.push('');

  lines.push('='.repeat(50));
  lines.push(`Generated by Nytro Value Proposition Engine`);
  lines.push(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);

  return lines.join('\n');
}

/**
 * Check if email domain should be excluded from lead creation
 */
export function shouldExcludeEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain === 'nytromarketing.com';
}

/**
 * Search for an existing contact by email in HubSpot
 */
async function findContactByEmail(apiKey: string, email: string): Promise<string | null> {
  try {
    const response = await axios.post(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`,
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: email,
              },
            ],
          },
        ],
        limit: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0].id;
    }
    return null;
  } catch (error: any) {
    // Log error details without exposing API keys
    // error.response?.data is safe to log server-side but never sent to client
    console.error('Error searching for contact in HubSpot:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    return null;
  }
}

/**
 * Create a new contact in HubSpot
 */
async function createContact(apiKey: string, email: string): Promise<string | null> {
  try {
    const response = await axios.post(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`,
      {
        properties: {
          email: email,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.id || null;
  } catch (error: any) {
    // Log error details without exposing API keys
    // error.response?.data is safe to log server-side but never sent to client
    console.error('Error creating contact in HubSpot:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    return null;
  }
}

/**
 * Create or get a contact ID for the given email
 */
async function getOrCreateContact(apiKey: string, email: string): Promise<string | null> {
  // First, try to find existing contact
  const existingContactId = await findContactByEmail(apiKey, email);
  if (existingContactId) {
    return existingContactId;
  }

  // If not found, create a new contact
  return await createContact(apiKey, email);
}

/**
 * Create a note and associate it with a contact in HubSpot
 */
async function createNoteForContact(
  apiKey: string,
  contactId: string,
  noteContent: string
): Promise<boolean> {
  try {
    // First, create the note
    const noteResponse = await axios.post(
      `${HUBSPOT_API_BASE}/crm/v3/objects/notes`,
      {
        properties: {
          hs_note_body: noteContent,
          hs_timestamp: Date.now().toString(),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const noteId = noteResponse.data.id;
    if (!noteId) {
      console.error('Note created but no ID returned:', noteResponse.data);
      return false;
    }

    // Then, associate the note with the contact using the Notes association API
    // Use the HUBSPOT_DEFINED association label "note_to_contact" between a note and a contact
    try {
      await axios.put(
        `${HUBSPOT_API_BASE}/crm/v3/objects/notes/${noteId}/associations/contact/${contactId}/note_to_contact`,
        {},
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (assocError: any) {
      // If association fails, log but don't fail completely - the note was created
      console.warn('Failed to associate note with contact, but note was created:', {
        message: assocError.message,
        response: assocError.response?.data,
        status: assocError.response?.status,
      });
      // Note: The note was still created, so we return true
    }

    return noteResponse.status === 201 || noteResponse.status === 200;
  } catch (error: any) {
    console.error('Error creating note in HubSpot:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    return false;
  }
}

/**
 * Create a lead (contact) in HubSpot with the report as a note
 */
export async function createHubSpotLead(
  email: string,
  canvas: ValuePropositionCanvas,
  propositions: ValuePropositionStatement[],
  segments: ProspectSegment[],
  userInput: UserInput,
  companyPositioning?: CompanyPositioningSummary
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.HUBSPOT_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'HubSpot API key not configured',
    };
  }

  // Check if email domain should be excluded
  if (shouldExcludeEmailDomain(email)) {
    return {
      success: false,
      error: 'Email domain excluded from lead creation',
    };
  }

  try {
    // Get or create contact
    const contactId = await getOrCreateContact(apiKey, email);
    if (!contactId) {
      return {
        success: false,
        error: 'Failed to create or find contact in HubSpot',
      };
    }

    // Format report as note
    const noteContent = formatReportAsNote(canvas, propositions, segments, userInput, companyPositioning);

    // Create note and associate with contact
    const noteCreated = await createNoteForContact(apiKey, contactId, noteContent);
    if (!noteCreated) {
      return {
        success: false,
        error: 'Failed to create note in HubSpot',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error creating HubSpot lead:', error);
    return {
      success: false,
      error: error.message || 'Unknown error creating HubSpot lead',
    };
  }
}

