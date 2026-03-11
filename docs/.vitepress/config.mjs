import fs from 'fs'
import path from 'path'
import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    base: '/feathers-ekosystem/',
    title: 'feathers-ekosystem',
    description: 'A collection of modules for FeathersJS',
    ignoreDeadLinks: true,
    head: [
      ['link', { href: 'https://cdnjs.cloudflare.com/ajax/libs/line-awesome/1.3.0/line-awesome/css/line-awesome.min.css', rel: 'stylesheet' }],
      ['link', { rel: 'icon', href: 'https://kalisio.github.io/kalisioscope/kalisio/kalisio-icon-2048x2048.png' }]
    ],
    themeConfig: {
      logo: 'https://kalisio.github.io/kalisioscope/kalisio/kalisio-icon-2048x2048.png',
      socialLinks: [{ icon: 'github', link: 'https://github.com/kalisio/feathers-ekosystem' }],
      nav: [
        { text: 'Overview', link: '/overview/about' }
        ,
        {
          text: 'Packages',
          items: [
            { text: 'feathers-import-export', link: '/packages/feathers-import-export/' },
            { text: 'feathers-keycloak-listener', link: '/packages/feathers-keycloak-listener/' },
            { text: 'feathers-s3', link: '/packages/feathers-s3/' },
            { text: 'feathers-webpush', link: '/packages/feathers-webpush/' }
          ]
        }
      ],
      sidebar: {
        '/overview/': [
          { text: 'About', link: '/overview/about' },
          { text: 'Contributing', link: '/overview/contributing' },
          { text: 'Roadmap', link: '/overview/roadmap' },
          { text: 'Changelog', link: '/overview/changelog' },
          { text: 'License', link: '/overview/license' },
          { text: 'Contact', link: '/overview/contact' }
        ]
        ,
        '/packages/feathers-import-export/': generateSideBar('feathers-import-export'),
        '/packages/feathers-keycloak-listener/': generateSideBar('feathers-keycloak-listener'),
        '/packages/feathers-s3/': generateSideBar('feathers-s3'),
        '/packages/feathers-webpush/': generateSideBar('feathers-webpush')
      },
      footer: {
        copyright: 'MIT Licensed | Copyright © 2026-present Kalisio'
      }
    },
    vite: {
      optimizeDeps: {
        include: ['keycloak-js', 'lodash', 'dayjs', 'mermaid', 'cytoscape', 'cytoscape-cose-bilkent'],
      },
      ssr: {
        noExternal: ['vitepress-theme-kalisio', 'dayjs', 'mermaid', 'cytoscape', 'cytoscape-cose-bilkent']
      }
    }
  })
)


function generateSideBar (pkg) {
  // Ensure the pkg folder exists
  const pkgDir = path.resolve(process.cwd(), `docs/packages/${pkg}`)
    if (!fs.existsSync(pkgDir)) {
    return []
  }
  // Helper function to build the tree
  function buildTree(dir, basePath = '') {
    const entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      )
    const items = []
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const relativePath = path.join(basePath, entry.name)
      // Folder case
      if (entry.isDirectory()) {
        const children = buildTree(fullPath, relativePath)
        if (children.length > 0) {
          items.push({
            text: entry.name,
            items: children
          })
        }
      }
      // File case
      if (
        entry.isFile() &&
        entry.name.endsWith('.md') &&
        entry.name !== 'index.md'
      ) {
        const name = relativePath.replace(/\.md$/, '').replace(/\\/g, '/')
        items.push({
          text: entry.name.replace('.md', ''),
          link: `/packages/${pkg}/${name}`
        })
      }
    }
    return items
  }
  // Build the sidebar tree
  return [
    { text: pkg, link: `/packages/${pkg}/index` },
    ...buildTree(pkgDir)
  ]
}