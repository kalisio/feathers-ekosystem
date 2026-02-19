import fs from 'fs'
import path from 'path'
import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    base: '/feathers-ekosystem/',
    title: 'feathers-ekosystem',
    description: 'A collection of Kalisio maintained modules for FeathersJS',
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
            { text: 'feathers-keycloak-listener', link: '/packages/feathers-keycloak-listener/' }
          ]
        }
      ],
      sidebar: {
        '/overview/': [
          { text: 'About', link: '/overview/about' },
          { text: 'Contributing', link: '/overview/contributing' },
          { text: 'License', link: '/overview/license' },
          { text: 'Contact', link: '/overview/contact' }
        ]
        ,
        '/packages/feathers-keycloak-listener/': [
          { text: 'Usage', link: '/packages/feathers-keycloak-listener/index' },
          { text: 'Service', link: '/packages/feathers-keycloak-listener/service' },
          { text: 'Hooks', items: [
            { text: 'Sessions', link: '/packages/feathers-keycloak-listener/hooks/hooks.sessions' },
            { text: 'Users', link: '/packages/feathers-keycloak-listener/hooks/hooks.users' }
          ]}
        ]
      },
      footer: {
        copyright: 'MIT Licensed | Copyright © 2026 Kalisio'
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


function getSideBar (pkg) {
  if (pkg === 'feathers-keycloak-listener') {
    return []
  }
}