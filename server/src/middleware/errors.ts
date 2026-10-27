import type { ErrorRequestHandler } from 'express';
import multer from 'multer';

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Photo must be 5 MB or smaller.' : 'The uploaded photo could not be accepted.' });
    return;
  }
  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  console.error('Request failed:', message);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
};
