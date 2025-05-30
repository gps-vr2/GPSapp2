import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Handle OPTIONS preflight requests (for CORS)
export async function OPTIONS() {
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
export async function GET() {
  try {
    const latestBuilding = await prisma.building.findFirst({
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
        language: latestBuilding.Door[0]?.language || 'Unknown',
      },
    }), {
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
  }
}

// Handle POST requests - create building and doors
export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text(); // Read raw text
    if (!bodyText) {
      return new NextResponse(JSON.stringify({ error: 'Empty request body' }), {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    const data = JSON.parse(bodyText); // Safely parse JSON

    console.log("Received data:", data); // Debug log for Vercel logs

    if (!data.lat || !data.long) {
      return new NextResponse(JSON.stringify({ error: 'Latitude and Longitude required' }), {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    const building = await prisma.building.create({
      data: {
        lat: data.lat,
        long: data.long,
        information: data.info,
        territory_id: 1,
      },
    });

    const doors = Array.from({ length: data.numberOfDoors || 1 }).map(() => ({
      language: data.language,
      information_name: data.info,
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
  } catch (error) {
    console.error('POST Error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  }
}
