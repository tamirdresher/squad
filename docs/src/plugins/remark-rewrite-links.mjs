import { visit } from 'unist-util-visit';

/**
 * Remark plugin that rewrites relative .md links to Astro route paths.
 *
 * In content collection markdown files, internal links look like:
 *   ../reference/sdk.md       → /squad/docs/reference/sdk/
 *   first-session.md          → /squad/docs/get-started/first-session/
 *   ../features/memory.md#api → /squad/docs/features/memory/#api
 *
 * Links to deleted sections (cli/, sdk/) are remapped to reference/.
 * Links that escape the content directory (../../README.md) go to GitHub.
 */

const GITHUB_REPO = 'https://github.com/github/squad';

// Map old section paths to new locations
const SECTION_REDIRECTS = {
  'cli/installation': 'reference/cli',
  'cli/shell': 'reference/cli',
  'cli/vscode': 'features/vscode',
  'sdk/api-reference': 'reference/sdk',
  'sdk/integration': 'reference/sdk',
  'sdk/tools-and-hooks': 'reference/sdk',
};

// Files that live in the repo root, not in docs
const REPO_ROOT_FILES = ['README', 'CHANGELOG', 'CONTRIBUTING', 'CONTRIBUTORS', 'LICENSE'];

function resolveSegments(currentDir, relativePath) {
  const segments = currentDir ? currentDir.split('/') : [];
  for (const part of relativePath.split('/')) {
    if (part === '..') {
      if (segments.length === 0) return null; // escaped content root
      segments.pop();
    } else if (part !== '.' && part !== '') {
      segments.push(part);
    }
  }
  return segments;
}

export function remarkRewriteLinks() {
  return (tree, file) => {
    visit(tree, 'link', (node) => {
      const url = node.url;
      if (!url) return;

      // Skip external links and pure anchors
      if (/^https?:\/\//.test(url) || url.startsWith('#') || url.startsWith('mailto:')) return;
      if (!url.includes('.md')) return;

      // Split off hash fragment
      const hashIdx = url.indexOf('#');
      const pathPart = hashIdx >= 0 ? url.substring(0, hashIdx) : url;
      const hash = hashIdx >= 0 ? url.substring(hashIdx) : '';

      if (!pathPart.endsWith('.md')) return;

      // Remove .md extension
      const cleaned = pathPart.replace(/\.md$/, '');

      // Get the current file's context from its path
      const filePath = (file?.history?.[0] || '').replace(/\\/g, '/');
      const contentDocsMatch = filePath.match(/src\/content\/docs\/(.+)\.md$/);
      const contentBlogMatch = filePath.match(/src\/content\/blog\/(.+)\.md$/);

      if (contentDocsMatch) {
        const currentFilePath = contentDocsMatch[1];
        const currentDir = currentFilePath.includes('/')
          ? currentFilePath.substring(0, currentFilePath.lastIndexOf('/'))
          : '';

        const segments = resolveSegments(currentDir, cleaned);

        if (segments === null) {
          // Escaped the content root — link to repo root file
          const fileName = cleaned.split('/').pop();
          const repoFile = REPO_ROOT_FILES.find(f => f.toLowerCase() === fileName.toLowerCase());
          if (repoFile) {
            node.url = `${GITHUB_REPO}/blob/main/${repoFile}.md${hash}`;
          }
          return;
        }

        let resolved = segments.join('/');

        // Apply redirects for deleted sections
        if (SECTION_REDIRECTS[resolved]) {
          resolved = SECTION_REDIRECTS[resolved];
        }

        node.url = `/squad/docs/${resolved}/${hash}`;

      } else if (contentBlogMatch) {
        // Blog posts: resolve relative to blog/ directory
        // Blog is at src/content/blog/, so ../  goes to src/content/
        // and ../../ goes to src/ (outside content entirely)

        // Count how many ../ levels
        let remaining = cleaned;
        let upLevels = 0;
        while (remaining.startsWith('../')) {
          remaining = remaining.substring(3);
          upLevels++;
        }

        if (upLevels >= 2) {
          // Escaped content entirely — likely repo root files
          const fileName = remaining.split('/').pop();
          const repoFile = REPO_ROOT_FILES.find(f => f.toLowerCase() === fileName.toLowerCase());
          if (repoFile) {
            node.url = `${GITHUB_REPO}/blob/main/${repoFile}.md${hash}`;
          } else {
            // Link to a repo path like samples/README
            node.url = `${GITHUB_REPO}/blob/main/${remaining}.md${hash}`;
          }
        } else if (upLevels === 1) {
          // One level up from blog/ — this is a doc page reference
          // remaining might be "features/remote-control" or "remote-squad-mode"
          node.url = `/squad/docs/${remaining}/${hash}`;
        } else {
          // Same directory — another blog post
          node.url = `/squad/blog/${remaining}/${hash}`;
        }
      } else {
        // Fallback: strip .md, add trailing slash
        node.url = `${cleaned.replace(/^\.\//, '')}/${hash}`;
      }
    });
  };
}
