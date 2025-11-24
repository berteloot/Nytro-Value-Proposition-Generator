import { NextRequest, NextResponse } from 'next/server';
import { generateValuePropositions } from '@/lib/proposition-generator';
import { generatePainRelieversAndGainCreators } from '@/lib/pain-relievers-gain-creators';
import { ValuePropositionCanvas, UserInput } from '@/types';
import { getWebsiteContent } from '@/lib/research';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { canvas, userInput }: { canvas: ValuePropositionCanvas; userInput: UserInput } = body;

    if (!canvas || !userInput) {
      return NextResponse.json(
        { error: 'Missing canvas or userInput' },
        { status: 400 }
      );
    }

    // Check that pains and gains are prioritized
    const prioritizedPains = canvas.customerPains.filter(p => p.isPrioritized);
    const prioritizedGains = canvas.customerGains.filter(g => g.isPrioritized);

    if (prioritizedPains.length < 3 || prioritizedGains.length < 3) {
      return NextResponse.json(
        { error: 'Must prioritize exactly 3 pains and 3 gains before generating propositions' },
        { status: 400 }
      );
    }

    // Generate improved Pain Relievers and Gain Creators with mechanisms
    // This should happen after prioritization but before value proposition generation
    // Note: getWebsiteContent uses caching, so this will be instant if the website was already scraped in the research step
    const websiteContent = await getWebsiteContent(userInput);
    const { painRelievers, gainCreators } = await generatePainRelieversAndGainCreators(
      canvas,
      websiteContent
    );

    // Update canvas with improved Pain Relievers and Gain Creators
    const updatedCanvas: ValuePropositionCanvas = {
      ...canvas,
      painRelievers,
      gainCreators,
    };

    const propositions = await generateValuePropositions(updatedCanvas, userInput);

    return NextResponse.json({
      success: true,
      propositions,
      canvas: updatedCanvas, // Return updated canvas with improved Pain Relievers/Gain Creators
    });
  } catch (error: any) {
    // Log full error server-side only (may contain sensitive details)
    console.error('Generate propositions API error:', error);
    // Return generic error message to client (never expose API keys or sensitive details)
    return NextResponse.json(
      { error: 'Failed to generate value propositions. Please try again.' },
      { status: 500 }
    );
  }
}

