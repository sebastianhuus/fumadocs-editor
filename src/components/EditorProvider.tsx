'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { EditMetadata, EditorAdapter, JsxComponentDescriptor } from '../types.js';
import { EditModal } from './EditModal.js';

interface EditorContextValue {
  /** Register edit metadata for the current page */
  setEditMetadata: (metadata: EditMetadata | null) => void;
  /** Open the editor */
  openEditor: () => void;
  /** Current edit metadata */
  editMetadata: EditMetadata | null;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export interface EditorProviderProps {
  children: ReactNode;

  /** The editor adapter to use */
  adapter: EditorAdapter;

  /** JSX component descriptors for custom components */
  jsxComponentDescriptors?: JsxComponentDescriptor[];

  /**
   * Position of the floating edit button
   * @default "bottom-right"
   */
  buttonPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

  /**
   * Custom styles for the floating button
   */
  buttonStyle?: React.CSSProperties;

  /**
   * Custom class name for the floating button
   */
  buttonClassName?: string;
}

/**
 * Provider that enables in-browser editing for Fumadocs pages.
 *
 * Wrap your root layout with this provider, then use `useRegisterEditable()`
 * in your page components to enable editing.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { EditorProvider } from 'fumadocs-editor/components';
 * import { mdxEditorAdapter } from 'fumadocs-editor/adapters/mdx-editor';
 * import '@mdxeditor/editor/style.css';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <EditorProvider adapter={mdxEditorAdapter}>
 *           {children}
 *         </EditorProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function EditorProvider({
  children,
  adapter,
  jsxComponentDescriptors,
  buttonPosition = 'bottom-right',
  buttonStyle,
  buttonClassName,
}: EditorProviderProps): ReactNode {
  const [editMetadata, setEditMetadata] = useState<EditMetadata | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const openEditor = useCallback(() => {
    if (editMetadata?.enabled) {
      setIsEditorOpen(true);
    }
  }, [editMetadata]);

  // Position styles for the floating button
  const positionStyles: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9998,
    ...(buttonPosition.includes('bottom') ? { bottom: '24px' } : { top: '24px' }),
    ...(buttonPosition.includes('right') ? { right: '24px' } : { left: '24px' }),
  };

  const defaultButtonStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    backgroundColor: 'var(--fd-primary, #3b82f6)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  };

  return (
    <EditorContext.Provider value={{ editMetadata, setEditMetadata, openEditor }}>
      {children}

      {/* Floating Edit Button */}
      {editMetadata?.enabled && (
        <button
          type="button"
          onClick={openEditor}
          className={buttonClassName}
          style={{ ...positionStyles, ...defaultButtonStyles, ...buttonStyle }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          aria-label="Edit this page"
        >
          <EditIcon />
          Edit Page
        </button>
      )}

      {/* Editor Modal */}
      {isEditorOpen && editMetadata && (
        <EditModal
          editMetadata={editMetadata}
          adapter={adapter}
          jsxComponentDescriptors={jsxComponentDescriptors}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
    </EditorContext.Provider>
  );
}

/**
 * Hook to access the editor context.
 * Must be used within an EditorProvider.
 */
export function useEditor(): EditorContextValue {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}

/**
 * Hook to register a page as editable.
 * Call this in your page component with the page's edit metadata.
 *
 * @example
 * ```tsx
 * // app/docs/[[...slug]]/page.tsx
 * import { useRegisterEditable } from 'fumadocs-editor/components';
 *
 * export default function Page({ params }) {
 *   const page = source.getPage(params.slug);
 *   useRegisterEditable(page?.data._edit);
 *
 *   return <DocsPage>...</DocsPage>;
 * }
 * ```
 */
export function useRegisterEditable(metadata: EditMetadata | undefined | null): void {
  const context = useContext(EditorContext);

  useEffect(() => {
    if (context) {
      context.setEditMetadata(metadata ?? null);

      // Cleanup: unregister when component unmounts
      return () => {
        context.setEditMetadata(null);
      };
    }
  }, [context, metadata]);
}

function EditIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}
