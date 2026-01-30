/**
 * Health check API endpoint
 * Used for offline detection - clients ping this endpoint to verify connectivity
 */

import { NextResponse } from 'next/server';

/**
 * HEAD /api/health
 * Lightweight connectivity check - returns 200 with no body
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

/**
 * GET /api/health
 * Full health check with timestamp (useful for debugging)
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}
