import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { generatePackageSidebar } from '@kalisio/vitepress-theme/sidebar'
import packages from './packages.json'

const sortedPackages = [...packages].sort()

const sortedPackagesNavBar = sortedPackages.map(pkg => {
  return { text: pkg, link: `/packages/${pkg}/` }
})

const sortedPackageSidebar = Object.fromEntries(
  sortedPackages.map(pkg => [`/packages/${pkg}/`, generatePackageSidebar(pkg)])
)

export default withMermaid(
  defineConfig({
    base: '/feathers-ekosystem/',
    title: 'feathers-ekosystem',
    description: 'A collection of modules for FeathersJS',
    ignoreDeadLinks: true,
    head: [
      ['link', { href: 'https://cdnjs.cloudflare.com/ajax/libs/line-awesome/1.3.0/line-awesome/css/line-awesome.min.css', rel: 'stylesheet' }],
      ['link', { rel: 'icon', href: 'https://kalisio.github.io/kalisioscope/kalisio/kalisio-icon-light.svg' }]
    ],
    themeConfig: {
      logo: 'https://kalisio.github.io/kalisioscope/kalisio/kalisio-icon-light.svg',
      socialLinks: [{ icon: 'github', link: 'https://github.com/kalisio/feathers-ekosystem' }],
      nav: [
        { text: 'Overview', link: '/overview/about' },
        {
          text: 'Packages',
          items: sortedPackagesNavBar
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
        ],
        ...sortedPackageSidebar
      },
      footer: {
        copyright: 'MIT Licensed | Copyright © 2026-present Kalisio'
      }
    },
    vite: {
      optimizeDeps: {
        include: ['dayjs', 'mermaid', 'cytoscape', 'cytoscape-cose-bilkent'],
      },
      ssr: {
        noExternal: ['@kalisio/vitepress-theme']
      }
    }
  })
)


