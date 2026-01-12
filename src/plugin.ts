import type { LoaderPlugin } from 'fumadocs-core/source';
import type { EditMetadata, EditorPluginConfig } from './types.js';

/**
 * Loader plugin that injects edit metadata into pages during development.
 *
 * This allows the editor UI to know which file to edit and where to save.
 *
 * @example
 * ```ts
 * import { loader } from 'fumadocs-core/source';
 * import { editorPlugin } from 'fumadocs-editor/plugin';
 *
 * export const source = loader({
 *   // ...
 *   plugins: [editorPlugin()],
 * });
 * ```
 */
export function editorPlugin(config: EditorPluginConfig = {}): LoaderPlugin {
  const enabled = config.enabled ?? process.env.NODE_ENV === 'development';
  const endpoint = config.endpoint ?? '/api/__fumadocs/edit';

  if (!enabled) {
    // Return no-op plugin when disabled
    return { name: 'fumadocs-editor' };
  }

  return {
    name: 'fumadocs-editor',

    transformStorage({ storage }) {
      for (const filePath of storage.getFiles()) {
        const file = storage.read(filePath);

        // Only process page files that have an absolute path
        if (!file || file.format !== 'page' || !file.absolutePath) {
          continue;
        }

        // Inject edit metadata into the page data
        const editMetadata: EditMetadata = {
          absolutePath: file.absolutePath,
          endpoint,
          enabled: true,
        };

        // Add to file.data using a namespaced key to avoid conflicts
        (file.data as Record<string, unknown>)._edit = editMetadata;
      }
    },
  };
}

export type { EditorPluginConfig };

