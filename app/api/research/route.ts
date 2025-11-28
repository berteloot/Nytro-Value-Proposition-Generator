import { NextRequest, NextResponse } from 'next/server';
import { 
  conductResearch, 
  generateCanvas, 
  identifyJobToBeDone, 
  identifyPainIntensityClusters,
  getWebsiteContent
} from '@/lib/research';
import { UserInput } from '@/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userInput: UserInput = body;

    // Validate input
    if (!userInput.productName || !userInput.description || !userInput.targetDecisionMaker) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Step 1: Identify Job-to-Be-Done using product name and paragraph description
    const jobs = await identifyJobToBeDone(userInput);

    // Step 2: Identify Pain Intensity Clusters based on the job-to-be-done
    const painClusters = await identifyPainIntensityClusters(jobs, userInput);

    // Conduct additional research (web search, etc.)
    // Note: conductResearch already scrapes the website internally via getWebsiteContent
    const research = await conductResearch(userInput);

    // Get website content for product extraction
    // This will use the cache (instant) since conductResearch just scraped it
    const websiteContent = await getWebsiteContent(userInput);

    // Generate canvas using identified jobs and pain clusters
    const canvas = await generateCanvas(research, userInput, jobs, painClusters, websiteContent);

    return NextResponse.json({
      success: true,
      research,
      canvas,
      jobs, // Include jobs for debugging/display
      painClusters, // Include pain clusters for debugging/display
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Research API error:', error);
    return NextResponse.json(
      { error: 'Failed to conduct research' },
      { status: 500, headers: corsHeaders }
    );
  }
}

