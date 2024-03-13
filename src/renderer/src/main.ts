import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.scss'
import { setupIcons } from '@any-design/anyui'
import DefaultIcons from '@any-design/default-icons'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import dayjsPluginUTC from 'dayjs/plugin/utc'
import dayjsPluginTimeZone from 'dayjs/plugin/timezone'

dayjs.extend(localizedFormat)
dayjs.extend(dayjsPluginUTC)
dayjs.extend(dayjsPluginTimeZone)
dayjs.tz.setDefault(dayjs.tz.guess())
setupIcons({
  icons: DefaultIcons
})

createApp(App).use(createPinia).use(router).mount('#app')
