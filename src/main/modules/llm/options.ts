import { ChatMessage } from '../../models/Chat'
import { LLMFunction } from '../../models/Functionality'

export interface LLMOption {
  endPoint: string
  key: string
  chatModelName: string
  embedModelName: string
}

export interface LLMCompletionOption {
  temp: number
}

export interface LLMChatOption {
  history: ChatMessage[]
  functions?: LLMFunction[]
  call?: string
}

export interface LLMChatFunctionCall {
  name: string
  arguments: string
}

export interface LLMChatResult {
  content?: string
  function_call?: LLMChatFunctionCall
}
