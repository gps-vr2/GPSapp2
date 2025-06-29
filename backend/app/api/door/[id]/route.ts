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
  pinColor?: number;
  pinImage?: string;
}

interface DoorData {
  language: string;
  information_name: string | undefined;
  building_id: number;
  id_cong_app: number;
  id_cong_lang: number;
}

// Helper to stringify BigInt and format response
function safeStringify(obj: unknown): string {
  return JSON.stringify(obj, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
}

// GET: Fetch from Building_v_24h view
export async function GET(): Promise<NextResponse> {
  try {
    // Query the Building_v_24h view that joins with Language table for color
    const buildings = await prisma.building_v_24h.findMany({
      select: {
        id: true,
        lat: true,
        long: true,
        address: true,
        last_modified: true,
        numberOfDoors: true,
        info: true,
        language: true,
        congregationId: true,
        pinColor: true,
        pinImage: true
      }
    });

    // Transform the data to match your expected output format
    const transformedBuildings = buildings.map(building => ({
      id: Number(building.id),
      lat: Number(building.lat),
      long: Number(building.long),
      address: building.address || "Example Address",
      last_modified: building.last_modified,
      numberOfDoors: String(building.numberOfDoors || 1),
      info: building.info || "No info available",
      language: building.language || "Tamil",
      congregationId: Number(building.congregationId),
      pinColor: Number(building.pinColor),
      pinImage: building.pinImage || "/pins/pin1.png"
    }));

    console.log(`Found ${transformedBuildings.length} buildings in last 24 hours`);
    
    return new NextResponse(safeStringify(transformedBuildings), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('GET Error:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Internal Server Error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
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

// POST: Create building + doors
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text();
    if (!body) {
      return new NextResponse(JSON.stringify({ error: 'Empty body' }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    const data: RequestData = JSON.parse(body);
    const {
      lat,
      long,
      language = 'Tamil',
      numberOfDoors = 1,
      info = '',
      address = '',
      territory_id = 1,
      congregationId = 1,
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

    // Create building with current timestamp
    const building = await prisma.building.create({
      data: {
        lat,
        long,
        address,
        territory_id,
        last_modified: new Date(),
      },
    });

    // Create doors - split info by comma for multiple doors
    const doorInfoArray = info.split(',').map((i) => i.trim());
    const doors: DoorData[] = Array.from({ length: Math.max(numberOfDoors, doorInfoArray.length) }).map(
      (_, i) => ({
        language,
        information_name: doorInfoArray[i] || `Door ${i + 1} info`,
        building_id: building.idBuilding,
        id_cong_app: congregationId,
        id_cong_lang: 1, // You may need to adjust this based on your Language table
      })
    );

    await prisma.door.createMany({ data: doors });

    console.log(`Created building ${building.idBuilding} with ${doors.length} doors`);

    // Return success response
    return new NextResponse(
      JSON.stringify({
        message: 'Building and doors created successfully',
        buildingId: building.idBuilding,
        doorsCreated: doors.length,
        language: language,
        congregationId: congregationId
      }),
      {
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('POST Error:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Internal Server Error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
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

// PUT: Update building + doors  
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const buildingId = parseInt(id, 10);
    if (isNaN(buildingId)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid building ID' }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    const body = await request.text();
    if (!body) {
      return new NextResponse(JSON.stringify({ error: 'Empty body' }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    const data: RequestData = JSON.parse(body);
    const {
      lat,
      long,
      language = 'Tamil',
      numberOfDoors = 1,
      info = '',
      address = '',
      territory_id = 1,
      congregationId = 1,
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

    // Check if building exists
    const existingBuilding = await prisma.building.findUnique({
      where: { idBuilding: buildingId },
    });

    if (!existingBuilding) {
      return new NextResponse(JSON.stringify({ error: 'Building not found' }), {
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    // Update building with current timestamp
    const updatedBuilding = await prisma.building.update({
      where: { idBuilding: buildingId },
      data: {
        lat,
        long,
        address,
        territory_id,
        last_modified: new Date(),
      },
    });

    // Delete existing doors for this building
    await prisma.door.deleteMany({
      where: { building_id: buildingId },
    });

    // Create new doors based on the updated info
    const doorInfoArray = info.split(',').map((i) => i.trim());
    const doorsToCreate: DoorData[] = Array.from({ length: Math.max(numberOfDoors, doorInfoArray.length) }).map(
      (_, i) => ({
        language,
        information_name: doorInfoArray[i] || `Door ${i + 1} info`,
        building_id: buildingId,
        id_cong_app: congregationId,
        id_cong_lang: 1, // This should match the Language table entry for proper pinColor/pinImage
      })
    );

    await prisma.door.createMany({ data: doorsToCreate });

    console.log(`Updated building ${updatedBuilding.idBuilding} with ${doorsToCreate.length} doors`);

    // Return success response
    return new NextResponse(
      JSON.stringify({
        message: 'Building and doors updated successfully',
        buildingId: updatedBuilding.idBuilding,
        doorsUpdated: doorsToCreate.length,
        language: language,
        congregationId: congregationId
      }),
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('PUT Error:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Internal Server Error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
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

// DELETE: Delete building + doors
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const buildingId = parseInt(id, 10);
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
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' }), {
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

// OPTIONS: Handle CORS preflight
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}