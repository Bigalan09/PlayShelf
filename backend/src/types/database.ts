import { z } from 'zod';

// Base model with common fields
export const BaseModelSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// User related schemas
export const UserSchema = BaseModelSchema.extend({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  passwordHash: z.string(),
  avatar: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  role: z.enum(['user', 'admin']).default('user'),
  emailVerified: z.boolean().default(false),
  lastLoginAt: z.date().optional(),
});

// Game related schemas
export const GameSchema = BaseModelSchema.extend({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  yearPublished: z.number().int().min(1900).max(2100).optional(),
  minPlayers: z.number().int().min(1).optional(),
  maxPlayers: z.number().int().min(1).optional(),
  playingTime: z.number().int().min(1).optional(), // in minutes
  minAge: z.number().int().min(0).optional(),
  complexity: z.number().min(1).max(5).optional(),
  imageUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  bggId: z.number().int().optional(), // BoardGameGeek ID
  averageRating: z.number().min(0).max(10).default(0),
  ratingCount: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

// Collection related schemas
export const CollectionEntrySchema = BaseModelSchema.extend({
  userId: z.string().uuid(),
  gameId: z.string().uuid(),
  status: z.enum(['owned', 'wishlist', 'played', 'for_trade', 'want_in_trade']).default('owned'),
  purchasePrice: z.number().min(0).optional(),
  purchaseDate: z.date().optional(),
  condition: z.enum(['mint', 'excellent', 'good', 'fair', 'poor']).optional(),
  notes: z.string().max(1000).optional(),
  isPublic: z.boolean().default(true),
});

// Review related schemas
export const ReviewSchema = BaseModelSchema.extend({
  userId: z.string().uuid(),
  gameId: z.string().uuid(),
  rating: z.number().min(1).max(10),
  title: z.string().max(255).optional(),
  content: z.string().max(5000).optional(),
  isRecommended: z.boolean().optional(),
  playCount: z.number().int().min(1).default(1),
  difficulty: z.number().min(1).max(5).optional(),
  isPublic: z.boolean().default(true),
  helpfulCount: z.number().int().min(0).default(0),
});

// Game session related schemas
export const GameSessionSchema = BaseModelSchema.extend({
  userId: z.string().uuid(),
  gameId: z.string().uuid(),
  playedAt: z.date(),
  duration: z.number().int().min(1).optional(), // in minutes
  playerCount: z.number().int().min(1),
  location: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
  score: z.number().optional(),
  won: z.boolean().optional(),
  isPublic: z.boolean().default(true),
});

// Category related schemas
export const CategorySchema = BaseModelSchema.extend({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  isActive: z.boolean().default(true),
});

// Game-Category relationship
export const GameCategorySchema = z.object({
  gameId: z.string().uuid(),
  categoryId: z.string().uuid(),
  createdAt: z.date(),
});

// Mechanism related schemas
export const MechanismSchema = BaseModelSchema.extend({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});

// Game-Mechanism relationship
export const GameMechanismSchema = z.object({
  gameId: z.string().uuid(),
  mechanismId: z.string().uuid(),
  createdAt: z.date(),
});

// Publisher related schemas
export const PublisherSchema = BaseModelSchema.extend({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
});

// Game-Publisher relationship
export const GamePublisherSchema = z.object({
  gameId: z.string().uuid(),
  publisherId: z.string().uuid(),
  createdAt: z.date(),
});

// Designer related schemas
export const DesignerSchema = BaseModelSchema.extend({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  bio: z.string().max(1000).optional(),
  website: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
});

// Game-Designer relationship
export const GameDesignerSchema = z.object({
  gameId: z.string().uuid(),
  designerId: z.string().uuid(),
  createdAt: z.date(),
});

// Friendship related schemas
export const FriendshipSchema = BaseModelSchema.extend({
  requesterId: z.string().uuid(),
  receiverId: z.string().uuid(),
  status: z.enum(['pending', 'accepted', 'declined', 'blocked']).default('pending'),
  acceptedAt: z.date().optional(),
});

// Activity log schemas
export const ActivitySchema = BaseModelSchema.extend({
  userId: z.string().uuid(),
  type: z.enum([
    'game_added',
    'game_removed',
    'game_played',
    'review_created',
    'review_updated',
    'friend_added',
    'wishlist_added',
    'collection_updated'
  ]),
  entityType: z.enum(['game', 'review', 'user', 'session']).optional(),
  entityId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
  isPublic: z.boolean().default(true),
});

// Type exports for use throughout the application
export type User = z.infer<typeof UserSchema>;
export type Game = z.infer<typeof GameSchema>;
export type CollectionEntry = z.infer<typeof CollectionEntrySchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type GameSession = z.infer<typeof GameSessionSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type GameCategory = z.infer<typeof GameCategorySchema>;
export type Mechanism = z.infer<typeof MechanismSchema>;
export type GameMechanism = z.infer<typeof GameMechanismSchema>;
export type Publisher = z.infer<typeof PublisherSchema>;
export type GamePublisher = z.infer<typeof GamePublisherSchema>;
export type Designer = z.infer<typeof DesignerSchema>;
export type GameDesigner = z.infer<typeof GameDesignerSchema>;
export type Friendship = z.infer<typeof FriendshipSchema>;
export type Activity = z.infer<typeof ActivitySchema>;

// Database query result types
export type DatabaseResult<T = any> = {
  rows: T[];
  rowCount: number;
  fields: any[];
  command: string;
};

// Migration types
export type Migration = {
  id: string;
  name: string;
  up: (db: any) => Promise<void>;
  down: (db: any) => Promise<void>;
};

export type MigrationRecord = {
  id: string;
  name: string;
  executedAt: Date;
};