/**
 * Normalize LaTeX-flavored math in markdown so remark-math can parse it.
 *
 * Handles common LLM output quirks:
 *  - `\[ ... \]` → `$$ ... $$` (block)
 *  - `\( ... \)` → `$ ... $` (inline)
 *  - Lone `$` on its own line used as a block fence — rewrite to `$$`.
 *  - Blank lines inside `$$...$$` blocks — remark-math's block parser stops
 *    at blank lines and leaks the fence into the rendered output.
 *
 * NB: in a JS replacement string, a literal `$` is written as `$$`, so a
 * literal `$$` fence is written as `$$$$`.
 */
export function preprocessLatex(content: string): string {
  let result = content
    .replace(/\\\[([\s\S]*?)\\\]/g, '\n$$$$\n$1\n$$$$\n')
    .replace(/\\\(([\s\S]*?)\\\)/g, ' $$$1$$ ')

  result = result.replace(
    /(^|\n)\$[ \t]*\n([\s\S]+?)\n\$[ \t]*(?=\n|$)/g,
    '$1$$$$\n$2\n$$$$'
  )

  result = result.replace(
    /\$\$\n([\s\S]+?)\n\$\$/g,
    (_, inner: string) => `$$\n${inner.trim().replace(/\n[ \t]*\n/g, '\n')}\n$$`
  )

  return result
}
