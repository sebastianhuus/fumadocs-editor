# fumadocs-editor

In-browser MDX editing for [Fumadocs](https://fumadocs.dev) documentation sites.

Edit your documentation directly in the browser during development. Changes are saved to disk and hot-reloaded automatically.

## Features

- **In-browser editing** - Edit MDX files without leaving your browser
- **WYSIWYG + Source mode** - Toggle between rich text and raw markdown
- **MDX validation** - Validates content before saving to prevent broken pages
- **Hot reload** - Changes automatically reload the page
- **Dev-only** - Only enabled in development mode for security
- **Editor-agnostic** - Swap in different editors (MDXEditor, CodeMirror, Monaco)
- **Custom component support** - Register your custom MDX components

## Installation

```bash
pnpm add github:sebastianhuus/fumadocs-editor
```

## Setup

### 1. Add the loader plugin

In your source configuration (e.g., `lib/source.ts`):

```ts
import { loader } from 'fumadocs-core/source';
import { editorPlugin } from 'fumadocs-editor/plugin';

export const source = loader({
  // ...your existing config
  plugins: [editorPlugin()],
});
```

### 2. Create the API route

Create `app/api/__fumadocs/edit/route.ts`:

```ts
import { createNextHandler, createNextReadHandler } from 'fumadocs-editor/server';

export const GET = createNextReadHandler();
export const POST = createNextHandler();
```

### 3. Add the EditorProvider

Wrap your root layout with the provider (`app/layout.tsx`):

```tsx
import { EditorProvider } from 'fumadocs-editor/components';
import { mdxEditorAdapter } from 'fumadocs-editor/adapters/mdx-editor';
import '@mdxeditor/editor/style.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <EditorProvider adapter={mdxEditorAdapter}>
          {children}
        </EditorProvider>
      </body>
    </html>
  );
}
```

### 4. Register editable pages

In your docs page component, register the page as editable:

```tsx
'use client';

import { useRegisterEditable } from 'fumadocs-editor/components';
import { source } from '@/lib/source';

export default function Page({ params }: { params: { slug?: string[] } }) {
  const page = source.getPage(params.slug);
  useRegisterEditable(page?.data._edit);

  return (
    // Your page content
  );
}
```

A floating "Edit Page" button will appear in the bottom-right corner when viewing editable pages in development mode.

## Configuration

### EditorProvider Props

```tsx
<EditorProvider
  adapter={mdxEditorAdapter}           // Required: editor adapter
  jsxComponentDescriptors={[...]}      // Optional: custom component definitions
  buttonPosition="bottom-right"         // Optional: button position
  buttonStyle={{ ... }}                 // Optional: custom button styles
  buttonClassName="my-class"            // Optional: custom button class
>
```

### Custom JSX Components

If you have custom MDX components (like `<Callout>`, `<Tabs>`, etc.), you can register them so the editor knows how to handle them:

```tsx
const jsxComponentDescriptors = [
  {
    name: 'Callout',
    kind: 'flow' as const,
    hasChildren: true,
    props: [
      { name: 'type', type: 'string' as const },
      { name: 'title', type: 'string' as const },
    ],
  },
  {
    name: 'Tabs',
    kind: 'flow' as const,
    hasChildren: true,
  },
];

<EditorProvider
  adapter={mdxEditorAdapter}
  jsxComponentDescriptors={jsxComponentDescriptors}
>
```

### Plugin Configuration

```ts
editorPlugin({
  enabled: true,                        // Default: process.env.NODE_ENV === 'development'
  endpoint: '/__fumadocs/edit',         // Default API endpoint
})
```

## API Reference

### Exports

| Export | Description |
|--------|-------------|
| `fumadocs-editor/plugin` | Loader plugin for injecting edit metadata |
| `fumadocs-editor/server` | API route handlers |
| `fumadocs-editor/components` | React components and hooks |
| `fumadocs-editor/adapters/mdx-editor` | MDXEditor adapter |

### Components

| Component | Description |
|-----------|-------------|
| `EditorProvider` | Context provider with floating edit button |
| `EditButton` | Standalone edit button (alternative to provider) |
| `EditModal` | Editor modal (used internally) |

### Hooks

| Hook | Description |
|------|-------------|
| `useRegisterEditable(metadata)` | Register a page as editable |
| `useEditor()` | Access editor context (open editor, get metadata) |

### Server Functions

| Function | Description |
|----------|-------------|
| `createNextHandler()` | Creates POST handler for saving files |
| `createNextReadHandler()` | Creates GET handler for reading files |
| `handleSaveRequest(req)` | Low-level save handler |
| `validateMdxContent(content)` | Validate MDX syntax |

## Using a Different Editor

The package is editor-agnostic. You can create your own adapter:

```ts
import type { EditorAdapter } from 'fumadocs-editor';

const myAdapter: EditorAdapter = {
  id: 'my-editor',
  name: 'My Editor',
  Component: ({ initialContent, onSave, onCancel, filePath }) => {
    // Your editor implementation
  },
};

<EditorProvider adapter={myAdapter}>
```

## Security

- **Dev-only by default** - The plugin only injects edit metadata when `NODE_ENV === 'development'`
- **Path validation** - Only `.mdx` and `.md` files can be edited
- **File must exist** - Cannot create new files, only edit existing ones
- **MDX validation** - Content is validated before saving to prevent syntax errors

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm types:check
```

## License

MIT
