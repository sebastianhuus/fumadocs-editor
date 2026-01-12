# fumadocs-editor

In-browser MDX editing for [Fumadocs](https://fumadocs.dev) documentation sites.

Edit your documentation directly in the browser during development. Changes are saved to disk and hot-reloaded automatically.

## Features

- **In-browser editing** - Edit MDX files without leaving your browser
- **WYSIWYG + Source mode** - Toggle between rich text and raw markdown
- **MDX validation** - Validates content before saving to prevent broken pages
- **Hot reload** - Changes automatically reload the page
- **Dev-only** - Only enabled in development mode for security
- **Editor-agnostic** - Swap in different editors (default: MDXEditor)

## Installation

```bash
# Install the editor package
pnpm add github:sebastianhuus/fumadocs-editor

# Install the recommended editor (MDXEditor)
pnpm add @mdxeditor/editor
```

> **Note:** We recommend [MDXEditor](https://mdxeditor.dev/) as the default editor. It provides WYSIWYG editing with source mode toggle, and has excellent MDX support including custom JSX components.

## Quick Setup

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

Create `app/api/fumadocs-edit/route.ts`:

```ts
import { createNextHandler, createNextReadHandler } from 'fumadocs-editor/server';

export const GET = createNextReadHandler();
export const POST = createNextHandler();
```

### 3. Create an editor provider wrapper

Create `components/providers/editor-provider.tsx`:

```tsx
'use client';

import { EditorProvider } from 'fumadocs-editor/components';
import { mdxEditorAdapter } from 'fumadocs-editor/adapters/mdx-editor';
import '@mdxeditor/editor/style.css';

export function EditorProviderWrapper({ children }: { children: React.ReactNode }) {
  return <EditorProvider adapter={mdxEditorAdapter}>{children}</EditorProvider>;
}
```

### 4. Add to your layout

Update your root layout (`app/layout.tsx`). Add the `EditorProviderWrapper` **inside** your existing providers:

```tsx
import { RootProvider } from 'fumadocs-ui/provider/next';
import { EditorProviderWrapper } from '@/components/providers/editor-provider';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Keep your existing providers */}
        <RootProvider>
          {/* Add EditorProviderWrapper inside */}
          <EditorProviderWrapper>
            {children}
          </EditorProviderWrapper>
        </RootProvider>
      </body>
    </html>
  );
}
```

> **Important:** Keep your existing `RootProvider` from Fumadocs. The `EditorProviderWrapper` should be nested inside it.

### 5. Register editable pages

Create a small client component to register pages as editable.

Create `app/docs/[[...slug]]/EditorRegister.tsx`:

```tsx
'use client';

import { useRegisterEditable } from 'fumadocs-editor/components';
import type { EditMetadata } from 'fumadocs-editor';

export function EditorRegister({ editMetadata }: { editMetadata?: EditMetadata }) {
  useRegisterEditable(editMetadata);
  return null;
}
```

Then use it in your docs page (`app/docs/[[...slug]]/page.tsx`):

```tsx
import { source } from '@/lib/source';
import { EditorRegister } from './EditorRegister';

export default async function Page({ params }: { params: { slug?: string[] } }) {
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return (
    <>
      <EditorRegister editMetadata={page.data._edit} />
      <DocsPage>
        {/* Your page content */}
      </DocsPage>
    </>
  );
}

// Keep your generateStaticParams and generateMetadata as-is
export async function generateStaticParams() {
  return source.generateParams();
}
```

> **Note:** The `EditorRegister` component must be a separate client component because your page needs to remain a server component to export `generateStaticParams` and `generateMetadata`.

## Usage

Once set up, a floating **"Edit Page"** button will appear in the bottom-right corner when viewing any editable page in development mode (`pnpm dev`).

Click the button to open the editor. Make changes, then click **Save** to write the file to disk. The page will automatically hot-reload with your changes.

## Configuration

### EditorProvider Props

```tsx
<EditorProvider
  adapter={mdxEditorAdapter}           // Required: editor adapter
  jsxComponentDescriptors={[...]}      // Optional: custom component definitions
  buttonPosition="bottom-right"         // Optional: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  buttonStyle={{ ... }}                 // Optional: custom button styles
  buttonClassName="my-class"            // Optional: custom button class
>
```

### Custom JSX Components

If you have custom MDX components (like `<Callout>`, `<Tabs>`, etc.), register them so the editor can handle them:

```tsx
// components/providers/editor-provider.tsx
'use client';

import { EditorProvider } from 'fumadocs-editor/components';
import { mdxEditorAdapter } from 'fumadocs-editor/adapters/mdx-editor';
import '@mdxeditor/editor/style.css';

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

export function EditorProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <EditorProvider
      adapter={mdxEditorAdapter}
      jsxComponentDescriptors={jsxComponentDescriptors}
    >
      {children}
    </EditorProvider>
  );
}
```

### Plugin Options

```ts
editorPlugin({
  enabled: true,                        // Default: process.env.NODE_ENV === 'development'
  endpoint: '/api/fumadocs-edit',         // Default API endpoint
})
```

## API Reference

### Exports

| Export | Description |
|--------|-------------|
| `fumadocs-editor` | Type definitions |
| `fumadocs-editor/plugin` | Loader plugin |
| `fumadocs-editor/server` | API route handlers |
| `fumadocs-editor/components` | React components and hooks |
| `fumadocs-editor/adapters/mdx-editor` | MDXEditor adapter (recommended) |

### Components & Hooks

| Name | Description |
|------|-------------|
| `EditorProvider` | Context provider with floating edit button |
| `useRegisterEditable(metadata)` | Register a page as editable |
| `useEditor()` | Access editor context |
| `EditButton` | Standalone edit button (alternative to provider) |

### Server Functions

| Function | Description |
|----------|-------------|
| `createNextHandler()` | POST handler for saving files |
| `createNextReadHandler()` | GET handler for reading files |

## Using a Different Editor

The package is editor-agnostic. Create your own adapter:

```ts
import type { EditorAdapter } from 'fumadocs-editor';

const myAdapter: EditorAdapter = {
  id: 'my-editor',
  name: 'My Editor',
  Component: ({ initialContent, onSave, onCancel, filePath }) => {
    // Your editor implementation
  },
};
```

## Security

- **Dev-only by default** - Only active when `NODE_ENV === 'development'`
- **Path validation** - Only `.mdx` and `.md` files can be edited
- **File must exist** - Cannot create new files through the editor
- **MDX validation** - Content is validated before saving

## Troubleshooting

### "Cannot find module 'fumadocs-editor/plugin'"

Make sure the package built successfully. If installing from GitHub, the `prepare` script should run automatically. Try reinstalling:

```bash
pnpm remove fumadocs-editor
pnpm add github:sebastianhuus/fumadocs-editor
```

### "Module not found: Can't resolve '@mdxeditor/editor'"

Install the MDXEditor package:

```bash
pnpm add @mdxeditor/editor
```

### Server/Client Component Errors

Make sure:
1. `EditorProviderWrapper` is in a separate file with `'use client'` at the top
2. `EditorRegister` is in a separate file with `'use client'` at the top
3. Your page component remains a server component (no `'use client'`)

## Development

```bash
pnpm install
pnpm build
pnpm dev      # Watch mode
```

## License

MIT
