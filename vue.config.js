const isLib = process.argv.includes('lib')

module.exports = {
  css: {
    extract: false
  },
  pages: isLib
    ? undefined
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
