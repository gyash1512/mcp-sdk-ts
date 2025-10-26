/**
 * Built-in middleware for MCP servers
 */

import type { Request, Response, NextFunction } from 'express';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Logger } from 'pino';
import type { AxiosInstance } from 'axios';
import type { MCPContext, AuthOptions, RateLimitOptions, CorsOptions } from '../types.js';

/**
 * Generic request type that works with both Express and Fastify
 */
interface GenericRequest {
  ip?: string;
  method?: string;
  url?: string;
  id?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

/**
 * Generic response type that works with both Express and Fastify
 */
interface GenericResponse {
  status(code: number): GenericResponse;
  json(data: unknown): void;
  setHeader(name: string, value: string): void;
  end(): void;
  send?: (data: unknown) => unknown;
  statusCode?: number;
}

/**
 * Simple in-memory rate limiter
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(private max: number, private windowMs: number) {}

  check(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter((time) => now - time < this.windowMs);
    
    if (validRequests.length >= this.max) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }
}

/**
 * Create rate limiting middleware
 */
export function createRateLimitMiddleware(options: RateLimitOptions) {
  const windowMs = typeof options.timeWindow === 'string' 
    ? parseTimeWindow(options.timeWindow)
    : options.timeWindow;
    
  const limiter = new RateLimiter(options.max, windowMs);

  return (req: GenericRequest, res: GenericResponse, next: () => void) => {
    const key = req.ip || (Array.isArray(req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'][0] : req.headers['x-forwarded-for']) || 'unknown';
    
    if (!limiter.check(key)) {
      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Max ${options.max} requests per ${options.timeWindow}`,
      });
      return;
    }
    
    next();
  };
}

/**
 * Parse time window string (e.g., '1m', '1h', '1d')
 */
function parseTimeWindow(timeWindow: string): number {
  const match = timeWindow.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid time window format: ${timeWindow}`);
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  
  return value * multipliers[unit];
}

/**
 * Create authentication middleware
 */
export function createAuthMiddleware(options: AuthOptions, http?: AxiosInstance, logger?: Logger) {
  return async (req: GenericRequest, res: GenericResponse, next: () => void) => {
    let token: string | undefined;

    if (options.type === 'apiKey') {
      const headerName = options.headerName || 'x-api-key';
      const headerValue = req.headers[headerName.toLowerCase()];
      token = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    } else if (options.type === 'bearer') {
      const authHeader = req.headers.authorization;
      const authHeaderStr = Array.isArray(authHeader) ? authHeader[0] : authHeader;
      if (authHeaderStr?.startsWith('Bearer ')) {
        token = authHeaderStr.substring(7);
      }
    }

    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        message: `Missing ${options.type} token`,
      });
      return;
    }

    if (options.validate) {
      const ctx: Partial<MCPContext> = {
        http: http || undefined as unknown as AxiosInstance,
        logger: logger || undefined as unknown as Logger,
        env: process.env as Record<string, string | undefined>,
      };
      
      const isValid = await options.validate(token, ctx as MCPContext);
      if (!isValid) {
        res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid token',
        });
        return;
      }
    }

    next();
  };
}

/**
 * CORS middleware
 */
export function createCorsMiddleware(options?: CorsOptions) {
  return (req: GenericRequest, res: GenericResponse, next: () => void) => {
    const origin = options?.origin || '*';
    const methods = options?.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
    const allowedHeaders = options?.allowedHeaders || ['Content-Type', 'Authorization'];

    const originStr = typeof origin === 'boolean' ? '*' : Array.isArray(origin) ? origin.join(', ') : origin;
    res.setHeader('Access-Control-Allow-Origin', originStr);
    res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));

    if (options?.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (options?.maxAge) {
      res.setHeader('Access-Control-Max-Age', options.maxAge.toString());
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  };
}

/**
 * Request logging middleware
 */
export function createLoggingMiddleware(logger: Logger) {
  return (req: GenericRequest, res: GenericResponse, next: () => void) => {
    const start = Date.now();
    const requestId = req.id || Math.random().toString(36).substring(7);

    logger.info({
      requestId,
      method: req.method,
      url: req.url,
      ip: req.ip,
    }, 'Incoming request');

    // Capture response
    const originalSend = res.send;
    if (originalSend) {
      res.send = function (data: unknown) {
        const duration = Date.now() - start;
        
        logger.info({
          requestId,
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration,
        }, 'Request completed');

        return originalSend.call(this, data);
      };
    }

    next();
  };
}

/**
 * Error handling middleware
 */
export function createErrorMiddleware(logger: Logger) {
  return (err: Error, req: GenericRequest, res: GenericResponse, next: () => void) => {
    logger.error({
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.url,
    }, 'Request error');

    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  };
}

/**
 * Request validation middleware
 */
export function createValidationMiddleware() {
  return (req: GenericRequest, res: GenericResponse, next: () => void) => {
    // Ensure request has required fields
    if (req.method === 'POST' && !req.body) {
      res.status(400).json({
        error: 'Bad request',
        message: 'Request body is required',
      });
      return;
    }

    next();
  };
}
