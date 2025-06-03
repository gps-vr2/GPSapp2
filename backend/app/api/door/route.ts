import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Type definitions
interface RequestData {
  lat: number;
  long: number;
  language?: string;
  numberOfDoors?: number;
  info?: string;
}

interface DoorData {
  language: string;
  information_name: string | undefined;
  building_id: number;
  id_cong_app: number;
  id_cong_lang: number;
}

// Handle OPTIONS preflight requests (for CORS)
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// Handle GET requests - fetch latest building
export async function GET(): Promise<NextResponse> {
  try {
    const latestBuilding = await prisma.building.findMany({
      orderBy: {
        idBuilding: 'desc',
      },
      include: {
        Door: true,
      },
    });

    if (!latestBuilding) {
      return new NextResponse(JSON.stringify({ message: 'No buildings found' }), {
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    return new NextResponse(JSON.stringify({
      building: {
        id: latestBuilding.idBuilding,
        lat: latestBuilding.lat,
        long: latestBuilding.long,
        information: latestBuilding.information,
        doorCount: latestBuilding.Door.length,
        language: latestBuilding.Door[0]?.language ?? 'Unknown',
      },
    }), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    console.error('GET Error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Handle POST requests - create building and doors
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const bodyText = await req.text();

    if (!bodyText) {
      return new NextResponse(JSON.stringify({ error: 'Empty request body' }), {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    const data: RequestData = JSON.parse(bodyText) as RequestData;
    console.log("Received data:", data);

    const { lat, long, language, numberOfDoors, info } = data;

    if (typeof lat !== 'number' || typeof long !== 'number') {
      return new NextResponse(JSON.stringify({ error: 'Latitude and Longitude must be numbers' }), {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    const building = await prisma.building.create({
      data: {
        lat,
        long,
        information: info,
        territory_id: 1,
      },
    });

    const doors: DoorData[] = Array.from({ length: numberOfDoors || 1 }).map(() => ({
      language: language ?? 'Unknown',
      information_name: info,
      building_id: building.idBuilding,
      id_cong_app: 1,
      id_cong_lang: 1,
    }));

    await prisma.door.createMany({ data: doors });

    return new NextResponse(JSON.stringify({ message: 'Saved successfully' }), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    console.error('POST Error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}