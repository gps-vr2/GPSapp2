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

// Pin color helper
const calculatePinColor = (congregationId: number = 1, language: string = 'english'): number => {
  const map: Record<string, number> = {
    english: 1, tamil: 2, hindi: 3, telugu: 4, malayalam: 5,
  };
  const base = map[language.toLowerCase()] || 1;
  if (congregationId === 1) return base;
  const pin = ((congregationId - 1) * 5) + base;
  return Math.min(pin, 15);
};

// BigInt-safe serializer
function serializeBigInts<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInts) as T;
  } else if (obj && typeof obj === 'object' && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([key, value]) => {
        if (typeof value === 'bigint') return [key, Number(value)];
        return [key, serializeBigInts(value)];
      })
    ) as T;
  }
  return obj;
}

// GET - read from 24H view
export async function GET(): Promise<NextResponse> {
  try {
    const buildings = await prisma.building_v_24h.findMany();
    const safeData = serializeBigInts(buildings);

    return new NextResponse(JSON.stringify(safeData), {
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

// POST - create building and doors
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text();
    if (!body) {
      return new NextResponse(JSON.stringify({ error: 'Empty request body' }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    const data: RequestData = JSON.parse(body);
    const {
      lat, long, language = 'english', numberOfDoors = 1,
      info = '', address = '', territory_id = 1, congregationId = 1,
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

    const doorInfoArray = info.split(',').map(i => i.trim());
    const doors: DoorData[] = Array.from({ length: Math.max(numberOfDoors, doorInfoArray.length) }).map((_, i) => ({
      language,
      information_name: doorInfoArray[i] || undefined,
      building_id: building.idBuilding,
      id_cong_app: congregationId,
      id_cong_lang: 1,
    }));

    await prisma.door.createMany({ data: doors });

    const pinColor = calculatePinColor(congregationId, language);
    const pinImage = `/pins/pin${pinColor}.png`;

    return new NextResponse(JSON.stringify({
      message: 'Building created successfully',
      building: {
        id: building.idBuilding,
        lat, long, address,
        numberOfDoors,
        language,
        congregationId,
        pinColor,
        pinImage,
        info,
      },
    }), {
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
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
