import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Handle BigInt safely
function safeJson(obj: unknown) {
  return JSON.stringify(obj, (_, v) =>
    typeof v === 'bigint' ? Number(v) : v
  );
}

// Helper to calculate pin color
const calculatePinColor = (congId: number, lang: string): number => {
  const baseMap: { [key: string]: number } = {
    english: 1, tamil: 2, hindi: 3, telugu: 4, malayalam: 5,
  };
  const base = baseMap[lang.toLowerCase()] || 1;
  if (congId === 1) return base;
  const pin = (congId - 1) * 5 + base;
  return Math.min(pin, 15);
};

// GET buildings from Building_v_24h
export async function GET(): Promise<NextResponse> {
  try {
    const data = await prisma.building_v_24h.findMany();
    return new NextResponse(safeJson(data), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('GET Error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST to create new building + doors
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const {
      lat,
      long,
      language = 'english',
      numberOfDoors = 1,
      info = '',
      address = '',
      territory_id = 1,
      congregationId = 1
    } = body;

    if (typeof lat !== 'number' || typeof long !== 'number') {
      return new NextResponse(JSON.stringify({ error: 'Latitude and Longitude must be numbers' }), { status: 400 });
    }

    const newBuilding = await prisma.building.create({
      data: {
        lat,
        long,
        address,
        territory_id,
        last_modified: new Date(),
      },
    });

    const infoArray = info.split(',').map((s: string) => s.trim());
    const doorsData = Array.from({ length: Math.max(numberOfDoors, infoArray.length) }).map((_, idx) => ({
      language,
      information_name: infoArray[idx] || undefined,
      building_id: newBuilding.idBuilding,
      id_cong_app: congregationId,
      id_cong_lang: 1, // optionally map this
    }));

    await prisma.door.createMany({ data: doorsData });

    const pinColor = calculatePinColor(congregationId, language);
    const pinImage = `/pins/pin${pinColor}.png`;

    return new NextResponse(
      safeJson({
        message: 'Building created successfully',
        building: {
          id: newBuilding.idBuilding,
          lat,
          long,
          address,
          numberOfDoors,
          language,
          congregationId,
          pinColor,
          pinImage,
          info
        },
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('POST Error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
