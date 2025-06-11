// app/api/door/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// Helper function to add CORS headers
function addCORSHeaders(response: NextResponse): NextResponse {
  // For development, allow all origins. In production, replace '*' with your frontend's domain.
  response.headers.set('Access-Control-Allow-Origin', '*'); // <-- IMPORTANT: Change '*' in production!
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400'); // Cache preflight requests for 24 hours
  return response;
}

// Handle preflight OPTIONS requests for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 }); // 204 No Content for successful preflight
  return addCORSHeaders(response);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      const errorResponse = NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
      return addCORSHeaders(errorResponse);
    }

    const building = await prisma.building.findUnique({
      where: { idBuilding: id },
      include: {
        Door: true,
      },
    });

    if (!building) {
      const notFoundResponse = NextResponse.json({ error: 'Building not found' }, { status: 404 });
      return addCORSHeaders(notFoundResponse);
    }

    const data = {
      id: building.idBuilding,
      lat: building.lat,
      long: building.long,
      address: building.address,
      numberOfDoors: building.Door.length,
      language: building.Door[0]?.language || 'Unknown',
      info: building.Door[0]?.information_name || '',
    };
    
    const successResponse = NextResponse.json(data);
    return addCORSHeaders(successResponse);
  } catch (error) {
    console.error('GET /api/door/[id] error:', error);
    const errorResponse = NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    return addCORSHeaders(errorResponse);
  }
}

// Add PUT method with CORS headers
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      const errorResponse = NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
      return addCORSHeaders(errorResponse);
    }

    const body = await req.json();
    const { lat, long, address, numberOfDoors, language, info } = body;

    if (lat === undefined || long === undefined || !address || !numberOfDoors || !language || !info) {
      const errorResponse = NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      return addCORSHeaders(errorResponse);
    }

    // Update the building in the database
    const updatedBuilding = await prisma.building.update({
      where: { idBuilding: id },
      data: {
        lat: parseFloat(lat),
        long: parseFloat(long),
        address: String(address),
        Door: { // Assuming Door is related and needs to be updated or created
          upsert: { // Upsert to update if exists, create if not
            where: {
              buildingId_doorId: { // Unique constraint on Door model for buildingId and doorId
                buildingId: id,
                doorId: 1 // Assuming only one door entry per building for simplicity, adjust if multiple
              }
            },
            update: {
              language: String(language),
              information_name: String(info),
            },
            create: {
              doorId: 1, // Create a new door entry
              language: String(language),
              information_name: String(info),
            }
          }
        }
      },
    });

    const successResponse = NextResponse.json({
      message: 'Building updated successfully',
      building: updatedBuilding,
    });
    return addCORSHeaders(successResponse);

  } catch (error) {
    console.error('PUT /api/door/[id] error:', error);
    const errorResponse = NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    return addCORSHeaders(errorResponse);
  }
}


// Add DELETE method with CORS headers
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      const errorResponse = NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
      return addCORSHeaders(errorResponse);
    }

    // Delete associated Door entries first due to foreign key constraints
    await prisma.door.deleteMany({
      where: { buildingId: id },
    });

    // Then delete the building
    await prisma.building.delete({
      where: { idBuilding: id },
    });

    const successResponse = NextResponse.json({ message: 'Building deleted successfully' });
    return addCORSHeaders(successResponse);

  } catch (error) {
    console.error('DELETE /api/door/[id] error:', error);
    const errorResponse = NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    return addCORSHeaders(errorResponse);
  }
}