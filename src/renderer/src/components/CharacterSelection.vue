<script setup lang="ts">
import { Search } from '@vicons/tabler'
import { Icon } from '@vicons/utils'
import dayjs from 'dayjs'
import { Personality } from 'src/main/models/Personality'
import { onMounted, ref } from 'vue'

const query = ref('')
const pagination = ref({ total: 1, current: 1, pageSize: 6 })

const characters = ref<Personality[]>([])

const emits = defineEmits<{
  (event: 'confirm', id: string): void
}>()

const select = async () => {
  const results = await window.api.selectPersona(
    query.value,
    pagination.value.pageSize,
    pagination.value.current
  )
  characters.value = results.results
  pagination.value.total = results.totalPages
}

const confirm = (id) => {
  emits('confirm', id)
}

onMounted(async () => {
  await select()
})
</script>

<template>
  <div class="characters-container">
    <a-input v-model="query" placeholder="Type Something to Search..." round @submit="select">
      <template #post-button>
        <a-button type="gradient" size="small" round @click="select"
          ><Icon><Search /></Icon> Search</a-button
        >
      </template>
    </a-input>
    <div class="wrapper">
      <a-card
        v-for="character in characters"
        :key="character.id"
        :title="character.name"
        @click="confirm(character.id)"
      >
        <p class="info">{{ character.keyInfo.split('\n')[0] }}</p>
        <template #footer>
          <p>{{ dayjs.unix(character.createTime).format('YYYY-MM-DD HH:mm') }}</p>
        </template>
      </a-card>
    </div>
    <a-pagination :pagination="pagination" />
  </div>
</template>

<style lang="scss" scoped>
.characters-container {
  height: 60vh;
  display: flex;
  flex-direction: column;
  .wrapper {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-content: flex-start;
    height: 100%;
    margin-top: 20px;

    .a-card {
      margin-right: 8px;
      margin-left: 8px;
      margin-bottom: 20px;
      .info {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }

  .a-pagination {
    align-self: center;
  }
}
</style>
