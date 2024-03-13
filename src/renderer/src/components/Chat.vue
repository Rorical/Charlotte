<!-- eslint-disable vue/no-v-html -->
<script setup lang="ts">
import { ChatMessage, MessageFrom } from '../../../main/models/Chat'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { ref } from 'vue'

const props = defineProps<{
  messages: ChatMessage[]
  loading: boolean
}>()
const wrapper = ref(0)

defineExpose({
  wrapper
})

const content = (msg) => {
  return DOMPurify.sanitize(marked.parse(msg.content))
}
</script>

<template>
  <div ref="wrapper" class="wrapper">
    <div v-for="(msg, i) in props.messages" :key="i" class="message-container">
      <a-tag v-if="msg.from === MessageFrom.System">{{ msg.content }}</a-tag>
      <a-tag v-else-if="msg.from === MessageFrom.Function" color="rgb(74, 162, 183)"
        >Execute {{ msg.function?.name }} with {{ msg.function?.input }}</a-tag
      >
      <div
        v-else
        class="message"
        :class="{
          user: msg.from === MessageFrom.User,
          actor: msg.from === MessageFrom.Actor,
          showMessage: i == props.messages.length - 1 && loading
        }"
        v-html="content(msg)"
      ></div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@keyframes show {
  0% {
    opacity: 0;
    transform: translateY(60px);
  }
  100% {
    opacity: 1;
    transform: translateY(0px);
  }
}

.showMessage {
  animation: show 0.5s forwards;
}
.wrapper {
  width: 100%;
  box-sizing: border-box;
  height: 100%;
  padding: {
    bottom: 10px;
    left: 20px;
    right: 20px;
    top: 20px;
  }
  overflow-y: auto;

  .message-container {
    margin-bottom: 15px;
    width: 100%;
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: center;

    .message {
      width: fit-content;
      border: {
        top-left-radius: 20px;
        top-right-radius: 20px;
      }
      max-width: calc(60% - 42px);
      overflow-wrap: break-word;
      overflow: hidden;
      text-align: left;
      padding: {
        left: 20px;
        right: 20px;
        top: 15px;
        bottom: 15px;
      }
      box-shadow: 2px 2px 8px var(--shadow-6);
    }
    .user {
      align-self: flex-end;
      border-bottom-left-radius: 20px;
      background-color: var(--bg-light);
      color: var(--text);
    }
    .actor {
      align-self: flex-start;
      border-bottom-right-radius: 20px;
      background-color: var(--primary-80);
      color: var(--text);
    }
  }
}
</style>
