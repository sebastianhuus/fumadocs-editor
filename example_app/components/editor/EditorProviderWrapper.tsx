'use client';

import { EditorProvider } from 'fumadocs-editor/components';
import { mdxEditorAdapter } from 'fumadocs-editor/adapters/mdx-editor';
import { getMDXComponents } from '@/mdx-components';
import '@mdxeditor/editor/style.css';
import type { ComponentType, ReactNode } from 'react';
import type { JsxComponentDescriptor } from 'fumadocs-editor';

const mdxComponents = getMDXComponents() as Record<string, ComponentType<any>>;

// Auto-generate JSX descriptors from the component registry so the rich text
// editor can parse every custom element without hardcoding each one.
// HTML-native overrides (lowercase names like "a", "img") are skipped.
const jsxComponentDescriptors: JsxComponentDescriptor[] = Object.keys(mdxComponents)
  .filter((name) => /^[A-Z]/.test(name))
  .map((name) => ({
    name,
    kind: 'flow' as const,
    hasChildren: true,
  }));

export function EditorProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <EditorProvider
      adapter={mdxEditorAdapter}
      mdxComponents={mdxComponents}
      jsxComponentDescriptors={jsxComponentDescriptors}
      diffSourceViewMode="source"
      buttonStyle={{ display: 'none' }}
    >
      {children}
    </EditorProvider>
  );
}
