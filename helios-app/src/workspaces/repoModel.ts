export const SUPPORTED_FILE_PATTERN = /^(?!.*\.\.)(?!\/)[\w./-]{1,120}$/
export const SUPPORTED_FILE_EXTENSION = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|css|html|py|txt|csv|svg|ipynb|cpp|cc|cxx|c|h|hpp|java|go|rs|rb|php|sh)$/i

export type EditorLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'cpp'
  | 'c'
  | 'html'
  | 'css'
  | 'markdown'
  | 'json'
  | 'java'
  | 'go'
  | 'rust'
  | 'plaintext'

export const LANGUAGE_OPTIONS: Array<{ id: EditorLanguage; label: string; extension: string; starter: string }> = [
  {
    id: 'cpp',
    label: 'C++',
    extension: 'cpp',
    starter: `#include <iostream>\n\nint main() {\n  std::cout << "Hello, Helios\\n";\n  return 0;\n}\n`,
  },
  {
    id: 'c',
    label: 'C',
    extension: 'c',
    starter: `#include <stdio.h>\n\nint main(void) {\n  printf("Hello, Helios\\n");\n  return 0;\n}\n`,
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    extension: 'js',
    starter: `console.log('Hello, Helios')\n`,
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    extension: 'ts',
    starter: `const message: string = 'Hello, Helios'\nconsole.log(message)\n`,
  },
  {
    id: 'python',
    label: 'Python',
    extension: 'py',
    starter: `print("Hello, Helios")\n`,
  },
  {
    id: 'html',
    label: 'HTML',
    extension: 'html',
    starter: `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8" /><title>Preview</title></head>\n<body><main>Hello, Helios</main></body>\n</html>\n`,
  },
  {
    id: 'css',
    label: 'CSS',
    extension: 'css',
    starter: `body { font-family: "Source Sans 3", system-ui, sans-serif; background: #eceff3; color: #1c1917; }\n`,
  },
  {
    id: 'markdown',
    label: 'Markdown',
    extension: 'md',
    starter: `# Hello, Helios\n\nWrite notes here.\n`,
  },
  {
    id: 'json',
    label: 'JSON',
    extension: 'json',
    starter: `{\n  "hello": "Helios"\n}\n`,
  },
  {
    id: 'java',
    label: 'Java',
    extension: 'java',
    starter: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, Helios");\n  }\n}\n`,
  },
  {
    id: 'go',
    label: 'Go',
    extension: 'go',
    starter: `package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello, Helios")\n}\n`,
  },
  {
    id: 'rust',
    label: 'Rust',
    extension: 'rs',
    starter: `fn main() {\n  println!("Hello, Helios");\n}\n`,
  },
]

export const README_STARTER = `# Project

Describe what this repository is for, how to run it, and what to try next.

## Quick start

1. Add the files you need
2. Keep editing — Helios IDE autosaves your work
3. Optional snapshots live under History
`

export function isValidRepoPath(path: string) {
  return SUPPORTED_FILE_PATTERN.test(path) && SUPPORTED_FILE_EXTENSION.test(path)
}

export function languageForFile(name: string): EditorLanguage {
  const lower = name.toLowerCase()
  if (lower.endsWith('.html')) return 'html'
  if (lower.endsWith('.css')) return 'css'
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'typescript'
  if (lower.endsWith('.md')) return 'markdown'
  if (lower.endsWith('.py')) return 'python'
  if (/\.(cpp|cc|cxx|hpp)$/.test(lower)) return 'cpp'
  if (lower.endsWith('.c') || lower.endsWith('.h')) return 'c'
  if (lower.endsWith('.java')) return 'java'
  if (lower.endsWith('.go')) return 'go'
  if (lower.endsWith('.rs')) return 'rust'
  if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) return 'javascript'
  return 'plaintext'
}

export function monacoLanguageFor(lang: EditorLanguage) {
  if (lang === 'cpp') return 'cpp'
  if (lang === 'c') return 'c'
  if (lang === 'rust') return 'rust'
  if (lang === 'go') return 'go'
  if (lang === 'java') return 'java'
  if (lang === 'plaintext') return 'plaintext'
  return lang
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

export function replaceExtension(path: string, extension: string) {
  const slash = path.lastIndexOf('/')
  const base = slash >= 0 ? path.slice(slash + 1) : path
  const dir = slash >= 0 ? path.slice(0, slash + 1) : ''
  const stem = base.includes('.') ? base.slice(0, base.lastIndexOf('.')) : base
  return `${dir}${stem || 'main'}.${extension}`
}
