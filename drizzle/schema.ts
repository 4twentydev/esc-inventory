import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  unique,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);
export const actionTypeEnum = pgEnum("action_type", ["pull", "return", "shuffle", "import", "adjustment"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  pinHash: text("pin_hash").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Sessions table
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Categories table
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

// Locations (Zones) table
export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
});

// Parts table with JSONB metadata for dynamic headers
export const parts = pgTable("parts", {
  id: uuid("id").primaryKey().defaultRandom(),
  partId: text("part_id").notNull().unique(), // The specific identifier from the list
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  profileImage: text("profile_image"),
  metadata: jsonb("metadata").default({}), // Stores all dynamic columns from the Excel sheet
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Inventory table tracking qty at locations
export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partId: uuid("part_id")
      .notNull()
      .references(() => parts.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    qty: integer("qty").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("inventory_part_location_unique").on(table.partId, table.locationId),
  ]
);

// Movements table (Audit Trail)
export const movements = pgTable("movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  ts: timestamp("ts").notNull().defaultNow(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  partId: uuid("part_id")
    .notNull()
    .references(() => parts.id, { onDelete: "cascade" }),
  fromLocationId: uuid("from_location_id").references(() => locations.id),
  toLocationId: uuid("to_location_id").references(() => locations.id),
  deltaQty: integer("delta_qty").notNull(),
  actionType: actionTypeEnum("action_type").notNull(),
  jobNumber: text("job_number"),
  note: text("note"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  movements: many(movements),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  parts: many(parts),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  inventory: many(inventory),
}));

export const partsRelations = relations(parts, ({ one, many }) => ({
  category: one(categories, {
    fields: [parts.categoryId],
    references: [categories.id],
  }),
  inventory: many(inventory),
  movements: many(movements),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  part: one(parts, {
    fields: [inventory.partId],
    references: [parts.id],
  }),
  location: one(locations, {
    fields: [inventory.locationId],
    references: [locations.id],
  }),
}));

export const movementsRelations = relations(movements, ({ one }) => ({
  user: one(users, {
    fields: [movements.userId],
    references: [users.id],
  }),
  part: one(parts, {
    fields: [movements.partId],
    references: [parts.id],
  }),
  fromLocation: one(locations, {
    fields: [movements.fromLocationId],
    references: [locations.id],
  }),
  toLocation: one(locations, {
    fields: [movements.toLocationId],
    references: [locations.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type Part = typeof parts.$inferSelect;
export type Inventory = typeof inventory.$inferSelect;
export type Movement = typeof movements.$inferSelect;
