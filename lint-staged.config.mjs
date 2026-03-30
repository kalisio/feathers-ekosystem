export default {
  '*.{js,cjs,mjs}': (files) => {
    const packages = new Set(
      files
        .map(f => f.match(/((?:packages|examples)\/[^/]+)/)?.[1])
        .filter(Boolean)
    )
    return [...packages].map(pkg => `pnpm --filter ./${pkg} lint`)
  }
}