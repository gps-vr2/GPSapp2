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

// Handle GET requests - fetch all buildings
export async function GET(): Promise<NextResponse> {
  try {
    const buildings = await prisma.building.findMany({
      include: {
        Door: {
          include: {
            Language: {
              select: {
                Color: true, // ✅ include color from Language table
              }
            }
          }
        },
      },
    });
    const buildingsData = buildings.map(building => {
      const firstDoor = building.Door[0];
    
      return {
        id: building.idBuilding,
        lat: building.lat,
        long: building.long,
        address: building.address,
        numberOfDoors: building.Door.length,
        pinColor: firstDoor?.Language?.Color ?? 1, // 🔁 use relation
        pinImage: `/pins/pin${firstDoor?.Language?.Color ?? 1}.png`,
        info: building.Door.map(door => door.information_name).filter(Boolean).join(', ') || undefined,
      };
    });
    

    return new NextResponse(JSON.stringify(buildingsData), {
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

// Handle POST requests - create new building
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const bodyText = await request.text();

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
    console.log("Received create data:", data);

    const { lat, long, language, numberOfDoors, info, address, territory_id } = data;

    if (typeof lat !== 'number' || typeof long !== 'number') {
      return new NextResponse(JSON.stringify({ error: 'Latitude and Longitude must be numbers' }), {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    // Create the building
    const newBuilding = await prisma.building.create({
      data: {
        lat,
        long,
        address: address || null,
        territory_id: territory_id || 1, // Default territory_id if not provided
        last_modified: new Date(),
      },
    });

    // Create doors for the building
    const doorInfoArray = info ? info.split(', ') : [''];
    const doorsToCreate = Math.max(numberOfDoors || 1, doorInfoArray.length);
    
    const doors: DoorData[] = Array.from({ length: doorsToCreate }).map((_, index) => ({
      language: language ?? 'English',
      information_name: doorInfoArray[index] || undefined,
      building_id: newBuilding.idBuilding,
      id_cong_app: 1,
      id_cong_lang: 1,
    }));

    await prisma.door.createMany({ data: doors });

    return new NextResponse(JSON.stringify({ 
      message: 'Building created successfully',
      building: newBuilding 
    }), {
      status: 201,
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