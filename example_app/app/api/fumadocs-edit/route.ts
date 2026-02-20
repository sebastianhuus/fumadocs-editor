import { createNextHandler, createNextReadHandler } from 'fumadocs-editor/server';

export const GET = createNextReadHandler();
export const POST = createNextHandler();
