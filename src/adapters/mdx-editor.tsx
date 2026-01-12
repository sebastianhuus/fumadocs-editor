'use client';

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  EditorAdapter,
  EditorComponentProps,
  JsxComponentDescriptor as FumadocsJsxDescriptor,
} from '../types.js';

// Type for the ref methods exposed by MDXEditor
interface MDXEditorMethods {
  getMarkdown: () => string;
  setMarkdown: (markdown: string) => void;
  insertMarkdown: (markdown: string) => void;
}

// Lazy load MDXEditor module to avoid SSR issues and reduce bundle size
// Using `any` for the module type since we're dynamically importing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let MDXEditorModule: any = null;

async function loadMDXEditor(): Promise<typeof import('@mdxeditor/editor')> {
  if (!MDXEditorModule) {
    MDXEditorModule = await import('@mdxeditor/editor');
  }
  return MDXEditorModule;
}

/**
 * Convert Fumadocs JsxComponentDescriptor format to MDXEditor's format
 */
function convertJsxDescriptors(
  descriptors: FumadocsJsxDescriptor[] | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  GenericJsxEditor: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  if (!descriptors) return [];

  return descriptors.map((desc) => ({
    name: desc.name,
    kind: desc.kind,
    props:
      desc.props?.map((p) => ({
        name: p.name,
        type: p.type === 'number' ? 'expression' : p.type,
        required: p.required,
      })) ?? [],
    hasChildren: desc.hasChildren ?? true,
    Editor: desc.Editor ?? GenericJsxEditor,
  }));
}

function MDXEditorComponent({
  initialContent,
  onSave,
  onCancel,
  jsxComponentDescriptors,
}: EditorComponentProps): ReactNode {
  const [isLoaded, setIsLoaded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [EditorComponent, setEditorComponent] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [plugins, setPlugins] = useState<any[]>([]);
  const editorRef = useRef<MDXEditorMethods>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load MDXEditor on mount
  useEffect(() => {
    let mounted = true;

    loadMDXEditor()
      .then((mod) => {
        if (!mounted) return;

        const {
          MDXEditor,
          headingsPlugin,
          listsPlugin,
          quotePlugin,
          thematicBreakPlugin,
          markdownShortcutPlugin,
          linkPlugin,
          linkDialogPlugin,
          imagePlugin,
          tablePlugin,
          codeBlockPlugin,
          codeMirrorPlugin,
          frontmatterPlugin,
          diffSourcePlugin,
          toolbarPlugin,
          jsxPlugin,
          GenericJsxEditor,
          UndoRedo,
          BoldItalicUnderlineToggles,
          BlockTypeSelect,
          CreateLink,
          InsertImage,
          InsertTable,
          ListsToggle,
          InsertThematicBreak,
          InsertCodeBlock,
          DiffSourceToggleWrapper,
          Separator,
          InsertFrontmatter,
        } = mod;

        // Convert JSX component descriptors to MDXEditor format
        const jsxDescriptors = convertJsxDescriptors(
          jsxComponentDescriptors,
          GenericJsxEditor,
        );

        // Build the plugins array
        const editorPlugins = [
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          imagePlugin(),
          tablePlugin(),
          frontmatterPlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: 'typescript' }),
          codeMirrorPlugin({
            codeBlockLanguages: {
              js: 'JavaScript',
              jsx: 'JSX',
              ts: 'TypeScript',
              tsx: 'TSX',
              css: 'CSS',
              html: 'HTML',
              json: 'JSON',
              bash: 'Bash',
              shell: 'Shell',
              python: 'Python',
              go: 'Go',
              rust: 'Rust',
              yaml: 'YAML',
              markdown: 'Markdown',
              mdx: 'MDX',
            },
          }),
          diffSourcePlugin({ viewMode: 'rich-text' }),
          jsxPlugin({ jsxComponentDescriptors: jsxDescriptors }),
          toolbarPlugin({
            toolbarContents: () => (
              <DiffSourceToggleWrapper>
                <InsertFrontmatter />
                <Separator />
                <UndoRedo />
                <Separator />
                <BoldItalicUnderlineToggles />
                <Separator />
                <BlockTypeSelect />
                <Separator />
                <ListsToggle />
                <Separator />
                <CreateLink />
                <InsertImage />
                <InsertTable />
                <InsertThematicBreak />
                <InsertCodeBlock />
              </DiffSourceToggleWrapper>
            ),
          }),
        ];

        setPlugins(editorPlugins);
        setEditorComponent(() => MDXEditor);
        setIsLoaded(true);
      })
      .catch((error) => {
        console.error('Failed to load MDXEditor:', error);
      });

    return () => {
      mounted = false;
    };
  }, [jsxComponentDescriptors]);

  const handleSave = useCallback(async () => {
    if (!editorRef.current || isSaving) return;

    setIsSaving(true);
    try {
      const markdown = editorRef.current.getMarkdown();
      await onSave(markdown);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, isSaving]);

  const handleChange = useCallback(() => {
    setHasChanges(true);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && !isSaving) {
          handleSave();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, isSaving, handleSave]);

  if (!isLoaded || !EditorComponent) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          color: 'var(--fd-muted-foreground, #6b7280)',
        }}
      >
        <LoadingSpinner />
        <span style={{ marginLeft: '12px' }}>Loading editor...</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      {/* Editor */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          minHeight: 0,
        }}
      >
        <EditorComponent
          ref={editorRef}
          markdown={initialContent}
          plugins={plugins}
          onChange={handleChange}
          contentEditableClassName="fd-mdx-editor-content"
        />
      </div>

      {/* Footer with save/cancel buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderTop: '1px solid var(--fd-border, #e5e7eb)',
          backgroundColor: 'var(--fd-background, #fff)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: '12px',
            color: 'var(--fd-muted-foreground, #6b7280)',
          }}
        >
          {hasChanges ? (
            <span style={{ color: 'var(--fd-warning, #f59e0b)' }}>
              Unsaved changes
            </span>
          ) : (
            <span>No changes</span>
          )}
          <span style={{ marginLeft: '8px', opacity: 0.7 }}>
            Press Cmd/Ctrl+S to save
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            style={{
              padding: '8px 16px',
              border: '1px solid var(--fd-border, #e5e7eb)',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.5 : 1,
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor:
                hasChanges && !isSaving
                  ? 'var(--fd-primary, #3b82f6)'
                  : 'var(--fd-muted, #9ca3af)',
              color: 'white',
              cursor: hasChanges && !isSaving ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {isSaving && <LoadingSpinner size={14} />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Styles for MDXEditor content area */}
      <style>{`
        .fd-mdx-editor-content {
          padding: 16px 24px;
          min-height: 100%;
          outline: none;
        }
        .fd-mdx-editor-content:focus {
          outline: none;
        }
        /* Import MDXEditor styles - must be done via CSS import in consuming app */
        /* @import '@mdxeditor/editor/style.css'; */
      `}</style>
    </div>
  );
}

