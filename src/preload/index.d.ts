import { ElectronAPI } from '@electron-toolkit/preload'
import { Document, RawDocument } from '../main/models/Document'
import { ChatMessage, ChatSessionInfo, ChatSessionReference } from 'src/main/models/Chat'
import { PersonaInfo, Personality } from 'src/main/models/Personality'
import { PersonalityInfoOption } from 'src/main/modules/personality/option'
import dayjs from 'dayjs'
import { SearchResult } from 'src/main/models/Utils'

interface APIs {
  chat: (sessionId: string, message: ChatMessage) => Promise<ChatMessage[]>
  sync: (sessionId: string) => Promise<ChatMessage[]>
  createSession: (personaId: string) => Promise<ChatSessionInfo>
  getSession: (sessionId: string) => Promise<ChatSessionInfo>
  listPersonaSessions: (personaId: string) => Promise<ChatSessionInfo[]>
  listAllSessions: () => Promise<ChatSessionInfo[]>
  deleteSession: (sessionId: string) => Promise<void>
  getSessionReference: (sessionId: string) => Promise<ChatSessionReference>

  selectPersona: (query: string, k: number, page: number) => Promise<SearchResult<Personality>>
  createPersona: (createOption: PersonalityBasicOption) => Promise<string>
  deletePersona: (personaId: string) => Promise<void>
  selectPersonaInfo: (
    personaId: string,
    query: string,
    k: number,
    page: number
  ) => Promise<SearchResult<PersonaInfo>>
  addPersonaInfo: (personaId: string, info: PersonalityInfoOption) => Promise<string>
  deletePersonaInfo: (personaInfoId: string) => Promise<void>

  selectDocument: (query: string, k: number, page: number) => Promise<SearchResult<Document>>
  addRawDocuments: (rawDocuments: RawDocument[]) => Promise<void>
  deleteDocuments: (docIds: string[]) => Promise<void>

  getStore: (key: string) => Promise<any>
  setStore: (key: string, val: any) => Promise<void>

  reloadMain: () => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: APIs
  }
}
