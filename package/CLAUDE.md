# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

fumadocs-editor is an in-browser MDX editing package for Fumadocs documentation sites. It provides a floating "Edit Page" button during development that opens a WYSIWYG editor for MDX files, with automatic hot-reload on save.

## Commands

```bash
pnpm build          # Build with tsdown
pnpm dev            # Watch mode for development
pnpm lint           # ESLint
pnpm types:check    # TypeScript type checking (tsc --noEmit)
pnpm clean          # Remove dist/
```

## Architecture

The package is organized into 5 modules with distinct responsibilities:

```
src/
├── index.ts                    # Type exports (EditMetadata, EditorAdapter, etc.)
├── plugin.ts                   # Fumadocs loader plugin
├── server.ts                   # Next.js API route handlers
├── components/
│   ├── index.ts                # Component exports
│   ├── EditorProvider.tsx      # Context provider + floating button
│   ├── EditModal.tsx           # Modal orchestrating load/edit/save flow
│   └── EditButton.tsx          # Standalone edit button
└── adapters/
    └── mdx-editor.tsx          # MDXEditor implementation
```

### Module Exports (package.json)

- `fumadocs-editor` - Type definitions
- `fumadocs-editor/plugin` - Loader plugin for metadata injection
- `fumadocs-editor/server` - API route handlers (createNextHandler, createNextReadHandler)
- `fumadocs-editor/components` - React components (EditorProvider, useRegisterEditable, etc.)
- `fumadocs-editor/adapters/mdx-editor` - Default MDXEditor adapter

### Data Flow

1. **Plugin** (`plugin.ts`): Injects `_edit` metadata into each page during Fumadocs source loading, containing `absolutePath`, `endpoint`, and `enabled` flag

2. **Page Registration**: Client components call `useRegisterEditable(page.data._edit)` to register the current page as editable

3. **EditorProvider** (`EditorProvider.tsx`): Stores edit metadata in context, renders floating "Edit Page" button when metadata is present

4. **EditModal** (`EditModal.tsx`): On button click, fetches content via GET, renders adapter component, handles save via POST

5. **Server** (`server.ts`): Validates paths (absolute, .md/.mdx extension, file exists), validates MDX syntax with remark, writes file to disk

### Adapter Pattern

The `EditorAdapter` interface allows swapping editors:

```typescript
interface EditorAdapter {
  id: string;
  name: string;
  Component: ComponentType<EditorComponentProps>;
  validate?: (content: string) => Promise<ValidationResult>;
}
```

The default MDXEditor adapter (`mdx-editor.tsx`) dynamically imports @mdxeditor/editor to avoid SSR issues and configures plugins for headings, lists, code blocks, tables, images, frontmatter, and JSX components.

### Security Model

- Only active when `NODE_ENV === 'development'`
- Validates absolute paths only
- Restricts to .mdx and .md file extensions
- File must exist (no creation through editor)
- MDX syntax validated before writing
