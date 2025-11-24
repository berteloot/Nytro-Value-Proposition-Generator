import { NextRequest, NextResponse } from 'next/server';
import { callOpenAI } from '@/lib/openai';
import { getWebsiteContent } from '@/lib/research';

// Increase timeout for this route (60 seconds)
export const maxDuration = 60;

// Mark as dynamic to avoid static pre-rendering issues
export const dynamic = 'force-dynamic';

interface SuggestSegmentsRequest {
  productName: string;
  productDescription: string;
  websiteUrl?: string;
}

interface SuggestedSegment {
  id: string;
  label: string;
  type: string;
  confidence: 'high' | 'medium' | 'low';
}

export async function POST(request: NextRequest) {
  try {
    const body: SuggestSegmentsRequest = await request.json();
    const { productName, productDescription, websiteUrl } = body;

    // Validate input
    if (!productName || !productDescription) {
      return NextResponse.json(
        { error: 'Missing required fields: productName and productDescription' },
        { status: 400 }
      );
    }

    // Get website content if provided (with timeout and cancellation)
    let websiteContent = '';
    if (websiteUrl) {
      try {
        // Use AbortController to actually cancel the crawl on timeout
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => {
          abortController.abort();
          console.warn('Website fetch timeout - cancelling crawl');
        }, 10000); // 10 second timeout
        
        try {
          websiteContent = await getWebsiteContent({ websiteUrl } as any, abortController.signal);
          clearTimeout(timeoutId);
        } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError' || error.name === 'CanceledError') {
            console.warn('Website fetch cancelled due to timeout');
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.warn('Failed to fetch website content:', error);
        // Continue without website content
      }
    }

    // Build the prompt
    const systemPrompt = `You are a B2B segmentation strategist.
Given a product description and optional website, propose 3–6 distinct primary customer segments that this product could be sold to.

Each segment must:
• Be defined as "role + context" (for example, "CIOs in mid-market manufacturing companies" or "board-certified neurosurgeons in tertiary hospitals").
• Represent a practical go-to-market segment, not abstract labels like "healthcare professionals".
• Be mutually exclusive as much as possible.

Output JSON only, with fields: id, label, type (user, buyer, influencer, etc.), and confidence (high, medium, or low).

Return a JSON object with a "segments" array containing the suggested segments.`;

    const userPrompt = `Product Name: ${productName}

Product Description: ${productDescription}

${websiteContent ? `Website Content (for context):\n${websiteContent.substring(0, 2000)}` : ''}

Generate 3-6 customer segments for this product.`;

    // Call OpenAI with timeout
    let response: string | null = null;
    try {
      const openAIPromise = callOpenAI(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.7,
          response_format: { type: 'json_object' },
          maxTokens: 2000, // Limit tokens for faster response
        }
      );
      
      const timeoutPromise = new Promise<string | null>((resolve) => 
        setTimeout(() => resolve(null), 20000) // 20 second timeout for OpenAI
      );
      
      response = await Promise.race([openAIPromise, timeoutPromise]);
    } catch (error) {
      console.error('OpenAI call error:', error);
      response = null;
    }

    if (!response) {
      console.error('OpenAI returned null or timed out - using fallback segments');
      // Return fallback segments instead of error
      return NextResponse.json({
        segments: [
          {
            id: 'segment_1',
            label: 'Primary users of the product',
            type: 'user',
            confidence: 'medium' as const,
          },
          {
            id: 'segment_2',
            label: 'Economic buyers for the product',
            type: 'buyer',
            confidence: 'medium' as const,
          },
          {
            id: 'segment_3',
            label: 'Influencers in the decision process',
            type: 'influencer',
            confidence: 'medium' as const,
          },
        ],
      });
    }

    // Parse the response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      return NextResponse.json(
        { error: 'Invalid response format from AI' },
        { status: 500 }
      );
    }

    // Validate and format segments
    const segments: SuggestedSegment[] = (parsedResponse.segments || []).map(
      (seg: any, index: number) => ({
        id: seg.id || `segment_${index + 1}`,
        label: seg.label || seg.name || '',
        type: seg.type || 'unknown',
        confidence: seg.confidence || 'medium',
      })
    ).filter((seg: SuggestedSegment) => seg.label.length > 0);

    // Ensure we have at least 3 segments
    if (segments.length < 3) {
      // Fallback: generate generic segments if AI didn't provide enough
      return NextResponse.json({
        segments: [
          {
            id: 'segment_1',
            label: 'Primary users of the product',
            type: 'user',
            confidence: 'medium' as const,
          },
          {
            id: 'segment_2',
            label: 'Economic buyers for the product',
            type: 'buyer',
            confidence: 'medium' as const,
          },
          {
            id: 'segment_3',
            label: 'Influencers in the decision process',
            type: 'influencer',
            confidence: 'medium' as const,
          },
        ],
      });
    }

    return NextResponse.json({ segments });
  } catch (error) {
    console.error('Suggest segments API error:', error);
    return NextResponse.json(
      { error: 'Failed to suggest segments' },
      { status: 500 }
    );
  }
}

