import { MeiliSearch } from 'meilisearch'
import { QdrantClient } from '@qdrant/js-client-rest'
import { LLMInterface } from '../llm'

export interface FunctionalityOption {
  docDB: MeiliSearch
  vecDB: QdrantClient
  llm: LLMInterface
  vmSandbox: object
}

export interface FunctionalityAddOption {
  name: string // unique
  description: string
  parameters: object
  function: string
}
