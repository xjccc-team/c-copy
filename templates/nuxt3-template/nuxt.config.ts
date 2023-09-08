import removeConsole from 'vite-plugin-remove-console'
import type { PluginOption } from 'vite'
// https://v3.nuxtjs.org/api/configuration/nuxt.config

const debug = process.env.NODE_ENV === 'development'
const cdnURL = ''
const lessHTTPS = ''
const plugins = [] as PluginOption[]

let globalScript = [] as {
  type?: string
  children?: string
  src?: string
}[]
if (!debug) {
  plugins.push(removeConsole())
}

if (debug) {
  globalScript = [
    {
      src: 'https://s.kcimg.cn/wap/js/detail/vconsole.min.js'
    },
    {
      type: 'text/javascript',
      children: 'var vConsole = new VConsole()'
    }
  ]
}

export default defineNuxtConfig({
  devtools: { enabled: true },
  typescript: {
    shim: false,
    strict: true
  },
  app: {
    buildAssetsDir: '/client/',
    cdnURL,
    head: {
      script: globalScript
    }
  },
  nitro: {
    output: {
      dir: '~/node-server',
      publicDir: '~/node-server/'
    }
  },
  experimental: {
    inlineSSRStyles: false,
    treeshakeClientOnly: false
  },
  sourcemap: debug,
  build: {
  },
  runtimeConfig: {},
  css: ['~/css/reset.css'],
  vite: {
    build: {
      cssTarget: 'chrome61',
      target: 'es2015'
    },
    plugins,
    css: {
      preprocessorOptions: {
        less: {
          additionalData: (content: string, loaderContext: string) => {
            if (~loaderContext.indexOf('app.vue')) {
              return content
            }
            // 注入less - @HTTPS静态资源变量
            return `@HTTPS: ${lessHTTPS};${content}`
          }
        }
      }
    }
  },
  ignore: [],
  hooks: {
    // 'pages:extend' (routes) {}
  },
  modules: [
    'nuxt-error-and-cache',
    'nuxt-custom-fetch',
    [
      '@pinia/nuxt',
      {
        disableVuex: true,
        autoImports: ['defineStore', ['defineStore', 'definePiniaStore']]
      }
    ]
  ]
})
