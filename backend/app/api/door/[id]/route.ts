// app/api/door/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic'; // ✅ THIS FIXES THE TYPE ERROR

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
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

    return NextResponse.json({
      id: building.idBuilding,
      lat: building.lat,
      long: building.long,
      address: building.address,
      numberOfDoors: building.Door.length,
      language: building.Door[0]?.language || 'Unknown',
      info: building.Door[0]?.information_name || '',
    });
  } catch (error) {
    console.error('GET /api/door/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
