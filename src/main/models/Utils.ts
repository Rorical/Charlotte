import { Settings } from '@vicons/tabler'

export interface LLMSettings {
  EndPoint: string
  ApiKey: string
  ChatModelName: string
  EmbedModelName: string
}

export interface DatabaseSettings {
  QdrantURI: string
  MeiliSearchURI: string
}

export interface ChatSettings {
  UserName: string
  HistoryLength: number | string
}

export interface Settings {
  LLM: LLMSettings
  Database: DatabaseSettings
  Chat: ChatSettings
}

export interface Preferences {
  lastCharacterId: string
}

export interface ProgramStore {
  settings: Settings
  preferences: Preferences
  firstLoad: boolean
}

export interface SearchResult<T> {
  totalPages: number
  results: T[]
}
