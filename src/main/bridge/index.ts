import { ipcMain } from 'electron'
import { LLM } from '../modules/llm'
import { MeiliSearch } from 'meilisearch'
import { QdrantClient } from '@qdrant/js-client-rest'
import { KnowledgeBase } from '../modules/knowledge'
import { ChatMessage } from '../models/Chat'
import { PersonalityManager } from '../modules/personality'
import { Interactive } from '../modules/interactive'
import { Functionality } from '../modules/functionality'
import { PersonalityBasicOption } from '../modules/personality/option'
import Store from 'electron-store'
import { DEFAULT_CONF_KEY, DEFAULT_PREFERENCES, DEFAULT_SETTINGS } from '../models/Constants'
import { ProgramStore } from '../models/Utils'

const config = new Store<ProgramStore>({
  defaults: {
    settings: DEFAULT_SETTINGS,
    preferences: DEFAULT_PREFERENCES,
    firstLoad: true
  } as ProgramStore,
  encryptionKey: DEFAULT_CONF_KEY
})
config.set('firstLoad', true)
const registeredChannels: string[] = []

console.log(config.path)

export async function registerHandlers() {
  const llm = new LLM({
    endPoint: config.get('settings.LLM.EndPoint'),
    key: config.get('settings.LLM.ApiKey'),
    chatModelName: config.get('settings.LLM.ChatModelName'),
    embedModelName: config.get('settings.LLM.EmbedModelName')
  })
  const qdrant = new QdrantClient({ url: config.get('settings.Database.QdrantURI') })
  const meilisearch = new MeiliSearch({
    host: config.get('settings.Database.MeiliSearchURI')
  })
  const knowledgebase = new KnowledgeBase({
    docDB: meilisearch,
    vecDB: qdrant,
    llm: llm
  })
  const personalityManager = new PersonalityManager({
    docDB: meilisearch
  })
  const functionality = new Functionality({
    docDB: meilisearch,
    vecDB: qdrant,
    llm: llm,
    vmSandbox: {
      personalityManager,
      knowledgebase
    }
  })
  const interactive = new Interactive({
    llm: llm,
    persona: personalityManager,
    knowledge: knowledgebase,
    functional: functionality,
    userName: config.get('settings.Chat.UserName'),
    maxContextWindow: config.get('settings.Chat.HistoryLength')
  })
  await Promise.all([knowledgebase.init(), functionality.init(), personalityManager.init()])
  //await functionality.deleteFunctions(['queryTimeTableByDate'])

  /*await functionality.addFunction({
    name: 'queryTimeTableByDate',
    description: 'query events on timetable using exact date and timezone.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date string. In standard date format "YYYY-MM-DD". e.g. 2023-09-18'
        },
        timezone: {
          type: 'string',
          description:
            'Timezone string. In standard timezone format "Zone/Location". e.g. Europe/London'
        }
      },
      required: ['date', 'timezone']
    },
    function: `
    module.exports = async function (options) {
      return (await knowledgebase.queryTimeTableByDate(dayjs.tz(options.date, options.timezone))).map((tb) => {
        return {
          title: tb.name,
          time: dayjs.unix(tb.time).tz(options.timezone).format()
        }
      })
    }`
  })*/
  //await knowledgebase.addRawDocuments(testDocs)
  //return await knowledgebase.queryTimeTableByDate(dayjs.tz(message, ''))
  const handlers = {
    'interactive:chat': async (_, sessionId: string, message: ChatMessage) => {
      return await interactive.chat(sessionId, message)
    },
    'interactive:sync': async (_, sessionId: string) => {
      return interactive.getHistory(sessionId)
    },
    'interactive:createSession': async (_, personaId: string) => {
      return await interactive.createSession(personaId)
    },
    'interactive:getSession': async (_, sessionId: string) => {
      return interactive.getSessionInfo(sessionId)
    },
    'interactive:listPersonaSessions': async (_, personaId: string) => {
      return interactive.listPersonaSessions(personaId)
    },
    'interactive:listAllSessions': async () => {
      return interactive.listAllSessions()
    },
    'interactive:deleteSession': async (_, sessionId: string) => {
      return interactive.removeSession(sessionId)
    },
    'interactive:getSessionReference': async (_, sessionId: string) => {
      return interactive.getSessionReference(sessionId)
    },
    'personality:selectPersona': async (_, query: string, k: number, page: number) => {
      return await personalityManager.searchPersona(query, k, page)
    },
    'personality:createPersona': async (_, createOption: PersonalityBasicOption) => {
      return await personalityManager.createPersona(createOption)
    },
    'personality:deletePersona': async (_, personaId: string) => {
      return await personalityManager.deletePersona(personaId)
    },
    'store:get': async (_, key: string) => {
      return config.get(key)
    },
    'store:set': async (_, key: string, val: object) => {
      config.set(key, val)
    }
  }

  for (const chan in handlers) {
    ipcMain.handle(chan, handlers[chan])
    registeredChannels.push(chan)
  }
}

export function unregisterHandlers() {
  registeredChannels.splice(0, registeredChannels.length).forEach((chan) => {
    ipcMain.removeHandler(chan)
  })
}
