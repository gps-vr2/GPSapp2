import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RequestData {
  lat: number;
  long: number;
  language?: string;
  numberOfDoors?: number;
  info?: string;
  address?: string;
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

// GET: Fetch from view
export async function GET(): Promise<NextResponse> {
  try {
    const buildings = await prisma.building_v_24h.findMany();
    return new NextResponse(safeStringify(buildings), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('GET Error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
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
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    const data: RequestData = JSON.parse(body);
    const {
      lat,
      long,
      language = 'english',
      numberOfDoors = 1,
      info = '',
      address = '',
      territory_id = 1,
      congregationId = 1,
    } = data;

    if (typeof lat !== 'number' || typeof long !== 'number') {
      return new NextResponse(JSON.stringify({ error: 'Invalid coordinates' }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    const building = await prisma.building.create({
      data: {
        lat,
        long,
        address,
        territory_id,
        last_modified: new Date(),
      },
    });

    const doorInfoArray = info.split(',').map((i) => i.trim());
    const doors: DoorData[] = Array.from({ length: Math.max(numberOfDoors, doorInfoArray.length) }).map(
      (_, i) => ({
        language,
        information_name: doorInfoArray[i] || undefined,
        building_id: building.idBuilding,
        id_cong_app: congregationId,
        id_cong_lang: 1,
      })
    );

    await prisma.door.createMany({ data: doors });

    return new NextResponse(
      JSON.stringify({
        message: 'Building and doors created successfully',
        buildingId: building.idBuilding,
      }),
      {
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('POST Error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
