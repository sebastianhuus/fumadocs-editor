'use client';

import { type ComponentType, type ReactNode, useCallback, useEffect, useState } from 'react';
import type {
  EditMetadata,
  EditorAdapter,
  EditorViewMode,
  JsxComponentDescriptor,
  ValidationResult,
} from '../types.js';

export interface EditModalProps {
  /** Edit metadata from page data */
  editMetadata: EditMetadata;

  /** The editor adapter to use */
  adapter: EditorAdapter;

  /** JSX component descriptors for the editor */
  jsxComponentDescriptors?: JsxComponentDescriptor[];

  /** Custom MDX components for preview */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mdxComponents?: Record<string, ComponentType<any>>;

  /** Initial view mode */
  initialViewMode?: EditorViewMode;

  /** Whether to enable preview */
  enablePreview?: boolean;

  /** Called when the modal should close */
  onClose: () => void;
}

interface ModalState {
  status: 'loading' | 'ready' | 'saving' | 'error';
  content: string;
  error?: string;
  validation?: ValidationResult;
}

/**
 * Modal that contains the editor.
 * Handles loading content, saving, and displaying errors.
 */
export function EditModal({
  editMetadata,
  adapter,
  jsxComponentDescriptors,
  mdxComponents,
  initialViewMode,
  enablePreview,
  onClose,
}: EditModalProps): ReactNode {
  const [state, setState] = useState<ModalState>({
    status: 'loading',
    content: '',
  });

  // Load file content on mount
  useEffect(() => {
    async function loadContent() {
      try {
        const response = await fetch(
          `${editMetadata.endpoint}?path=${encodeURIComponent(editMetadata.absolutePath)}`,
        );
        const data = await response.json();

        if (data.error) {
          setState({ status: 'error', content: '', error: data.error });
        } else {
          setState({ status: 'ready', content: data.content });
        }
      } catch (error) {
        setState({
          status: 'error',
          content: '',
          error:
            error instanceof Error ? error.message : 'Failed to load content',
        });
      }
    }

    loadContent();
  }, [editMetadata.absolutePath, editMetadata.endpoint]);

  // Handle save
  const handleSave = useCallback(
    async (content: string) => {
      setState((prev) => ({ ...prev, status: 'saving' }));

      try {
        const response = await fetch(editMetadata.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: editMetadata.absolutePath,
            content,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: data.error,
            validation: data.validation,
          }));
          return;
        }

        // Success - close modal, the page will hot-reload
        onClose();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to save',
        }));
      }
    },
    [editMetadata.absolutePath, editMetadata.endpoint, onClose],
  );

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const EditorComponent = adapter.Component;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--fd-background, #fff)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Edit page"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--fd-border, #e5e7eb)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 500 }}>Editing</span>
          <code
            style={{
              fontSize: '12px',
              padding: '2px 6px',
              backgroundColor: 'var(--fd-muted, #f3f4f6)',
              borderRadius: '4px',
            }}
          >
            {editMetadata.absolutePath.split('/').pop()}
          </code>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '4px 8px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          aria-label="Close editor"
        >
          Close
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {state.status === 'loading' && (
          <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>
        )}

        {state.status === 'error' && (
          <div style={{ padding: '24px' }}>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626',
              }}
            >
              <strong>Error:</strong> {state.error}
              {state.validation?.errors?.map((err, i) => (
                <div key={i} style={{ marginTop: '4px', fontSize: '14px' }}>
                  {err.line && `Line ${err.line}: `}
                  {err.message}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setState((prev) => ({ ...prev, status: 'ready' }))}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                backgroundColor: 'var(--fd-primary, #3b82f6)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Continue Editing
            </button>
          </div>
        )}

        {(state.status === 'ready' || state.status === 'saving') && (
          <EditorComponent
            initialContent={state.content}
            filePath={editMetadata.absolutePath}
            jsxComponentDescriptors={jsxComponentDescriptors}
            mdxComponents={mdxComponents}
            initialViewMode={initialViewMode}
            enablePreview={enablePreview}
            onSave={handleSave}
            onCancel={onClose}
          />
        )}
      </div>

      {/* Saving indicator */}
      {state.status === 'saving' && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '16px 24px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            borderRadius: '8px',
          }}
        >
          Saving...
        </div>
      )}
    </div>
  );
}
