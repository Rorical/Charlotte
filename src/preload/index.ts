import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { ChatMessage } from '../main/models/Chat'
import { PersonalityBasicOption, PersonalityInfoOption } from '../main/modules/personality/option'
import { RawDocument } from '../main/models/Document'

// Custom APIs for renderer
const api = {
  chat: (sessionId: string, message: ChatMessage) =>
    ipcRenderer.invoke('interactive:chat', sessionId, message),
  sync: (sessionId: string) => ipcRenderer.invoke('interactive:sync', sessionId),
  createSession: (personaId: string) => ipcRenderer.invoke('interactive:createSession', personaId),
  getSession: (sessionId: string) => ipcRenderer.invoke('interactive:getSession', sessionId),
  listPersonaSessions: (personaId: string) =>
    ipcRenderer.invoke('interactive:listPersonaSessions', personaId),
  listAllSessions: () => ipcRenderer.invoke('interactive:listAllSessions'),
  deleteSession: (sessionId: string) => ipcRenderer.invoke('interactive:deleteSession', sessionId),
  getSessionReference: (sessionId: string) =>
    ipcRenderer.invoke('interactive:getSessionReference', sessionId),

  selectPersona: (query: string, k: number, page: number) =>
    ipcRenderer.invoke('personality:selectPersona', query, k, page),
  createPersona: (createOption: PersonalityBasicOption) =>
    ipcRenderer.invoke('personality:createPersona', createOption),
  deletePersona: (personaId: string) => ipcRenderer.invoke('personality:deletePersona', personaId),
  selectPersonaInfo: (personaId: string, query: string, k: number, page: number) =>
    ipcRenderer.invoke('personality:selectPersonaInfo', personaId, query, k, page),
  addPersonaInfo: (personaId: string, info: PersonalityInfoOption) =>
    ipcRenderer.invoke('personality:addPersonaInfo', personaId, info),
  deletePersonaInfo: (personaInfoId: string) =>
    ipcRenderer.invoke('personality:deletePersonaInfo', personaInfoId),

  selectDocument: (query: string, k: number, page: number) =>
    ipcRenderer.invoke('document:selectDocument', query, k, page),
  addRawDocuments: (rawDocuments: RawDocument[]) =>
    ipcRenderer.invoke('document:addRawDocuments', rawDocuments),
  deleteDocuments: (docIds: string[]) => ipcRenderer.invoke('document:deleteDocuments', docIds),

  getStore: (key: string) => ipcRenderer.invoke('store:get', key),
  setStore: (key: string, val: object) => ipcRenderer.invoke('store:set', key, val),

  reloadMain: () => ipcRenderer.invoke('main:reload')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
