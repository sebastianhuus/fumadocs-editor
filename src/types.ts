import type { ComponentType } from 'react';

/**
 * View mode for the editor
 */
export type EditorViewMode = 'editor' | 'preview' | 'split';

/**
 * Result of validating MDX content
 */
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

export interface ValidationError {
  line?: number;
  column?: number;
  message: string;
}

/**
 * Props passed to editor adapter components
 */
export interface EditorComponentProps {
  /** Initial MDX content to edit */
  initialContent: string;

  /** Called when user saves - should return promise that resolves when save completes */
  onSave: (content: string) => Promise<void>;

  /** Called when user cancels editing */
  onCancel: () => void;

  /** Absolute file path being edited (for display purposes) */
  filePath: string;

  /** Custom MDX components available in this project */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mdxComponents?: Record<string, ComponentType<any>>;

  /** JSX component descriptors for editors that support them (like MDXEditor) */
  jsxComponentDescriptors?: JsxComponentDescriptor[];

  /** Initial view mode (editor, preview, or split) */
  initialViewMode?: EditorViewMode;

  /** Whether to enable live preview panel */
  enablePreview?: boolean;

  /** API endpoint for preview compilation (defaults to endpoint + '/preview') */
  previewEndpoint?: string;
}

/**
 * Descriptor for a custom JSX component that can be used in MDX
 */
export interface JsxComponentDescriptor {
  /** Component name as used in MDX (e.g., 'Callout') */
  name: string;
  /** Whether it is a block or inline component */
  kind: 'flow' | 'text';
  /** Props the component accepts */
  props?: JsxPropertyDescriptor[];
  /** Whether the component has children */
  hasChildren?: boolean;
  /** Custom editor component for this JSX element (optional) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Editor?: ComponentType<any>;
}

export interface JsxPropertyDescriptor {
  name: string;
  type: 'string' | 'number' | 'expression';
  required?: boolean;
}

/**
 * Adapter interface for pluggable editor implementations
 */
export interface EditorAdapter {
  /** Unique identifier for this editor */
  id: string;

  /** Display name shown in UI */
  name: string;

  /** The React component that renders the editor */
  Component: ComponentType<EditorComponentProps>;

  /**
   * Optional custom validation. If not provided, default MDX validation is used.
   */
  validate?: (content: string) => Promise<ValidationResult>;
}

/**
 * Edit metadata injected into pages during development
 */
export interface EditMetadata {
  /** Absolute path to the source file */
  absolutePath: string;
  /** API endpoint to POST edits to */
  endpoint: string;
  /** Whether editing is enabled */
  enabled: boolean;
}

/**
 * Configuration for the editor plugin
 */
export interface EditorPluginConfig {
  /** Enable/disable editor (defaults to NODE_ENV === 'development') */
  enabled?: boolean;
  /** API endpoint path (defaults to '/api/fumadocs-edit') */
  endpoint?: string;
  /** Editor adapter to use */
  adapter?: EditorAdapter;
  /** Custom MDX components to make available in the editor */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mdxComponents?: Record<string, ComponentType<any>>;
  /** JSX component descriptors for the editor */
  jsxComponentDescriptors?: JsxComponentDescriptor[];
  /** Initial view mode for the editor */
  initialViewMode?: EditorViewMode;
  /** Whether to enable live preview panel (requires @fumadocs/mdx-remote) */
  enablePreview?: boolean;
  /** API endpoint for preview compilation (defaults to endpoint + '/preview') */
  previewEndpoint?: string;
}

