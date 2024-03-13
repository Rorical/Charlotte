<script setup lang="ts">
import ChatWindow from '@renderer/components/ChatWindow.vue'
import dayjs from 'dayjs'
import { ChatSessionInfo } from 'src/main/models/Chat'
import { onMounted, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@vicons/tabler'
import { Icon } from '@vicons/utils'
import CharacterSelection from '@renderer/components/CharacterSelection.vue'

const router = useRouter()
const username = ref('')
const sessionId = ref('')
const sessions = ref<ChatSessionInfo[]>([])
const nowSessIndex = ref(0)
const newSessionShow = ref(false)
const chatList = ref<any>(null)

const init = async (pid) => {
  username.value = (await window.api.getStore('settings.Chat.UserName')) as string
  sessionId.value = (await window.api.createSession(pid)).id
  sessions.value = await window.api.listAllSessions()
  nowSessIndex.value = sessions.value.length - 1
}

const keepBottom = (smooth = true) => {
  nextTick(() => {
    chatList.value.scrollBy({
      top: chatList.value.scrollHeight,
      left: 0,
      behavior: smooth ? 'smooth' : 'auto'
    })
  })
}

const selectSession = async (index) => {
  nowSessIndex.value = index
  sessionId.value = sessions.value[index].id
}

const deleteSession = async (index) => {
  if (sessions.value.length < 2) {
    return
  }
  if (index < nowSessIndex.value) {
    nowSessIndex.value = nowSessIndex.value - 1
  } else if (index == nowSessIndex.value) {
    nowSessIndex.value = sessions.value.length - 2
  }
  await window.api.deleteSession(sessions.value[index].id)
  sessions.value = await window.api.listAllSessions()
  sessionId.value = sessions.value[nowSessIndex.value].id
}

const openNewSession = async () => {
  const lastCharacterId = await window.api.getStore('preferences.lastCharacterId')
  if (lastCharacterId) {
    await newSession(lastCharacterId)
  } else {
    newSessionShow.value = true
  }
}

const openNewSessionShow = () => {
  newSessionShow.value = true
}

const newSession = async (personaId: string) => {
  await init(personaId)
  newSessionShow.value = false
  keepBottom()
  await window.api.setStore('preferences.lastCharacterId', personaId)
}

onMounted(async () => {
  if (await window.api.getStore('firstLoad')) {
    router.push({
      name: 'Settings'
    })
  }
  const lastCharacterId = await window.api.getStore('preferences.lastCharacterId')
  if (lastCharacterId) await init(lastCharacterId)
})

const updateLastMsg = (msg) => {
  sessions.value[nowSessIndex.value].lastMessage = msg
}
</script>

<template>
  <div class="main-container">
    <div class="chat-list">
      <div class="list" ref="chatList">
        <div
          v-for="(sess, i) in sessions"
          :key="sess.id"
          class="chat-info"
          :class="{ selected: i == nowSessIndex }"
          @click="selectSession(i)"
          @click.right="deleteSession(i)"
        >
          <p class="title">
            {{ sess.personaName }}<span>{{ dayjs.unix(sess.createTime).format('HH:mm') }}</span>
          </p>
          <p class="last-message">{{ sess.lastMessage.slice(0, 30) }}</p>
        </div>
      </div>
      <div class="add-chat">
        <a-button
          type="primary"
          size="small"
          @click="openNewSession"
          @click.right="openNewSessionShow"
          class="new-session-btn"
          ><Icon><Plus /></Icon
        ></a-button>
      </div>
    </div>
    <div class="chat-window">
      <ChatWindow :session-id="sessionId" v-if="sessionId" @msg="updateLastMsg"></ChatWindow>
    </div>
  </div>
  <a-float v-model:visible="newSessionShow">
    <CharacterSelection @confirm="newSession"></CharacterSelection>
  </a-float>
</template>

<style lang="scss" scoped>
.main-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: row;

  .chat-list {
    height: 100%;
    flex: 0 0 240px;
    width: 240px;
    background-color: var(--bg-dark);
    border-right: 2px var(--line) solid;
    display: flex;
    flex-direction: column;

    .list {
      height: 100%;
      overflow-y: auto;
      flex: auto;
      display: flex;
      flex-wrap: nowrap;
      flex-direction: column;
      .selected {
        background-color: var(--bg-disabled);
      }

      .chat-info {
        user-select: none;
        border-bottom: 1px solid var(--border-semi-dark);
        padding: {
          left: 15px;
          right: 15px;
          top: 13px;
          bottom: 13px;
        }
        .title {
          font-size: 16px;
          font-weight: 600;

          span {
            font-size: 11px;
            margin-left: 4px;
          }
        }
        .last-message {
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--text-placeholder);
        }
      }
    }

    .add-chat {
      margin: {
        bottom: 15px;
        top: 15px;
        left: auto;
        right: auto;
      }
      .new-session-btn {
        width: min-content;
        &::after {
          content: 'New Session';
          overflow: hidden;
          display: inline;
          transition: all 0.2s ease-in;
          width: 0%;
        }
        &:hover {
          &::after {
            margin-left: 6px;
            width: 100%;
          }
        }
      }

      .xicon {
        transform: scale(1.6);
      }
    }
  }

  .chat-window {
    height: 100%;
    flex: auto;
  }
}
</style>
