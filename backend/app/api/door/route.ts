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
type BuildingResult = {
  id: number;
  lat: number;
  long: number;
  congregation_name: string;
  pinColor: string;
  language: string;
};

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

// ✅ Handle GET requests - fetch buildings from last 24h with color
export async function GET(): Promise<NextResponse> {
  try {
    const buildings = await prisma.$queryRaw`
      SELECT 
        b.idBuilding AS id,
        b.lat,
        b.long,
        c.name AS congregation_name,
        c.pinColor,
        l.name AS language
      FROM Building b
      JOIN Door d ON d.building_id = b.idBuilding
      JOIN Congregation c ON d.id_cong_app = c.idCongregation
      JOIN Language l ON d.id_cong_lang = l.id_cong_app
      WHERE b.last_modified >= NOW() - INTERVAL 1 DAY
    `;

    const pins = (buildings as BuildingResult[]).map((b) => ({
      id: b.id,
      position: [b.lat, b.long],
      title: b.congregation_name,
      pinColor: b.pinColor,
      language: b.language,
    }));

    return new NextResponse(JSON.stringify(pins), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
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

// ✅ Handle POST requests - create new building
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
        territory_id: territory_id || 1,
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
      id_cong_app: 1, // 🔁 Replace this with dynamic value if needed
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
  } catch (error) {
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
