import { Document } from './Document'
import { LLMFunction } from './Functionality'
import { Personality } from './Personality'

export enum MessageFrom {
  System = 0,
  Actor,
  User,
  Function
}

export interface ChatMessage {
  from: MessageFrom
  content: string
  time?: number
  documents?: string[]
  functions?: string[]
  function?: FunctionCall
}

export interface FunctionCall {
  name: string
  input: string
  output?: string
}

export interface ChatSession {
  id: string
  createTime: number
  personality: Personality
  documents: {
    [id: string]: Document
  }
  functions: {
    [id: string]: LLMFunction
  }
  history: ChatMessage[]
}

export interface SessionStore {
  [id: string]: ChatSession
}

export interface ChatSessionInfo {
  id: string
  createTime: number
  personaId: string
  personaName: string
  lastMessage: string
}

export interface ChatSessionReference {
  documents: Document[]
  functions: LLMFunction[]
}
