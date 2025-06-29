import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RequestData {
  lat: number;
  long: number;
  language?: string;
  numberOfDoors?: number;
  addressInfo?: string[];
  buildingAddress?: string;
  territory_id?: number;
  congregationId?: number;
}

interface DoorData {
  language: string;
  information_name: string | undefined;
  building_id: number;
  id_cong_app: number;
  id_cong_lang: number;
}

// Helper to stringify BigInt
function safeStringify(obj: unknown): string {
  return JSON.stringify(obj, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// Handle preflight OPTIONS request
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// GET: Fetch from view with language filtering
export async function GET(): Promise<NextResponse> {
  try {
    const buildings = await prisma.building_v_24h.findMany({
      where: {
        language: {
          not: null // Only get buildings where language is not null
        }
      }
    });
    return new NextResponse(safeStringify(buildings), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('GET Error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: corsHeaders,
    });
  } finally {
    await prisma.$disconnect();
  }
}

// POST: Create building + doors
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text();
    if (!body) {
      return new NextResponse(JSON.stringify({ error: 'Empty body' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const data: RequestData = JSON.parse(body);
    const {
      lat,
      long,
      language = 'english',
      numberOfDoors = 1,
      addressInfo = [],
      buildingAddress = '',
      territory_id = 1,
      congregationId = 1,
    } = data;

    if (typeof lat !== 'number' || typeof long !== 'number') {
      return new NextResponse(JSON.stringify({ error: 'Invalid coordinates' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const building = await prisma.building.create({
      data: {
        lat,
        long,
        address: buildingAddress,
        territory_id,
        last_modified: new Date(),
      },
    });

    // Create doors based on addressInfo array
    const doors: DoorData[] = addressInfo.slice(0, numberOfDoors).map((doorAddress) => ({
      language,
      information_name: doorAddress || undefined,
      building_id: building.idBuilding,
      id_cong_app: congregationId,
      id_cong_lang: 1,
    }));

    if (doors.length > 0) {
      await prisma.door.createMany({ data: doors });
    }

    return new NextResponse(
      JSON.stringify({
        message: 'Building and doors created successfully',
        buildingId: building.idBuilding,
      }),
      {
        status: 201,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error('POST Error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: corsHeaders,
    });
  } finally {
    await prisma.$disconnect();
  }
}