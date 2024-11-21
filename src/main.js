import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'

import Vue3Lottie from 'vue3-lottie'

const app = createApp(App)

app.use(createPinia())
app.use(Vue3Lottie)

app.mount('#app')
