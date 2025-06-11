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

// Handle OPTIONS preflight requests (for CORS)
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// Handle GET requests - fetch single building by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Await the params in Next.js 15
    const params = await context.params;
    const { id } = params;
    const buildingId = parseInt(id);

    if (isNaN(buildingId)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid building ID' }), {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    const building = await prisma.building.findUnique({
      where: {
        idBuilding: buildingId,
      },
      include: {
        Door: true,
      },
    }) as BuildingWithDoors | null;

    if (!building) {
      return new NextResponse(JSON.stringify({ error: 'Building not found' }), {
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    // Transform the data to match the expected format
    const buildingData = {
      lat: building.lat,
      long: building.long,
      address: building.address,
      numberOfDoors: building.Door.length,
      language: building.Door[0]?.language || 'English',
      info: building.Door.map(door => door.information_name).filter(Boolean).join(', ') || undefined,
    };

    return new NextResponse(JSON.stringify(buildingData), {
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

// Handle PUT requests - update building and doors by ID
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Await the params in Next.js 15
    const params = await context.params;
    const { id } = params;
    const buildingId = parseInt(id);

    if (isNaN(buildingId)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid building ID' }), {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

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
    console.log("Received update data:", data);

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

    // Check if building exists
    const existingBuilding = await prisma.building.findUnique({
      where: { idBuilding: buildingId },
      include: { Door: true },
    });

    if (!existingBuilding) {
      return new NextResponse(JSON.stringify({ error: 'Building not found' }), {
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    // Update building data
    const updatedBuilding = await prisma.building.update({
      where: { idBuilding: buildingId },
      data: {
        lat,
        long,
        address: address || null,
        last_modified: new Date(),
      },
    });

    // Delete existing doors
    await prisma.door.deleteMany({
      where: { building_id: buildingId },
    });

    // Create new doors based on updated data
    const doorInfoArray = info ? info.split(', ') : [''];
    const doorsToCreate = Math.max(numberOfDoors || 1, doorInfoArray.length);
    
    const doors: DoorData[] = Array.from({ length: doorsToCreate }).map((_, index) => ({
      language: language ?? 'English',
      information_name: doorInfoArray[index] || undefined,
      building_id: buildingId,
      id_cong_app: 1,
      id_cong_lang: 1,
    }));

    await prisma.door.createMany({ data: doors });

    return new NextResponse(JSON.stringify({ 
      message: 'Building updated successfully',
      building: updatedBuilding 
    }), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    console.error('PUT Error:', error);
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

// Handle DELETE requests - delete building and its doors by ID
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Await the params in Next.js 15
    const params = await context.params;
    const { id } = params;
    const buildingId = parseInt(id);

    if (isNaN(buildingId)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid building ID' }), {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    // Check if building exists
    const existingBuilding = await prisma.building.findUnique({
      where: { idBuilding: buildingId },
      include: { Door: true },
    });

    if (!existingBuilding) {
      return new NextResponse(JSON.stringify({ error: 'Building not found' }), {
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    // Delete doors first (due to foreign key constraint)
    await prisma.door.deleteMany({
      where: { building_id: buildingId },
    });

    // Delete the building
    await prisma.building.delete({
      where: { idBuilding: buildingId },
    });

    return new NextResponse(JSON.stringify({ 
      message: 'Building deleted successfully',
      deletedBuildingId: buildingId 
    }), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    console.error('DELETE Error:', error);
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