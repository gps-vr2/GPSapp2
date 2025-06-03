import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
console.log('Prisma Client initialized');

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

// Handle GET requests - fetch recent buildings
export async function GET() {
  try {
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentBuildings = await prisma.building.findMany({
      where: {
        last_modified: {
          gte: twentyFourHoursAgo,
        },
      },
      include: {
        Door: true,
      },
    });

    if (!recentBuildings || recentBuildings.length === 0) {
      console.log('No recent buildings found');
      return new NextResponse(JSON.stringify({ message: 'No recent buildings found' }), {
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    return new NextResponse(JSON.stringify({
      buildings: recentBuildings.map(b => ({
        id: b.idBuilding,
        lat: b.lat,
        long: b.long,
        information: b.information,
        lastModified: b.last_modified,
        doorCount: b.Door.length,
      })),
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
  } finally {
    await prisma.$disconnect();
  }
}

// Handle POST requests - create building and doors
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, long, info, numberOfDoors, language } = body;

    console.log("Received data:", body);

    if (!lat || !long || !language || !numberOfDoors) {
      return new NextResponse(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    const anyLang = await prisma.language.findFirst({
      where: {
        name: language,
      },
    });

    const anyCong = await prisma.congregation.findFirst();

    if (!anyLang || !anyCong) {
      console.error("Missing Language or Congregation record", { anyLang, anyCong });
      return new NextResponse(JSON.stringify({ error: "Missing related data" }), {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    const building = await prisma.building.create({
      data: {
        lat: lat,
        long: long,
        information: info || null,
        territory_id: null, // Update if needed
      },
    });

    await prisma.door.createMany({
      data: Array.from({ length: numberOfDoors || 1 }).map(() => ({
        language: language,
        information_name: info || null,
        building_id: building.idBuilding,
        id_cong_app: anyCong.idCongregation,
        id_cong_lang: anyLang.id_cong_app,
      })),
    });

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });

  } catch (error: any) {
    console.error("POST /api/door failed:", error);
    return new NextResponse(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  }
}
