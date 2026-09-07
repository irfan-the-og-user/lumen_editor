import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDocument, applyDeltaPatches } from '../src/utils/documentStore';

export const config = {
  maxDuration: 10,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS & Header configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const documentId = (req.query.documentId as string) || 'doc_default';
    const doc = getDocument(documentId);
    return res.status(200).json(doc);
  }

  if (req.method === 'POST') {
    try {
      const payloadString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
      const payloadSizeBytes = Buffer.byteLength(payloadString, 'utf8');

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { documentId = 'doc_default', expectedVersion, deltas } = body || {};

      if (typeof expectedVersion !== 'number' || !Array.isArray(deltas)) {
        return res.status(400).json({
          status: 'error',
          error: 'Invalid request parameters. Expected documentId, expectedVersion (number), and deltas (array).',
        });
      }

      const result = applyDeltaPatches(documentId, expectedVersion, deltas, payloadSizeBytes);

      if (result.status === 'conflict') {
        return res.status(409).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Delta Sync API error:', error);
      return res.status(500).json({
        status: 'error',
        error: error?.message || 'Internal server error during delta sync',
      });
    }
  }

  return res.status(405).json({ status: 'error', error: 'Method Not Allowed' });
}
