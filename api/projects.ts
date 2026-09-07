import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  projectDbStore,
  CursorValidationError,
  PaginationValidationError,
} from '../src/utils/projectDb.js';

export const config = {
  maxDuration: 10,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { account_id, limit, cursor, page, offset, stats } = req.query;

    // Reject offset-based pagination requests explicitly
    if (page !== undefined || offset !== undefined) {
      return res.status(400).json({
        error: "Offset-based pagination parameters ('page', 'offset') are strictly forbidden on project list queries. Use cursor-based pagination.",
        code: 'ERR_OFFSET_PAGINATION_FORBIDDEN',
      });
    }

    const parsedLimit = limit ? parseInt(limit as string, 10) : 20;

    const response = projectDbStore.query({
      account_id: account_id as string | undefined,
      limit: isNaN(parsedLimit) ? 20 : parsedLimit,
      cursor: cursor as string | undefined,
    });

    if (stats === 'true' || stats === '1') {
      const indexStats = projectDbStore.calculateIndexStats();
      return res.status(200).json({
        ...response,
        index_stats: indexStats,
      });
    }

    return res.status(200).json(response);
  } catch (error: any) {
    if (error instanceof CursorValidationError) {
      return res.status(400).json({
        error: error.message || 'Invalid or corrupted cursor token',
        code: 'ERR_INVALID_CURSOR',
      });
    }

    if (error instanceof PaginationValidationError) {
      return res.status(400).json({
        error: error.message,
        code: 'ERR_OFFSET_PAGINATION_FORBIDDEN',
      });
    }

    console.error('Project List API error:', error);
    return res.status(500).json({
      error: error?.message || 'Internal server error while fetching projects',
    });
  }
}
