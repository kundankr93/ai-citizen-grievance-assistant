import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthRequest, UserPayload, UserRole } from '../types';

const COOKIE_NAME = 'civicconnect_session';
export { COOKIE_NAME };

export function issueSession(res: Response, user: UserPayload): void {
  const token = jwt.sign(user, env.jwtSecret, { expiresIn: '8h', issuer: 'civicconnect-ai' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/'
  });
}

export function clearSession(res: Response): void {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: env.cookieSecure, sameSite: 'lax', path: '/' });
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: 'Please sign in to continue.' });
    return;
  }
  try {
    req.user = jwt.verify(token, env.jwtSecret, { issuer: 'civicconnect-ai' }) as UserPayload;
    next();
  } catch {
    clearSession(res);
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

export function allowRoles(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'You do not have permission to perform this action.' });
      return;
    }
    next();
  };
}
