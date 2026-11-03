import Vue from 'vue'
import App from './App.vue'
import MarkImage from '../../src'

Vue.config.productionTip = false
Vue.use(MarkImage)

new Vue({
  render: h => h(App)
}).$mount('#app')
