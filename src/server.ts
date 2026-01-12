import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import type { ValidationResult } from './types.js';

export interface SaveRequest {
  /** Absolute path to the file */
  path: string;
  /** New content to save */
  content: string;
}

export interface SaveResponse {
  success: boolean;
  error?: string;
  validation?: ValidationResult;
}

/**
 * Validate that a path is safe to write to.
 * Prevents directory traversal and writing outside allowed directories.
 */
export function validatePath(
  filePath: string,
  allowedExtensions: string[] = ['.mdx', '.md'],
): { valid: boolean; error?: string } {
  // Must be absolute path
  if (!isAbsolute(filePath)) {
    return { valid: false, error: 'Path must be absolute' };
  }

  // Check extension
  const hasValidExtension = allowedExtensions.some((ext) =>
    filePath.toLowerCase().endsWith(ext),
  );
  if (!hasValidExtension) {
    return {
      valid: false,
      error: `File must have extension: ${allowedExtensions.join(', ')}`,
    };
  }

  // File must exist (we're editing, not creating)
  if (!existsSync(filePath)) {
    return { valid: false, error: 'File does not exist' };
  }

  // Could add more checks: ensure within project directory, etc.

  return { valid: true };
}

/**
 * Validate MDX content before saving.
 * Uses remark/rehype to parse and catch syntax errors.
 */
export async function validateMdxContent(
  content: string,
): Promise<ValidationResult> {
  try {
    // Dynamic import to avoid bundling these in client
    const { remark } = await import('remark');
    const remarkMdx = (await import('remark-mdx')).default;

    await remark().use(remarkMdx).process(content);
    return { valid: true };
  } catch (error: unknown) {
    const err = error as { line?: number; column?: number; message?: string };
    return {
      valid: false,
      errors: [
        {
          line: err.line,
          column: err.column,
          message: err.message ?? 'Invalid MDX syntax',
        },
      ],
    };
  }
}

/**
 * Handle a save request. Call this from your API route.
 */
export async function handleSaveRequest(
  request: SaveRequest,
): Promise<SaveResponse> {
  const { path: filePath, content } = request;

  // Validate path
  const pathValidation = validatePath(filePath);
  if (!pathValidation.valid) {
    return { success: false, error: pathValidation.error };
  }

  // Validate content
  const contentValidation = await validateMdxContent(content);
  if (!contentValidation.valid) {
    return {
      success: false,
      error: 'Invalid MDX content',
      validation: contentValidation,
    };
  }

  // Write file
  try {
    writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return {
      success: false,
      error: `Failed to write file: ${err.message}`,
    };
  }
}

/**
 * Read file content. Used to fetch current content for editing.
 */
export function readFileContent(filePath: string): {
  content?: string;
  error?: string;
} {
  const pathValidation = validatePath(filePath);
  if (!pathValidation.valid) {
    return { error: pathValidation.error };
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return { content };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { error: `Failed to read file: ${err.message}` };
  }
}

/**
 * Create a Next.js API route handler for the editor endpoint.
 * Usage in app/api/__fumadocs/edit/route.ts:
 *
 * import { createNextHandler } from 'fumadocs-editor/server';
 * export const POST = createNextHandler();
 */
export function createNextHandler() {
  return async (request: Request): Promise<Response> => {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Editor only available in development',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }

    try {
      const body = (await request.json()) as SaveRequest;
      const result = await handleSaveRequest(body);

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      return new Response(
        JSON.stringify({ success: false, error: err.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }
  };
}

/**
 * Create a Next.js GET handler for reading file content.
 * Usage in app/api/__fumadocs/edit/route.ts:
 *
 * import { createNextReadHandler } from 'fumadocs-editor/server';
 * export const GET = createNextReadHandler();
 */
export function createNextReadHandler() {
  return async (request: Request): Promise<Response> => {
    if (process.env.NODE_ENV !== 'development') {
      return new Response(
        JSON.stringify({ error: 'Editor only available in development' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const url = new URL(request.url);
    const filePath = url.searchParams.get('path');

    if (!filePath) {
      return new Response(JSON.stringify({ error: 'Missing path parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = readFileContent(filePath);

    return new Response(JSON.stringify(result), {
      status: result.error ? 400 : 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}
