'use client';

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  EditorAdapter,
  EditorComponentProps,
  EditorViewMode,
  JsxComponentDescriptor as FumadocsJsxDescriptor,
} from '../types.js';

// Type for the ref methods exposed by MDXEditor
interface MDXEditorMethods {
  getMarkdown: () => string;
  setMarkdown: (markdown: string) => void;
  insertMarkdown: (markdown: string) => void;
}

// Type for the MDX compiler from @fumadocs/mdx-remote
interface MDXCompiler {
  compile: (options: {
    source: string;
    components?: Record<string, unknown>;
  }) => Promise<{
    body: (props: { components?: Record<string, unknown> }) => ReactNode;
    frontmatter: Record<string, unknown>;
  }>;
}

// Lazy load MDXEditor module to avoid SSR issues and reduce bundle size
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let MDXEditorModule: any = null;

async function loadMDXEditor(): Promise<typeof import('@mdxeditor/editor')> {
  if (!MDXEditorModule) {
    MDXEditorModule = await import('@mdxeditor/editor');
  }
  return MDXEditorModule;
}

// Lazy load @fumadocs/mdx-remote compiler
let mdxCompiler: MDXCompiler | null = null;

async function loadMDXCompiler(): Promise<MDXCompiler | null> {
  if (mdxCompiler) return mdxCompiler;

  try {
    const mod = await import('@fumadocs/mdx-remote');
    mdxCompiler = mod.createCompiler({
      // Use minimal preset for faster compilation in preview
      preset: 'minimal',
      development: true,
    });
    return mdxCompiler;
  } catch {
    // @fumadocs/mdx-remote not installed
    console.warn(
      'fumadocs-editor: @fumadocs/mdx-remote not found. Live preview disabled.',
    );
    return null;
  }
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

/**
 * Debounce hook
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Preview panel component that compiles and renders MDX
 */
function PreviewPanel({
  content,
  mdxComponents,
}: {
  content: string;
  mdxComponents?: Record<string, unknown>;
}): ReactNode {
  const [preview, setPreview] = useState<{
    status: 'loading' | 'ready' | 'error';
    content?: ReactNode;
    frontmatter?: Record<string, unknown>;
    error?: string;
  }>({ status: 'loading' });

  const debouncedContent = useDebounce(content, 300);

  useEffect(() => {
    let cancelled = false;

    async function compile() {
      const compiler = await loadMDXCompiler();
      if (!compiler) {
        setPreview({
          status: 'error',
          error:
            'Preview requires @fumadocs/mdx-remote. Install it with: pnpm add @fumadocs/mdx-remote',
        });
        return;
      }

      try {
        setPreview((prev) => ({ ...prev, status: 'loading' }));

        const result = await compiler.compile({
          source: debouncedContent,
          components: mdxComponents,
        });

        if (cancelled) return;

        const rendered = result.body({ components: mdxComponents });

        setPreview({
          status: 'ready',
          content: rendered,
          frontmatter: result.frontmatter,
        });
      } catch (error) {
        if (cancelled) return;

        setPreview({
          status: 'error',
          error: error instanceof Error ? error.message : 'Compilation failed',
        });
      }
    }

    compile();

    return () => {
      cancelled = true;
    };
  }, [debouncedContent, mdxComponents]);

  return (
    <div
      style={{
        height: '100%',
        overflow: 'auto',
        padding: '16px 24px',
        backgroundColor: 'var(--fd-background, #fff)',
      }}
    >
      {preview.status === 'loading' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            color: 'var(--fd-muted-foreground, #6b7280)',
          }}
        >
          <LoadingSpinner size={16} />
          <span style={{ marginLeft: '8px' }}>Compiling...</span>
        </div>
      )}

      {preview.status === 'error' && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#dc2626',
            fontSize: '14px',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
          }}
        >
          {preview.error}
        </div>
      )}

      {preview.status === 'ready' && (
        <div className="fd-mdx-preview-content">
          {/* Show frontmatter if present */}
          {preview.frontmatter &&
            Object.keys(preview.frontmatter).length > 0 && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: 'var(--fd-muted, #f3f4f6)',
                  borderRadius: '6px',
                  fontSize: '13px',
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: 'var(--fd-muted-foreground, #6b7280)',
                  }}
                >
                  Frontmatter
                </div>
                {Object.entries(preview.frontmatter).map(([key, value]) => (
                  <div key={key} style={{ marginTop: '4px' }}>
                    <span style={{ color: 'var(--fd-primary, #3b82f6)' }}>
                      {key}:
                    </span>{' '}
                    <span>{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          {preview.content}
        </div>
      )}
    </div>
  );
}

/**
 * View mode toggle buttons
 */
function ViewModeToggle({
  viewMode,
  onChange,
  previewAvailable,
}: {
  viewMode: EditorViewMode;
  onChange: (mode: EditorViewMode) => void;
  previewAvailable: boolean;
}): ReactNode {
  const buttonStyle = (active: boolean) => ({
    padding: '4px 8px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: active ? 'var(--fd-primary, #3b82f6)' : 'transparent',
    color: active ? 'white' : 'var(--fd-foreground, #1f2937)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'background-color 0.15s',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        padding: '2px',
        backgroundColor: 'var(--fd-muted, #f3f4f6)',
        borderRadius: '6px',
      }}
    >
      <button
        type="button"
        onClick={() => onChange('editor')}
        style={buttonStyle(viewMode === 'editor')}
        title="Editor only"
      >
        Editor
      </button>
      {previewAvailable && (
        <>
          <button
            type="button"
            onClick={() => onChange('split')}
            style={buttonStyle(viewMode === 'split')}
            title="Split view"
          >
            Split
          </button>
          <button
            type="button"
            onClick={() => onChange('preview')}
            style={buttonStyle(viewMode === 'preview')}
            title="Preview only"
          >
            Preview
          </button>
        </>
      )}
    </div>
  );
}

function MDXEditorComponent({
  initialContent,
  onSave,
  onCancel,
  jsxComponentDescriptors,
  mdxComponents,
  initialViewMode = 'split',
  enablePreview = true,
}: EditorComponentProps): ReactNode {
  const [isLoaded, setIsLoaded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [EditorComponent, setEditorComponent] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [plugins, setPlugins] = useState<any[]>([]);
  const editorRef = useRef<MDXEditorMethods>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentContent, setCurrentContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<EditorViewMode>(
    enablePreview ? initialViewMode : 'editor',
  );
  const [previewAvailable, setPreviewAvailable] = useState(false);

  // Check if preview is available (mdx-remote installed)
  useEffect(() => {
    if (enablePreview) {
      loadMDXCompiler().then((compiler) => {
        setPreviewAvailable(!!compiler);
        if (!compiler) {
          setViewMode('editor');
        }
      });
    }
  }, [enablePreview]);

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
    if (editorRef.current) {
      setCurrentContent(editorRef.current.getMarkdown());
    }
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

  // Memoize mdxComponents for preview
  const previewComponents = useMemo(
    () => mdxComponents ?? {},
    [mdxComponents],
  );

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

  const showEditor = viewMode === 'editor' || viewMode === 'split';
  const showPreview = viewMode === 'preview' || viewMode === 'split';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* Editor panel */}
        {showEditor && (
          <div
            style={{
              flex: viewMode === 'split' ? 1 : 'auto',
              width: viewMode === 'editor' ? '100%' : undefined,
              overflow: 'auto',
              minWidth: 0,
              borderRight:
                viewMode === 'split'
                  ? '1px solid var(--fd-border, #e5e7eb)'
                  : undefined,
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
        )}

        {/* Preview panel */}
        {showPreview && previewAvailable && (
          <div
            style={{
              flex: viewMode === 'split' ? 1 : 'auto',
              width: viewMode === 'preview' ? '100%' : undefined,
              overflow: 'auto',
              minWidth: 0,
            }}
          >
            <PreviewPanel
              content={currentContent}
              mdxComponents={previewComponents}
            />
          </div>
        )}
      </div>

      {/* Footer with view toggle and save/cancel buttons */}
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
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* View mode toggle */}
          {enablePreview && (
            <ViewModeToggle
              viewMode={viewMode}
              onChange={setViewMode}
              previewAvailable={previewAvailable}
            />
          )}

          {/* Status */}
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
        .fd-mdx-preview-content {
          font-family: var(--fd-font-family, system-ui, sans-serif);
          line-height: 1.7;
        }
        .fd-mdx-preview-content h1 {
          font-size: 2em;
          font-weight: 700;
          margin-top: 0;
          margin-bottom: 0.5em;
        }
        .fd-mdx-preview-content h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        .fd-mdx-preview-content h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin-top: 1.25em;
          margin-bottom: 0.5em;
        }
        .fd-mdx-preview-content p {
          margin: 1em 0;
        }
        .fd-mdx-preview-content code {
          background: var(--fd-muted, #f3f4f6);
          padding: 0.2em 0.4em;
          border-radius: 4px;
          font-size: 0.9em;
        }
        .fd-mdx-preview-content pre {
          background: var(--fd-muted, #f3f4f6);
          padding: 1em;
          border-radius: 6px;
          overflow-x: auto;
        }
        .fd-mdx-preview-content pre code {
          background: none;
          padding: 0;
        }
        .fd-mdx-preview-content ul, .fd-mdx-preview-content ol {
          margin: 1em 0;
          padding-left: 1.5em;
        }
        .fd-mdx-preview-content li {
          margin: 0.25em 0;
        }
        .fd-mdx-preview-content blockquote {
          border-left: 4px solid var(--fd-border, #e5e7eb);
          padding-left: 1em;
          margin: 1em 0;
          color: var(--fd-muted-foreground, #6b7280);
        }
        .fd-mdx-preview-content a {
          color: var(--fd-primary, #3b82f6);
          text-decoration: underline;
        }
        .fd-mdx-preview-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        .fd-mdx-preview-content th, .fd-mdx-preview-content td {
          border: 1px solid var(--fd-border, #e5e7eb);
          padding: 0.5em 1em;
          text-align: left;
        }
        .fd-mdx-preview-content th {
          background: var(--fd-muted, #f3f4f6);
          font-weight: 600;
        }
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
 * Features:
 * - Split view with live MDX preview (requires @fumadocs/mdx-remote)
 * - Frontmatter editing via form dialog
 * - Toggle between editor, preview, and split modes
 * - Real-time compilation with error display
 *
 * @remarks
 * Make sure to import the MDXEditor styles in your application:
 * ```tsx
 * import '@mdxeditor/editor/style.css';
 * ```
 *
 * For live preview, install @fumadocs/mdx-remote:
 * ```bash
 * pnpm add @fumadocs/mdx-remote
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
 * @example With custom JSX components and preview
 * ```tsx
 * import { EditButton } from 'fumadocs-editor/components';
 * import { mdxEditorAdapter } from 'fumadocs-editor/adapters/mdx-editor';
 * import { Callout, Tabs } from 'fumadocs-ui/components';
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
 * const mdxComponents = { Callout, Tabs };
 *
 * <EditButton
 *   editMetadata={page.data._edit}
 *   adapter={mdxEditorAdapter}
 *   jsxComponentDescriptors={jsxComponentDescriptors}
 *   mdxComponents={mdxComponents}
 *   enablePreview={true}
 * />
 * ```
 */
export const mdxEditorAdapter: EditorAdapter = {
  id: 'mdx-editor',
  name: 'MDX Editor',
  Component: MDXEditorComponent,
};
