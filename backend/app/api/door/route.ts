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
}

interface DoorData {
  language: string;
  information_name: string | undefined;
  building_id: number;
  id_cong_app: number;
  id_cong_lang: number;
}


interface BuildingWithDoors {
  idBuilding: number;
  lat: number;
  long: number;
  address: string | null; 
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
  address: string | null;
  doorCount: number;
  language: string;
}
interface Building24hView {
  lat: number;
  long: number;
  last_modified: Date;
}

// Type for coordinates
interface Coordinates {
  lat: number;
  long: number;
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
// Type definition for the 24-hour view data


export async function GET(): Promise<NextResponse> {
  try {
    
    const buildings24h = await prisma.$queryRaw<Building24hView[]>`
      SELECT lat,  \`long\`, last_modified 
      FROM Building_v_24h 
      ORDER BY last_modified DESC
    `;

    if (!buildings24h || buildings24h.length === 0) {
      return new NextResponse(JSON.stringify({ message: 'No buildings found within 24 hours' }), {
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    // Extract coordinates from the view results
    const coordinates: Coordinates[] = buildings24h.map((b: Building24hView) => ({ lat: b.lat, long: b.long }));

    // Get full building data with doors for buildings that match the 24h view coordinates
    const buildings = await prisma.building.findMany({
      where: {
        OR: coordinates.map((coord: Coordinates) => ({
          AND: [
            { lat: coord.lat },
            { long: coord.long }
          ]
        }))
      },
      orderBy: {
        last_modified: 'desc',
      },
      include: {
        Door: true,
      },
    }) as BuildingWithDoors[];

    // Map all buildings to the expected format
    const buildingsData: BuildingResponse[] = buildings.map((building: BuildingWithDoors) => ({
      id: building.idBuilding,
      lat: building.lat,
      long: building.long,
      address: building.address,
      doorCount: building.Door.length,
      language: building.Door[0]?.language ?? 'Unknown',
    }));

    return new NextResponse(JSON.stringify({
      buildings: buildingsData,
      count: buildingsData.length,
      message: 'Buildings from last 24 hours retrieved successfully'
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