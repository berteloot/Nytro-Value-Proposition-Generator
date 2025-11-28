import { NextRequest, NextResponse } from 'next/server';
import { generateProspectUniverse } from '@/lib/universe-generator';
import { ValuePropositionCanvas } from '@/types';

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
    const { canvas }: { canvas: ValuePropositionCanvas } = body;

    if (!canvas) {
      return NextResponse.json(
        { error: 'Missing canvas' },
        { status: 400, headers: corsHeaders }
      );
    }

    const segments = await generateProspectUniverse(canvas);

    return NextResponse.json({
      success: true,
      segments,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Generate universe API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate prospect universe' },
      { status: 500, headers: corsHeaders }
    );
  }
}

