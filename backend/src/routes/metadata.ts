import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/database.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { logError, logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Validation schemas for metadata
const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

const CreateMechanismSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

const CreatePublisherSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
});

const CreateDesignerSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  bio: z.string().max(1000).optional(),
  website: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
});

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// CATEGORIES ROUTES

/**
 * @route GET /metadata/categories
 * @desc Get all active categories
 * @access Public
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT id, name, slug, description, color, created_at, updated_at
      FROM categories 
      WHERE is_active = true 
      ORDER BY name ASC
    `);

    const categories = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      color: row.color,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    res.json({
      success: true,
      data: {
        categories
      }
    });
  } catch (error) {
    logError('Get categories endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/metadata/categories'
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve categories'
    });
  }
});

/**
 * @route POST /metadata/categories
 * @desc Create a new category
 * @access Admin
 */
router.post('/categories', [authenticateToken, requireAdmin], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = CreateCategorySchema.parse(req.body);
    
    // Generate slug if not provided
    const slug = validatedData.slug || generateSlug(validatedData.name);

    // Check if name or slug already exists
    const existingCheck = await db.query(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER($1) OR LOWER(slug) = LOWER($2)',
      [validatedData.name, slug]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_CATEGORY',
        message: 'Category with this name or slug already exists'
      });
    }

    const categoryId = uuidv4();
    const result = await db.query(`
      INSERT INTO categories (id, name, slug, description, color)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [categoryId, validatedData.name, slug, validatedData.description || null, validatedData.color || null]
    );

    const category = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: {
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          color: category.color,
          createdAt: new Date(category.created_at),
          updatedAt: new Date(category.updated_at),
        }
      }
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as any;
      const firstIssue = zodError.issues[0];
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: firstIssue?.message || 'Invalid category data',
        field: firstIssue?.path?.join('.') || 'unknown'
      });
    }

    logError('Create category endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/metadata/categories',
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to create category'
    });
  }
});

// MECHANISMS ROUTES

/**
 * @route GET /metadata/mechanisms
 * @desc Get all active mechanisms
 * @access Public
 */
router.get('/mechanisms', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT id, name, slug, description, created_at, updated_at
      FROM mechanisms 
      WHERE is_active = true 
      ORDER BY name ASC
    `);

    const mechanisms = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    res.json({
      success: true,
      data: {
        mechanisms
      }
    });
  } catch (error) {
    logError('Get mechanisms endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/metadata/mechanisms'
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve mechanisms'
    });
  }
});

/**
 * @route POST /metadata/mechanisms
 * @desc Create a new mechanism
 * @access Admin
 */
router.post('/mechanisms', [authenticateToken, requireAdmin], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = CreateMechanismSchema.parse(req.body);
    
    // Generate slug if not provided
    const slug = validatedData.slug || generateSlug(validatedData.name);

    // Check if name or slug already exists
    const existingCheck = await db.query(
      'SELECT id FROM mechanisms WHERE LOWER(name) = LOWER($1) OR LOWER(slug) = LOWER($2)',
      [validatedData.name, slug]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_MECHANISM',
        message: 'Mechanism with this name or slug already exists'
      });
    }

    const mechanismId = uuidv4();
    const result = await db.query(`
      INSERT INTO mechanisms (id, name, slug, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [mechanismId, validatedData.name, slug, validatedData.description || null]
    );

    const mechanism = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Mechanism created successfully',
      data: {
        mechanism: {
          id: mechanism.id,
          name: mechanism.name,
          slug: mechanism.slug,
          description: mechanism.description,
          createdAt: new Date(mechanism.created_at),
          updatedAt: new Date(mechanism.updated_at),
        }
      }
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as any;
      const firstIssue = zodError.issues[0];
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: firstIssue?.message || 'Invalid mechanism data',
        field: firstIssue?.path?.join('.') || 'unknown'
      });
    }

    logError('Create mechanism endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/metadata/mechanisms',
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to create mechanism'
    });
  }
});

// PUBLISHERS ROUTES

/**
 * @route GET /metadata/publishers
 * @desc Get all active publishers
 * @access Public
 */
router.get('/publishers', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT id, name, slug, description, website, logo_url, created_at, updated_at
      FROM publishers 
      WHERE is_active = true 
      ORDER BY name ASC
    `);

    const publishers = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      website: row.website,
      logoUrl: row.logo_url,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    res.json({
      success: true,
      data: {
        publishers
      }
    });
  } catch (error) {
    logError('Get publishers endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/metadata/publishers'
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve publishers'
    });
  }
});

