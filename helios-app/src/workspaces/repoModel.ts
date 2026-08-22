export const SUPPORTED_FILE_PATTERN = /^(?!.*\.\.)(?!\/)[\w./-]{1,120}$/
export const SUPPORTED_FILE_EXTENSION = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|css|html|py|txt|csv|svg|ipynb)$/i

export const README_STARTER = `# Project

Describe what this repository is for, how to run it, and what to try next.

## Quick start

1. Add the files you need
2. Write a first commit
3. Keep working in this Project
`

export function isValidRepoPath(path: string) {
  return SUPPORTED_FILE_PATTERN.test(path) && SUPPORTED_FILE_EXTENSION.test(path)
}

export function languageForFile(name: string) {
  if (name.endsWith('.html')) return 'html'
  if (name.endsWith('.css')) return 'css'
  if (name.endsWith('.json')) return 'json'
  if (name.endsWith('.ts') || name.endsWith('.tsx')) return 'typescript'
  if (name.endsWith('.md')) return 'markdown'
  if (name.endsWith('.py')) return 'python'
  if (name.endsWith('.svg')) return 'xml'
  if (name.endsWith('.csv') || name.endsWith('.txt')) return 'plaintext'
  return 'javascript'
}

export function filesFromList(files: Array<{ path: string; content: string }>) {
  return Object.fromEntries(files.map(file => [file.path, file.content]))
}

export function artifactPathForKind(kind: 'notebook' | 'writing' | 'spreadsheet') {
  if (kind === 'notebook') return 'notebook.json'
  if (kind === 'spreadsheet') return 'data.json'
  return 'document.html'
}

export function sortFilePaths(paths: string[]) {
  return [...paths].sort((a, b) => a.localeCompare(b))
}
