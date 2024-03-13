import { MeiliSearch } from 'meilisearch'

export interface PersonalityManagerOption {
  docDB: MeiliSearch
}

export interface PersonalityBasicOption {
  name: string
  greeting: string
  keyInfo: string
  dialogueExample: string
}

export interface PersonalityInfoOption {
  description: string
  content: string
}
