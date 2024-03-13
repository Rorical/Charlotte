<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from 'vue'
import { ChatMessage, ChatSessionInfo, MessageFrom } from '../../../main/models/Chat'
import dayjs from 'dayjs'
import { Send, Dots } from '@vicons/tabler'
import { Icon } from '@vicons/utils'
import Chat from './Chat.vue'
import ChatSide from './ChatSide.vue'

const emit = defineEmits<{
  (event: 'msg', msg: string): void
}>()

const message = ref('')
const messages = ref<ChatMessage[]>([])
const session = ref<ChatSessionInfo | null>(null)
const thinking = ref(false)
const sideOpen = ref(false)

const props = defineProps<{
  sessionId: string
}>()

const init = async () => {
  if (props.sessionId) {
    thinking.value = false
    messages.value = []
    session.value = await window.api.getSession(props.sessionId)
    messages.value = await window.api.sync(props.sessionId)
    keepBottom(false)
  }
}

const openSide = async () => {
  sideOpen.value = true
}

watch(
  () => props.sessionId,
  async () => {
    await init()
  }
)

onMounted(async () => {
  await init()
})

const chatBox = ref<any>(null)

const keepBottom = (smooth = true) => {
  nextTick(() => {
    chatBox.value.wrapper.scrollBy({
      top: chatBox.value.wrapper.scrollHeight,
      left: 0,
      behavior: smooth ? 'smooth' : 'auto'
    })
  })
}

const send = async () => {
  const msg = message.value
  const sess = session.value?.id ?? ''
  if (msg === '' || thinking.value) return
  message.value = ''
  const inputMsg = {
    from: MessageFrom.User,
    content: msg,
    time: dayjs().unix()
  }
  messages.value.push(inputMsg)
  keepBottom()
  thinking.value = true
  const output = await window.api.chat(sess, inputMsg)
  if (sess != session.value?.id) {
    return
  }
  messages.value = messages.value.concat(output)
  emit('msg', output[output.length - 1].content)
  if (messages.value.length > 20) {
    messages.value = messages.value.slice(messages.value.length - 20, messages.value.length)
  }
  keepBottom()

  setTimeout(() => {
    nextTick(() => {
      thinking.value = false
    })
  }, 500)
}
</script>

<template>
  <div class="chat-container">
    <div class="chat-info">
      <div class="character-info">
        <div class="name">{{ session?.personaName }}</div>
        <div class="others">
          <div class="id">{{ thinking ? 'Typing...' : session?.id }}</div>
        </div>
      </div>
      <div class="options" @click="openSide">
        <Icon><Dots /></Icon>
      </div>
    </div>
    <div class="chat-box">
      <Chat ref="chatBox" :messages="messages" :loading="thinking"></Chat>
    </div>
    <div v-show="props.sessionId" class="chat-input">
      <a-input v-model="message" placeholder="Type Something..." round @keyup.enter="send">
        <template #post-button>
          <a-button
            type="gradient"
            size="small"
            round
            :disabled="message == '' || thinking"
            @click="send"
            ><Icon><Send /></Icon> Send</a-button
          >
        </template>
      </a-input>
    </div>
  </div>
  <a-drawer v-model="sideOpen" position="right">
    <ChatSide :session-id="props.sessionId"></ChatSide>
  </a-drawer>
</template>

<style lang="scss" scoped>
.chat-container {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;

  .chat-info {
    align-self: flex-start;
    width: 100%;
    height: 50px;
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: nowrap;
    justify-content: space-between;
    background-color: var(--bg-readonly);
    .character-info {
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
      height: 100%;
      width: max-content;
      margin-left: 25px;

      .name {
        font-weight: 600;
        font-size: 18px;
        margin: 8px 0 12px;
        user-select: none;
      }

      .others {
        font-size: 9px;
        padding-top: 6px;
        margin-left: 5px;
      }
    }

    .options {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      width: max-content;
      margin-right: 30px;
      user-select: none;
      .xicon {
        transform: scale(1.6);
      }
    }
  }

  .chat-box {
    width: 100%;
    align-self: center;
    flex: auto;
    height: 0;
    position: relative;

    &::before {
      position: absolute;
      content: '';
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: 17px;
      backdrop-filter: blur(10px);
      z-index: 10;
      background: linear-gradient(to top, var(--bg), rgba(0, 0, 0, 0));
    }
  }
  .chat-input {
    align-self: flex-end;
    z-index: 5;
    width: 100%;
    padding: {
      bottom: 15px;
      left: 14px;
      right: 16px;
      top: 0px;
    }
    box-sizing: border-box;
    backdrop-filter: blur(8px);
  }
}
</style>
