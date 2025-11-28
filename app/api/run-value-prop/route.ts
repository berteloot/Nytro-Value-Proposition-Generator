import { NextRequest, NextResponse } from 'next/server';
import { runValuePropFlow } from '@/lib/value-prop-flow';
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate that body matches UserInput structure
    if (!body.productName || !body.description || !body.targetDecisionMaker) {
      return NextResponse.json(
        { error: 'Missing required fields: productName, description, targetDecisionMaker' },
        { status: 400, headers: corsHeaders }
      );
    }

    const userInput: UserInput = {
      productName: body.productName,
      description: body.description,
      targetDecisionMaker: body.targetDecisionMaker,
      websiteUrl: body.websiteUrl,
      primarySegment: body.primarySegment,
      primaryJobId: body.primaryJobId,
      companyName: body.companyName,
    };

    const result = await runValuePropFlow(userInput);

    return NextResponse.json({
      success: true,
      ...result,
    }, { headers: corsHeaders });
  } catch (error: any) {
    // Log full error details server-side only (may contain sensitive information)
    console.error('Run value prop flow API error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause,
    });
    // Return generic error message to client (never expose API keys or sensitive details)
    // Only include stack trace in development for debugging, but sanitize it
    const sanitizedError = process.env.NODE_ENV === 'development' 
      ? (error.message || 'Failed to run value proposition flow')
      : 'Failed to run value proposition flow';
    return NextResponse.json(
      { 
        error: sanitizedError,
        // Stack traces in development can help debug but should be sanitized
        details: process.env.NODE_ENV === 'development' ? error.stack?.replace(/api[_-]?key/gi, '[REDACTED]') : undefined,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