/**
 * Simple loading spinner component
 */
function LoadingSpinner({ size = 20 }: { size?: number }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        animation: 'fd-spin 1s linear infinite',
      }}
    >
      <style>{`
        @keyframes fd-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

/**
 * Editor adapter using @mdxeditor/editor.
 *
 * This adapter provides WYSIWYG editing with the ability to toggle to source view.
 * It includes commonly used plugins for headings, lists, code blocks, tables,
 * images, links, and frontmatter.
 *
 * @remarks
 * Make sure to import the MDXEditor styles in your application:
 * ```tsx
 * import '@mdxeditor/editor/style.css';
 * ```
 *
 * @example
 * ```tsx
 * import { EditButton } from 'fumadocs-editor/components';
 * import { mdxEditorAdapter } from 'fumadocs-editor/adapters/mdx-editor';
 *
 * <EditButton
 *   editMetadata={page.data._edit}
 *   adapter={mdxEditorAdapter}
 * />
 * ```
 *
 * @example With custom JSX components
 * ```tsx
 * import { EditButton } from 'fumadocs-editor/components';
 * import { mdxEditorAdapter } from 'fumadocs-editor/adapters/mdx-editor';
 *
 * const jsxComponentDescriptors = [
 *   {
 *     name: 'Callout',
 *     kind: 'flow' as const,
 *     props: [
 *       { name: 'type', type: 'string' as const },
 *       { name: 'title', type: 'string' as const },
 *     ],
 *     hasChildren: true,
 *   },
 * ];
 *
 * <EditButton
 *   editMetadata={page.data._edit}
 *   adapter={mdxEditorAdapter}
 *   jsxComponentDescriptors={jsxComponentDescriptors}
 * />
 * ```
 */
export const mdxEditorAdapter: EditorAdapter = {
  id: 'mdx-editor',
  name: 'MDX Editor',
  Component: MDXEditorComponent,
};
