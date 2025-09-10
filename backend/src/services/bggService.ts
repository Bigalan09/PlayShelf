import { z } from 'zod';
import { logError, logger } from '../utils/logger.js';

// BGG API response schemas
export const BGGGameSchema = z.object({
  id: z.number(),
  name: z.string(),
  yearPublished: z.number().optional(),
  minPlayers: z.number().optional(),
  maxPlayers: z.number().optional(),
  playingTime: z.number().optional(),
  minAge: z.number().optional(),
  averageRating: z.number().optional(),
  bayesAverageRating: z.number().optional(),
  usersRated: z.number().optional(),
  rank: z.number().optional(),
  thumbnail: z.string().url().optional(),
  image: z.string().url().optional(),
  description: z.string().optional(),
});

export const BGGSearchResultSchema = z.object({
  games: z.array(z.object({
    id: z.number(),
    name: z.string(),
    yearPublished: z.number().optional(),
  })),
});

export type BGGGame = z.infer<typeof BGGGameSchema>;
export type BGGSearchResult = z.infer<typeof BGGSearchResultSchema>;

export interface BGGRatingData {
  averageRating: number;
  bayesAverageRating: number;
  usersRated: number;
  rank?: number;
}

export class BGGService {
  private static readonly BASE_URL = 'https://boardgamegeek.com/xmlapi2';
  private static readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private static readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests
  private static lastRequestTime = 0;

