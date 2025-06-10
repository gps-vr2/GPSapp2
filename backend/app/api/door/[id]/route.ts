// app/api/door/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const id = parseInt(context.params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid building ID' }, { status: 400 });
    }

    const building = await prisma.building.findUnique({
      where: { idBuilding: id },
      include: {
        Door: true,
      },
    });

    if (!building) {
      return NextResponse.json({ error: 'Building not found' }, { status: 404 });
    }

    const responseData = {
      id: building.idBuilding,
      lat: building.lat,
      long: building.long,
      address: building.address,
      numberOfDoors: building.Door.length,
      language: building.Door[0]?.language || 'Unknown',
      info: building.Door[0]?.information_name || ''
    };

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('GET /api/door/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, {
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
