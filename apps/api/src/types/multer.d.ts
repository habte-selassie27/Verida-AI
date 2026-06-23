// IMPLEMENTER NOTE: Provides local Multer typings for strict API compilation in offline or partially-installed environments.
// BUILD.md TASK: STEP 6 — Express API Routes
// ARCHITECT CONTRACT: Type-safe multipart upload route contracts for POST /api/datasets/upload
// SHELBY SDK METHODS: None directly; this file only types upload middleware integration.
// DB TABLES: None.
// HANDOFF TO TESTER: Ensure req.file is typed and multipart upload route compiles/runs with strict TypeScript settings.

declare module 'multer' {
  import type { Request, RequestHandler } from 'express';

  interface MulterLimits {
    fileSize?: number;
    files?: number;
  }

  interface DiskStorageCallback<T> {
    (error: Error | null, value: T): void;
  }

  interface DiskStorageOptions {
    destination?:
      | string
      | ((
          request: Request,
          file: Express.Multer.File,
          callback: DiskStorageCallback<string>,
        ) => void);
    filename?: (
      request: Request,
      file: Express.Multer.File,
      callback: DiskStorageCallback<string>,
    ) => void;
  }

  interface StorageEngine {
    _handleFile(
      request: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, info: Partial<Express.Multer.File>) => void,
    ): void;
    _removeFile(
      request: Request,
      file: Express.Multer.File,
      callback: (error: Error | null) => void,
    ): void;
  }

  interface MulterError extends Error {
    code: string;
    field?: string;
  }

  interface MulterMiddlewareFactory {
    single(fieldName: string): RequestHandler;
  }

  interface MulterFactoryOptions {
    limits?: MulterLimits;
    storage?: StorageEngine;
  }

  interface MulterModule {
    (options?: MulterFactoryOptions): MulterMiddlewareFactory;
    diskStorage(options: DiskStorageOptions): StorageEngine;
  }

  const multer: MulterModule;
  export { MulterError };
  export default multer;
}

declare namespace Express {
  namespace Multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      destination: string;
      filename: string;
      path: string;
    }
  }

  interface Request {
    file?: Multer.File;
  }
}
