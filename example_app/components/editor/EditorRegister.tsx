'use client';

import { useRegisterEditable, useEditor } from 'fumadocs-editor/components';
import type { EditMetadata } from 'fumadocs-editor';
import type { ReactNode } from 'react';

export function EditorRegister({
  editMetadata,
  children,
  className,
}: {
  editMetadata?: EditMetadata;
  children?: ReactNode;
  className?: string;
}) {
  useRegisterEditable(editMetadata);
  const { openEditor } = useEditor();

  if (!editMetadata?.enabled) return null;

  return (
    <button type="button" onClick={openEditor} className={className}>
      {children}
    </button>
  );
}
