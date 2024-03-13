import { Settings } from './Utils'

export const QDRANT_VECTOR_CONFIG = {
  on_disk: true,
  hnsw_config: {
    m: 12,
    ef_construct: 100,
    full_scan_threshold: 10000,
    on_disk: true
  },
  quantization_config: {
    scalar: {
      type: 'int8',
      quantile: 0.98,
      always_ram: false
    }
  }
}

export const GPT_EMBEDDING_VECTOR_DIM = 1536

export const GPT_FUNCTION_RECURSION_LIMIT = 3

export const DEFAULT_SETTINGS: Settings = {
  LLM: {
    EndPoint: 'https://api.api2gpt.com/',
    ApiKey: '',
    ChatModelName: 'gpt-3.5-turbo',
    EmbedModelName: 'text-embedding-ada-002'
  },
  Database: {
    QdrantURI: 'http://127.0.0.1:6333',
    MeiliSearchURI: 'http://127.0.0.1:7700'
  },
  Chat: {
    UserName: '',
    HistoryLength: 20
  }
}

export const DEFAULT_PREFERENCES = {
  lastCharacterId: ''
}

export const DEFAULT_CONF_KEY = 'charlotte-view'

export const CONTINUE_LIST = [
  'just a moment',
  'hold on for a second',
  'give me a moment',
  'let me check',
  'let me take a quick look',
  '我来查看一下文档'
]