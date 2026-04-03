import { db } from '../src/db/client';
import { rooms } from '../src/db/schema';
import { v4 as uuidv4 } from 'uuid';

async function seedRooms() {
  console.log('Seeding rooms...');

  const roomsData = [
    {
      id: uuidv4(),
      name: 'Double Hobbit hut',
      singleRate: 80,
      doubleRate: 120,
      housekeepingStatus: 'clean',
      createdAt: new Date(),
    },
    {
      id: uuidv4(),
      name: 'Twin Hobbit hut',
      singleRate: 75,
      doubleRate: 110,
      housekeepingStatus: 'clean',
      createdAt: new Date(),
    },
    {
      id: uuidv4(),
      name: 'Mermaid Room',
      singleRate: 90,
      doubleRate: 140,
      housekeepingStatus: 'clean',
      createdAt: new Date(),
    },
    {
      id: uuidv4(),
      name: 'Fairy Room',
      singleRate: 85,
      doubleRate: 130,
      housekeepingStatus: 'clean',
      createdAt: new Date(),
    },
    {
      id: uuidv4(),
      name: 'Woodland Room',
      singleRate: 95,
      doubleRate: 150,
      housekeepingStatus: 'clean',
      createdAt: new Date(),
    },
    {
      id: uuidv4(),
      name: 'Nania Room',
      singleRate: 100,
      doubleRate: 160,
      housekeepingStatus: 'clean',
      createdAt: new Date(),
    },
  ];

  try {
    await db.insert(rooms).values(roomsData);
    console.log('✓ Successfully seeded 6 rooms');
  } catch (error) {
    console.error('Error seeding rooms:', error);
    process.exit(1);
  }
}

seedRooms();
