<script setup lang="ts">
import { message } from '@any-design/anyui'
import { Settings } from '../../../main/models/Utils'
import { onMounted, ref, toRaw, toValue } from 'vue'
import { useRouter } from 'vue-router'
const configs = ref<Settings>({} as Settings)
const rounter = useRouter()
const firstLoad = ref(false)

onMounted(async () => {
  firstLoad.value = await window.api.getStore('firstLoad')
  configs.value = (await window.api.getStore('settings')) as Settings
})

const convert = (settings: Settings) => {
  settings.Chat.HistoryLength = parseInt(settings.Chat.HistoryLength as string)
  return settings
}

const save = async () => {
  let settings: Settings = toRaw(toValue(configs))
  settings = convert(settings)
  console.log(settings)
  await window.api.setStore('settings', settings)
  await window.api.reloadMain()
  message({
    type: 'success',
    content: 'Success'
  })
  if (firstLoad.value) {
    setTimeout(async () => {
      await window.api.setStore('firstLoad', false)
      rounter.push({
        name: 'Main'
      })
    }, 2000)
  }
}
</script>

<template>
  <div class="container">
    <h2 v-if="firstLoad">Configuration is needed before you start.</h2>
    <div v-for="(innerConfigs, outerKey) in configs" :key="outerKey" class="outer-wrapper">
      <h2>{{ outerKey }}</h2>
      <div
        v-for="(value, innerKey) in innerConfigs"
        :key="`${outerKey}.${innerKey}`"
        class="inner-wrapper"
      >
        <p>{{ innerKey }}</p>
        <a-input v-model="configs[outerKey][innerKey]" :placeholder="value"></a-input>
      </div>
    </div>
    <div class="btn-wrapper">
      <a-button @click="save">Save</a-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.container {
  margin: {
    top: 20px;
    bottom: 20px;
    left: auto;
    right: auto;
  }
  width: 70%;
  min-width: 300px;
  max-width: 100vw;

  .inner-wrapper {
    margin-top: 10px;

    p {
      margin-bottom: 5px;
    }
  }
  .btn-wrapper {
    margin-top: 20px;
  }
}
</style>
