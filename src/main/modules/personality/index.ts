import { Personality, PersonaInfo } from '../../models/Personality'
import { PersonalityBasicOption, PersonalityManagerOption, PersonalityInfoOption } from './option'
import { MeiliSearch } from 'meilisearch'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { SearchResult } from '../../models/Utils'

export interface PersonalityManagerInterface {
  init(): Promise<void>
  createPersona(createOption: PersonalityBasicOption): Promise<string>
  getPersona(personaId: string): Promise<Personality>
  searchPersona(query: string, k: number, page: number): Promise<SearchResult<Personality>>
  addPersonaInfo(personaId: string, info: PersonalityInfoOption): Promise<string>
  searchPersonaInfo(
    personaId: string,
    query: string,
    k: number,
    page: number
  ): Promise<SearchResult<PersonaInfo>>
  deletePersonaInfo(personaInfoId: string): Promise<void>
  deletePersona(personaId: string): Promise<void>
}

const PERSONALITY_DATABASE_NAME = 'Charlotte-Personality'
const PERSONA_INFO_DATABASE_NAME = 'Charlotte-Personality-Info'

export class PersonalityManager implements PersonalityManagerInterface {
  docDB: MeiliSearch

  constructor(option: PersonalityManagerOption) {
    this.docDB = option.docDB
  }

  async init() {
    try {
      await this.docDB.createIndex(PERSONALITY_DATABASE_NAME, {
        primaryKey: 'id'
      })
      await this.docDB.createIndex(PERSONA_INFO_DATABASE_NAME, {
        primaryKey: 'id'
      })
      const docIndex = this.docDB.index(PERSONA_INFO_DATABASE_NAME)
      await docIndex.updateFilterableAttributes(['personaId'])
      console.debug(`[knowledge] docDB knowledge index created.`)
    } catch (e) {
      // console.debug(e)
      console.debug(`[knowledge] docDB knowledge index existed.`)
    }
  }

  async createPersona(createOption: PersonalityBasicOption): Promise<string> {
    const uniqueId = uuidv4() as string
    const personaDoc: Personality = {
      id: uniqueId,
      name: createOption.name,
      greeting: createOption.greeting,
      keyInfo: createOption.keyInfo,
      dialogueExample: createOption.dialogueExample,
      createTime: dayjs().unix()
    }
    const docIndex = this.docDB.index(PERSONALITY_DATABASE_NAME)
    await docIndex.addDocuments([personaDoc])
    return uniqueId
  }

  async getPersona(personaId: string): Promise<Personality> {
    const docIndex = this.docDB.index(PERSONALITY_DATABASE_NAME)
    return (await docIndex.getDocument(personaId)) as Personality
  }

  async addPersonaInfo(personaId: string, info: PersonalityInfoOption): Promise<string> {
    const uniqueId = uuidv4() as string
    const docIndex = this.docDB.index(PERSONA_INFO_DATABASE_NAME)
    await docIndex.addDocuments([
      {
        id: uniqueId,
        personaId: personaId,
        description: info.description,
        content: info.content
      } as PersonaInfo
    ])
    return uniqueId
  }

  async searchPersona(query: string, k: number, page: number): Promise<SearchResult<Personality>> {
    const docIndex = this.docDB.index(PERSONALITY_DATABASE_NAME)
    const personaResults = await docIndex.search(query, {
      limit: k,
      page: page
    })
    return {
      results: personaResults.hits as Personality[],
      totalPages: personaResults.totalPages
    }
  }

  async searchPersonaInfo(
    personaId: string,
    query: string,
    k: number,
    page: number
  ): Promise<SearchResult<PersonaInfo>> {
    const docIndex = this.docDB.index(PERSONA_INFO_DATABASE_NAME)
    const personaInfoResults = await docIndex.search(query, {
      limit: k,
      page: page,
      filter: `personaId = ${personaId}`
    })
    return {
      results: personaInfoResults.hits as PersonaInfo[],
      totalPages: personaInfoResults.totalPages
    }
  }

  async deletePersonaInfo(personaInfoId: string): Promise<void> {
    const personaInfoIndex = this.docDB.index(PERSONA_INFO_DATABASE_NAME)
    await personaInfoIndex.deleteDocument(personaInfoId)
  }

  async deletePersona(personaId: string): Promise<void> {
    const personaIndex = this.docDB.index(PERSONALITY_DATABASE_NAME)
    const personaInfoIndex = this.docDB.index(PERSONA_INFO_DATABASE_NAME)
    await personaIndex.deleteDocument(personaId)
    await personaInfoIndex.deleteDocuments({
      filter: `personaId == ${personaId}`
    })
  }
}