/**
 * @route POST /metadata/publishers
 * @desc Create a new publisher
 * @access Admin
 */
router.post('/publishers', [authenticateToken, requireAdmin], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = CreatePublisherSchema.parse(req.body);
    
    // Generate slug if not provided
    const slug = validatedData.slug || generateSlug(validatedData.name);

    // Check if name or slug already exists
    const existingCheck = await db.query(
      'SELECT id FROM publishers WHERE LOWER(name) = LOWER($1) OR LOWER(slug) = LOWER($2)',
      [validatedData.name, slug]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_PUBLISHER',
        message: 'Publisher with this name or slug already exists'
      });
    }

    const publisherId = uuidv4();
    const result = await db.query(`
      INSERT INTO publishers (id, name, slug, description, website, logo_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [publisherId, validatedData.name, slug, validatedData.description || null, validatedData.website || null, validatedData.logoUrl || null]
    );

    const publisher = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Publisher created successfully',
      data: {
        publisher: {
          id: publisher.id,
          name: publisher.name,
          slug: publisher.slug,
          description: publisher.description,
          website: publisher.website,
          logoUrl: publisher.logo_url,
          createdAt: new Date(publisher.created_at),
          updatedAt: new Date(publisher.updated_at),
        }
      }
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as any;
      const firstIssue = zodError.issues[0];
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: firstIssue?.message || 'Invalid publisher data',
        field: firstIssue?.path?.join('.') || 'unknown'
      });
    }

    logError('Create publisher endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/metadata/publishers',
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to create publisher'
    });
  }
});

// DESIGNERS ROUTES

/**
 * @route GET /metadata/designers
 * @desc Get all active designers
 * @access Public
 */
router.get('/designers', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT id, name, slug, bio, website, image_url, created_at, updated_at
      FROM designers 
      WHERE is_active = true 
      ORDER BY name ASC
    `);

    const designers = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      bio: row.bio,
      website: row.website,
      imageUrl: row.image_url,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    res.json({
      success: true,
      data: {
        designers
      }
    });
  } catch (error) {
    logError('Get designers endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/metadata/designers'
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve designers'
    });
  }
});

/**
 * @route POST /metadata/designers
 * @desc Create a new designer
 * @access Admin
 */
router.post('/designers', [authenticateToken, requireAdmin], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = CreateDesignerSchema.parse(req.body);
    
    // Generate slug if not provided
    const slug = validatedData.slug || generateSlug(validatedData.name);

    // Check if name or slug already exists
    const existingCheck = await db.query(
      'SELECT id FROM designers WHERE LOWER(name) = LOWER($1) OR LOWER(slug) = LOWER($2)',
      [validatedData.name, slug]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_DESIGNER',
        message: 'Designer with this name or slug already exists'
      });
    }

    const designerId = uuidv4();
    const result = await db.query(`
      INSERT INTO designers (id, name, slug, bio, website, image_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [designerId, validatedData.name, slug, validatedData.bio || null, validatedData.website || null, validatedData.imageUrl || null]
    );

    const designer = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Designer created successfully',
      data: {
        designer: {
          id: designer.id,
          name: designer.name,
          slug: designer.slug,
          bio: designer.bio,
          website: designer.website,
          imageUrl: designer.image_url,
          createdAt: new Date(designer.created_at),
          updatedAt: new Date(designer.updated_at),
        }
      }
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as any;
      const firstIssue = zodError.issues[0];
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: firstIssue?.message || 'Invalid designer data',
        field: firstIssue?.path?.join('.') || 'unknown'
      });
    }

    logError('Create designer endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/metadata/designers',
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to create designer'
    });
  }
});

export default router;