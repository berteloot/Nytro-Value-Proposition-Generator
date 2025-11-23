import { NextRequest, NextResponse } from 'next/server';
import { generateProspectUniverse } from '@/lib/universe-generator';
import { ValuePropositionCanvas } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { canvas }: { canvas: ValuePropositionCanvas } = body;

    if (!canvas) {
      return NextResponse.json(
        { error: 'Missing canvas' },
        { status: 400 }
      );
    }

    const segments = await generateProspectUniverse(canvas);

    return NextResponse.json({
      success: true,
      segments,
    });
  } catch (error) {
    console.error('Generate universe API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate prospect universe' },
      { status: 500 }
    );
  }
}

