import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Rooms table (inventory - 6 pre-defined rooms)
export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  singleRate: real('single_rate').notNull(),
  doubleRate: real('double_rate').notNull(),
  housekeepingStatus: text('housekeeping_status').notNull().default('clean'), // 'clean' | 'dirty'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Guests table (CRM)
export const guests = sqliteTable('guests', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  dietaryRequirements: text('dietary_requirements'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Groups/Events table (parent bookings)
export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  groupName: text('group_name').notNull(),
  primaryContactId: text('primary_contact_id').references(() => guests.id),
  groupDiscountAmount: real('group_discount_amount').default(0),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Room Bookings table (child bookings)
export const roomBookings = sqliteTable('room_bookings', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  roomId: text('room_id').notNull().references(() => rooms.id),
  guestId: text('guest_id').references(() => guests.id),
  secondGuestId: text('second_guest_id').references(() => guests.id),
  checkIn: integer('check_in', { mode: 'timestamp' }).notNull(),
  checkOut: integer('check_out', { mode: 'timestamp' }).notNull(),
  occupancyType: text('occupancy_type').notNull(), // 'single' | 'double'
  manualDiscount: real('manual_discount').default(0),
  mealCookedBreakfast: integer('meal_cooked_breakfast', { mode: 'boolean' }).default(false),
  mealContinentalBreakfast: integer('meal_continental_breakfast', { mode: 'boolean' }).default(false),
  mealPackedLunch: integer('meal_packed_lunch', { mode: 'boolean' }).default(false),
  mealCost: real('meal_cost').default(0),
  depositAmount: real('deposit_amount').default(0),
  depositPaid: integer('deposit_paid', { mode: 'boolean' }).default(false),
  balancePaid: integer('balance_paid', { mode: 'boolean' }).default(false),
  paymentNotes: text('payment_notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Settings table (single row for global settings)
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey().default('default'),
  bnbName: text('bnb_name').notNull().default('My B&B'),
  bnbEmail: text('bnb_email'),
  bnbPhone: text('bnb_phone'),
  bnbAddress: text('bnb_address'),
  checkInTime: text('check_in_time').default('14:00'),
  checkOutTime: text('check_out_time').default('11:00'),
  currency: text('currency').default('GBP'),
  taxRate: real('tax_rate').default(0), // VAT/Tax percentage
  defaultMealCookedPrice: real('default_meal_cooked_price').default(12),
  defaultMealContinentalPrice: real('default_meal_continental_price').default(8),
  defaultMealPackedPrice: real('default_meal_packed_price').default(10),
  cancellationPolicy: text('cancellation_policy'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;

export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;

export type RoomBooking = typeof roomBookings.$inferSelect;
export type NewRoomBooking = typeof roomBookings.$inferInsert;

export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
