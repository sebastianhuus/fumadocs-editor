'use client';

import { type ReactNode, useState } from 'react';
import type { EditMetadata, EditorAdapter, JsxComponentDescriptor } from '../types.js';
import { EditModal } from './EditModal.js';

export interface EditButtonProps {
  /** Edit metadata from page data (page.data._edit) */
  editMetadata: EditMetadata;

  /** The editor adapter to use */
  adapter: EditorAdapter;

  /** JSX component descriptors for the editor */
  jsxComponentDescriptors?: JsxComponentDescriptor[];

  /** Custom button content */
  children?: ReactNode;

  /** Additional class names */
  className?: string;
}

/**
 * A button that opens the edit modal when clicked.
 * Only renders when editMetadata.enabled is true.
 *
 * @example
 * ```tsx
 * import { EditButton } from 'fumadocs-editor/components';
 * import { mdxEditorAdapter } from 'fumadocs-editor/adapters/mdx-editor';
 *
 * // In your page component
 * {page.data._edit && (
 *   <EditButton
 *     editMetadata={page.data._edit}
 *     adapter={mdxEditorAdapter}
 *   />
 * )}
 * ```
 */
export function EditButton({
  editMetadata,
  adapter,
  jsxComponentDescriptors,
  children,
  className,
}: EditButtonProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);

  // Don't render if editing is not enabled
  if (!editMetadata?.enabled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={className}
        aria-label="Edit this page"
      >
        {children ?? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <EditIcon />
            Edit
          </span>
        )}
      </button>

      {isOpen && (
        <EditModal
          editMetadata={editMetadata}
          adapter={adapter}
          jsxComponentDescriptors={jsxComponentDescriptors}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
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