  /**
   * Search for games on BGG by title
   */
  static async searchGames(query: string, exact = false): Promise<BGGSearchResult> {
    try {
      await this.respectRateLimit();

      const searchType = exact ? 'boardgame' : 'boardgame';
      const exactParam = exact ? '&exact=1' : '';
      const url = `${this.BASE_URL}/search?query=${encodeURIComponent(query)}&type=${searchType}${exactParam}`;

      logger.info('BGG search request', { query, exact, url });

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PlayShelf/1.0.0 (Board Game Collection Tracker)',
        },
        // Note: Node.js fetch doesn't support timeout directly
        // In production, consider using a wrapper with AbortController
      });

      if (!response.ok) {
        throw new Error(`BGG API error: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      const games = this.parseSearchXML(xmlText);

      logger.info('BGG search completed', { query, resultCount: games.length });

      return { games };
    } catch (error) {
      logError('BGG search failed', error instanceof Error ? error : new Error('Unknown error'), {
        query,
        exact
      });
      
      // Return empty result on error to prevent blocking the application
      return { games: [] };
    }
  }

  /**
   * Get detailed game information by BGG ID (rating only for PlayShelf)
   */
  static async getGameById(bggId: number): Promise<BGGRatingData | null> {
    try {
      await this.respectRateLimit();

      const url = `${this.BASE_URL}/thing?id=${bggId}&stats=1`;

      logger.info('BGG game details request', { bggId, url });

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PlayShelf/1.0.0 (Board Game Collection Tracker)',
        },
      });

      if (!response.ok) {
        throw new Error(`BGG API error: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      const ratingData = this.parseGameXML(xmlText);

      if (ratingData) {
        logger.info('BGG game data retrieved', { bggId, averageRating: ratingData.averageRating });
      } else {
        logger.warn('BGG game not found', { bggId });
      }

      return ratingData;
    } catch (error) {
      logError('BGG game retrieval failed', error instanceof Error ? error : new Error('Unknown error'), {
        bggId
      });
      
      // Return null on error to prevent blocking
      return null;
    }
  }

  /**
   * Import rating data for a game by BGG ID
   */
  static async importGameRating(bggId: number): Promise<BGGRatingData | null> {
    try {
      const ratingData = await this.getGameById(bggId);
      
      if (ratingData && ratingData.averageRating > 0) {
        logger.info('BGG rating imported', { 
          bggId, 
          averageRating: ratingData.averageRating,
          usersRated: ratingData.usersRated 
        });
      }

      return ratingData;
    } catch (error) {
      logError('BGG rating import failed', error instanceof Error ? error : new Error('Unknown error'), {
        bggId
      });
      return null;
    }
  }

  /**
   * Generate BGG URL for a game
   */
  static generateGameURL(bggId: number, gameName?: string): string {
    const baseUrl = `https://boardgamegeek.com/boardgame/${bggId}`;
    if (gameName) {
      const slug = gameName.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/--+/g, '-') // Replace multiple hyphens with single
        .trim();
      return `${baseUrl}/${slug}`;
    }
    return baseUrl;
  }

  /**
   * Respect BGG rate limits
   */
  private static async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const delay = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Parse BGG search XML response
   */
  private static parseSearchXML(xmlText: string): Array<{ id: number; name: string; yearPublished?: number }> {
    try {
      // Simple XML parsing for search results
      const games: Array<{ id: number; name: string; yearPublished?: number }> = [];
      
      // Extract items using regex (simple approach for BGG's consistent format)
      const itemRegex = /<item[^>]*id="(\d+)"[^>]*>/g;
      const nameRegex = /<name[^>]*value="([^"]*)"[^>]*primary="true"/g;
      const yearRegex = /<yearpublished[^>]*value="(\d+)"/g;
      
      let itemMatch;
      const items = [];
      
      while ((itemMatch = itemRegex.exec(xmlText)) !== null) {
        items.push({
          id: parseInt(itemMatch[1]),
          fullMatch: itemMatch[0],
          index: itemMatch.index
        });
      }
      
      for (const item of items) {
        // Find the name within this item's section
        const nextItemIndex = items[items.indexOf(item) + 1]?.index || xmlText.length;
        const itemSection = xmlText.slice(item.index, nextItemIndex);
        
        const nameMatch = nameRegex.exec(itemSection);
        const yearMatch = yearRegex.exec(itemSection);
        
        // Reset regex lastIndex for next iteration
        nameRegex.lastIndex = 0;
        yearRegex.lastIndex = 0;
        
        if (nameMatch) {
          games.push({
            id: item.id,
            name: nameMatch[1],
            yearPublished: yearMatch ? parseInt(yearMatch[1]) : undefined,
          });
        }
      }
      
      return games;
    } catch (error) {
      logError('BGG search XML parsing failed', error instanceof Error ? error : new Error('Unknown error'));
      return [];
    }
  }

  /**
   * Parse BGG game details XML response
   */
  private static parseGameXML(xmlText: string): BGGRatingData | null {
    try {
      // Extract rating statistics using regex
      const averageMatch = xmlText.match(/<average[^>]*value="([^"]*)"[^>]*>/);
      const bayesAverageMatch = xmlText.match(/<bayesaverage[^>]*value="([^"]*)"[^>]*>/);
      const usersRatedMatch = xmlText.match(/<usersrated[^>]*value="([^"]*)"[^>]*>/);
      const rankMatch = xmlText.match(/<rank[^>]*value="(\d+)"[^>]*>/);
      
      if (!averageMatch || !usersRatedMatch) {
        return null;
      }
      
      const averageRating = parseFloat(averageMatch[1]);
      const usersRated = parseInt(usersRatedMatch[1]);
      
      if (isNaN(averageRating) || isNaN(usersRated) || usersRated === 0) {
        return null;
      }
      
      const bayesAverageRating = bayesAverageMatch ? parseFloat(bayesAverageMatch[1]) : averageRating;
      const rank = rankMatch ? parseInt(rankMatch[1]) : undefined;
      
      return {
        averageRating,
        bayesAverageRating: isNaN(bayesAverageRating) ? averageRating : bayesAverageRating,
        usersRated,
        rank: (rank && !isNaN(rank)) ? rank : undefined,
      };
    } catch (error) {
      logError('BGG game XML parsing failed', error instanceof Error ? error : new Error('Unknown error'));
      return null;
    }
  }

  /**
   * Check if BGG service is available
   */
  static async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(this.BASE_URL, {
        method: 'HEAD',
      });
      return response.ok;
    } catch (error) {
      logError('BGG availability check failed', error instanceof Error ? error : new Error('Unknown error'));
      return false;
    }
  }
}