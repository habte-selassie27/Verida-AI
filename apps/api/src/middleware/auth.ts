// IMPLEMENTER NOTE: Validates bearer JWTs and attaches the authenticated publisher address to Express requests.
// BUILD.md TASK: STEP 6 — Express API Routes
// ARCHITECT CONTRACT: Auth middleware for protected publisher mutation routes
// SHELBY SDK METHODS: None directly; this middleware authorizes API callers before Shelby-backed actions.
// DB TABLES: None directly; downstream routes use this identity for publishers table updates.
// HANDOFF TO TESTER: Verify missing/invalid/expired tokens return 401 and valid tokens expose req.auth.address.

import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
const { JsonWebTokenError, TokenExpiredError } = jwt;

interface AuthContext {
  address: string;
  payload: JwtPayload | string;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}

class AuthError extends Error {
  public readonly code: string;
  public readonly details: Record<string, unknown> | undefined;
  public readonly statusCode: number;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function getRequiredJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim() ?? '';

  if (secret.length === 0) {
    throw new AuthError(500, 'AUTH_CONFIGURATION_ERROR', 'JWT_SECRET is not configured.');
  }

  return secret;
}

function parseBearerToken(request: Request): string {
  const authorizationHeader = request.header('authorization');

  if (authorizationHeader === undefined) {
    throw new AuthError(401, 'AUTH_MISSING', 'Authorization header is required.');
  }

  const [scheme, value] = authorizationHeader.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || value === undefined || value.trim().length === 0) {
    throw new AuthError(401, 'AUTH_MALFORMED', 'Authorization header must be a Bearer token.');
  }

  return value.trim();
}

function resolveAddressFromPayload(payload: JwtPayload | string): string {
  if (typeof payload === 'string') {
    const normalized = payload.trim();
    if (normalized.length > 0) {
      return normalized;
    }

    throw new AuthError(401, 'AUTH_INVALID', 'Token payload did not include an address.');
  }

  const addressCandidate =
    typeof payload.address === 'string'
      ? payload.address
      : typeof payload.sub === 'string'
        ? payload.sub
        : '';
  const normalized = addressCandidate.trim().toLowerCase();

  if (normalized.length === 0) {
    throw new AuthError(401, 'AUTH_INVALID', 'Token payload did not include an address.');
  }

  return normalized;
}

function attachAuthContext(request: Request, context: AuthContext): void {
  (request as AuthenticatedRequest).auth = context;
}

function writeAuthErrorResponse(response: Response, error: AuthError): void {
  response.status(error.statusCode).json({
    error: {
      code: error.code,
      details: error.details,
      error: error.message,
    },
    success: false,
  });
}

export function requireAuth(request: Request, response: Response, next: NextFunction): void {
  try {
    const token = parseBearerToken(request);
    const payload = jwt.verify(token, getRequiredJwtSecret());
    const address = resolveAddressFromPayload(payload);

    attachAuthContext(request, {
      address,
      payload,
    });

    next();
  } catch (cause: unknown) {
    if (cause instanceof AuthError) {
      writeAuthErrorResponse(response, cause);
      return;
    }

    if (cause instanceof TokenExpiredError) {
      writeAuthErrorResponse(response, new AuthError(401, 'AUTH_EXPIRED', 'Authentication token has expired.'));
      return;
    }

    if (cause instanceof JsonWebTokenError) {
      writeAuthErrorResponse(response, new AuthError(401, 'AUTH_INVALID', 'Authentication token is invalid.'));
      return;
    }

    writeAuthErrorResponse(
      response,
      new AuthError(500, 'AUTH_FAILURE', 'Unable to authenticate the request.'),
    );
  }
}

export function getAuthenticatedAddress(request: Request): string {
  const auth = (request as AuthenticatedRequest).auth;

  if (auth === undefined) {
    throw new AuthError(401, 'AUTH_MISSING', 'Authenticated request context was not found.');
  }

  return auth.address;
}
