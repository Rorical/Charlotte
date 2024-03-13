<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Document } from '../../../main/models/Document'
import { LLMFunction } from 'src/main/models/Functionality'
import dayjs from 'dayjs'

const props = defineProps<{
  sessionId: string
}>()
const documents = ref<Document[]>([])
const functions = ref<LLMFunction[]>([])
const group = ref([
  {
    label: 'Documents',
    value: 0
  },
  {
    label: 'Functions',
    value: 1
  }
])
const select = ref(-1)

onMounted(async () => {
  const references = await window.api.getSessionReference(props.sessionId)
  documents.value = references.documents
  functions.value = references.functions
  select.value = 0
})
</script>

<template>
  <div class="side-container">
    <a-radio-button-group v-model="select" :items="group"></a-radio-button-group>
    <div class="side-wrapper" v-if="select == 0">
      <a-card v-for="document in documents" :key="document.id" width="auto">
        <p class="info">{{ document.title }}</p>
        <template #footer>
          <p>
            {{ dayjs.unix(document.createTime).tz(document.timeZone).format('YYYY-MM-DD HH:mm') }}
          </p>
        </template>
      </a-card>
    </div>
    <div class="side-wrapper" v-else-if="select == 1">
      <a-card v-for="theFunction in functions" :key="theFunction.name" width="auto">
        <p class="info">{{ theFunction.name }}</p>
        <template #footer>
          <p>
            {{ theFunction.description }}
          </p>
        </template>
      </a-card>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.side-container {
  height: 100%;
  width: 100%;
  padding: 10px;
  box-sizing: border-box;

  .a-radio-button-group {
    margin: auto;
  }

  .side-wrapper {
    margin-top: 10px;
    height: 100%;
    overflow-y: auto;
    width: 100%;
    display: flex;
    flex-direction: column;

    .a-card {
      margin-bottom: 13px;
    }
  }
}
</style>
