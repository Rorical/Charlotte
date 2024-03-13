import { createRouter, createWebHashHistory } from 'vue-router'

import MainView from './views/Main.vue'
import SettingsView from './views/Settings.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Main',
      component: MainView
    },
    {
      path: '/settings',
      name: 'Settings',
      component: SettingsView
    }
  ]
})

export default router
