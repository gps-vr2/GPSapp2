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
  address?: string; // Optional address field
}

interface DoorData {
  language: string;
  information_name: string | undefined;
  building_id: number;
  id_cong_app: number;
  id_cong_lang: number;
}

// Add type for building with doors
interface BuildingWithDoors {
  idBuilding: number;
  lat: number;
  long: number;
  information: string | null;
  territory_id: number;
  Door: Array<{
    language: string;
    information_name: string | null;
    building_id: number;
    id_cong_app: number;
    id_cong_lang: number;
  }>;
}

// Add type for the response building data
interface BuildingResponse {
  id: number;
  lat: number;
  long: number;
  information: string | null;
  address: string | null;
  doorCount: number;
  language: string;
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

// Handle GET requests - fetch ALL buildings (not just latest)
export async function GET(): Promise<NextResponse> {
  try {
    // Get ALL buildings instead of just the first one
    const buildings = await prisma.building.findMany({
      orderBy: {
        idBuilding: 'desc',
      },
      include: {
        Door: true,
      },
    }) as BuildingWithDoors[];

    if (!buildings || buildings.length === 0) {
      return new NextResponse(JSON.stringify({ message: 'No buildings found' }), {
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    // Map all buildings to the expected format
    const buildingsData: BuildingResponse[] = buildings.map((building: BuildingWithDoors) => ({
      id: building.idBuilding,
      lat: building.lat,
      long: building.long,
      information: building.information,
      address: building.address ?? null,
      doorCount: building.Door.length,
      language: building.Door[0]?.language ?? 'Unknown',
    }));

    return new NextResponse(JSON.stringify({
      buildings: buildingsData, // Return as 'buildings' array
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

    const { lat, long, language, numberOfDoors, info, address } = data;

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
        address: address
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