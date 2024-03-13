import { MeiliSearch } from 'meilisearch'
import { QdrantClient } from '@qdrant/js-client-rest'
import { LLMInterface } from '../llm'

export interface KnowledgeBaseOption {
  docDB: MeiliSearch
  vecDB: QdrantClient
  llm: LLMInterface
}
