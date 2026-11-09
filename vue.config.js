const isLib = process.argv.includes('lib')
const isDemo = process.env.npm_lifecycle_event === 'build:demo'

module.exports = {
  publicPath: isDemo ? '/mark-image-vue/' : '/',
  css: {
    extract: false
  },
  pages: isLib
    ? undefined
    : isDemo
    ? {
      index: {
        entry: 'examples/demo/main.js',
        template: 'examples/demo/index.html',
        filename: 'index.html',
        title: '@mark-image/vue demo'
      }
    }
    : {
      index: {
        entry: 'examples/demo/main.js',
        template: 'examples/demo/index.html',
        filename: 'index.html',
        title: '@mark-image/vue demo'
      },
      'config-check': {
        entry: 'test/config-check.js',
        template: 'test/config-check.html',
        filename: 'test/config-check.html',
        title: '配置测试'
      }
    },
  configureWebpack: isLib
    ? {
      externals: {
        vue: {
          commonjs: 'vue',
          commonjs2: 'vue',
          amd: 'vue',
          root: 'Vue'
        },
        fabric: {
          commonjs: 'fabric',
          commonjs2: 'fabric',
          amd: 'fabric',
          root: 'fabric'
        }
      }
    }
    : {}
}
