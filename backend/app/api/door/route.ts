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
  congregationId?: number; // Add congregation ID
}

interface DoorData {
  language: string;
  information_name: string | undefined;
  building_id: number;
  id_cong_app: number;
  id_cong_lang: number;
}

// Function to calculate pin color based on congregation and language
const calculatePinColor = (congregationId: number = 1, language: string = 'english'): number => {
  // Language-based pin color mapping for congregation 1 (default)
  const defaultLanguagePinMap: { [key: string]: number } = {
    'english': 1,
    'tamil': 2,
    'hindi': 3,
    'spanish': 4,
    'french': 5,
    'telugu': 6,
    'malayalam': 7,
    'kannada': 8,
    'gujarati': 9,
    'bengali': 10,
    'marathi': 11,
    'punjabi': 12,
    'urdu': 13,
    'oriya': 14,
    'assamese': 15,
  };
  
  let pinColor = 1; // Default
  
  if (congregationId === 1) {
    // Default congregation - use language mapping
    pinColor = defaultLanguagePinMap[language.toLowerCase()] || 1;
  } else {
    // Other congregations - use congregation ID + language offset
    const languageOffset = defaultLanguagePinMap[language.toLowerCase()] || 1;
    pinColor = ((congregationId - 1) * 5) + languageOffset;
    
    // Ensure we don't exceed 15 colors
    if (pinColor > 15) {
      pinColor = ((pinColor - 1) % 15) + 1;
    }
  }
  
  return pinColor;
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
                name: true, // Include language name
              }
            }
          }
        },
      },
    });
    
    const buildingsData = buildings.map(building => {
      const firstDoor = building.Door[0];
      
      // Get congregation ID from first door or default to 1
      const congregationId = firstDoor?.id_cong_app || 1;
      const language = firstDoor?.Language?.name || 'english';
      
      // Calculate pin color based on congregation and language
      let pinColor = 1; // Default
      
      if (firstDoor?.Language?.Color) {
        // Use color from database if available
        pinColor = firstDoor.Language.Color;
      } else {
        // Calculate based on congregation and language
        pinColor = calculatePinColor(congregationId, language);
      }
    
      return {
        id: building.idBuilding,
        lat: building.lat,
        long: building.long,
        address: building.address,
        numberOfDoors: building.Door.length,
        pinColor: pinColor,
        pinImage: `/pins/pin${pinColor}.png`,
        info: building.Door.map(door => door.information_name).filter(Boolean).join(', ') || undefined,
        congregationId: congregationId, // Include congregation ID in response
        language: language, // Include language in response
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

    const { 
      lat, 
      long, 
      language = 'english', 
      numberOfDoors, 
      info, 
      address, 
      territory_id,
      congregationId = 1 // Default congregation ID
    } = data;

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
      language: language,
      information_name: doorInfoArray[index] || undefined,
      building_id: newBuilding.idBuilding,
      id_cong_app: congregationId, // Use provided congregation ID
      id_cong_lang: 1, // This might need to be mapped based on language
    }));

    await prisma.door.createMany({ data: doors });

    // Calculate pin color for response
    const pinColor = calculatePinColor(congregationId, language);

    return new NextResponse(JSON.stringify({ 
      message: 'Building created successfully',
      building: {
        ...newBuilding,
        pinColor,
        pinImage: `/pins/pin${pinColor}.png`,
        congregationId,
        language
      }
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