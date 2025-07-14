import { Context } from 'hono';
import { getDatabaseClient } from '../utils/database';
import { createSuccessResponse } from '../utils/response';

export async function healthCheck(c: Context) {
  const startTime = Date.now();
  const prisma = getDatabaseClient(c.env.DB);
  
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startTime;

    return createSuccessResponse({
      status: 'healthy',
      services: {
        database: {
          status: 'healthy',
          latency: dbLatency
        }
      }
    });
  } catch (error) {
    return createSuccessResponse({
      status: 'degraded',
      services: {
        database: {
          status: 'unhealthy',
          latency: Date.now() - startTime
        }
      }
    });
  }
}
