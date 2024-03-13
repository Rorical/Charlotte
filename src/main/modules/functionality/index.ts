import { MeiliSearch } from 'meilisearch'
import { QdrantClient } from '@qdrant/js-client-rest'
import { FunctionEntity } from '../../models/Functionality'
import { FunctionalityOption, FunctionalityAddOption } from './option'
import { LLMInterface } from '../llm'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { uniqueByKey } from '../../utils'
import { QDRANT_VECTOR_CONFIG, GPT_EMBEDDING_VECTOR_DIM } from '../../models/Constants'
import { NodeVM } from 'vm2'
import { SearchResult } from '../../models/Utils'

export interface FunctionalityInterface {
  init(): Promise<void>
  addFunction(option: FunctionalityAddOption): Promise<void>

  searchFunctions(text: string, page: number, limit: number): Promise<SearchResult<FunctionEntity>>
  queryFunctions(query: string, k: number, queryEmbed?: number[]): Promise<FunctionEntity[]>
  executeFunctions(function_name: string, parameters: object): Promise<string>

  deleteFunctions(function_names: string[]): Promise<void>
}

const FUNCTION_DATABASE_NAME = 'Charlotte-Function'

export class Functionality implements FunctionalityInterface {
  docDB: MeiliSearch
  vecDB: QdrantClient
  LLM: LLMInterface
  vm: NodeVM

  constructor(options: FunctionalityOption) {
    this.docDB = options.docDB
    this.vecDB = options.vecDB
    this.LLM = options.llm
    this.vm = new NodeVM({
      console: 'inherit',
      sandbox: {
        dayjs,
        ...options.vmSandbox
      },
      require: {
        external: true,
        builtin: ['fs', 'path'],
        root: './',
        mock: {}
      }
    })
  }

  async init(): Promise<void> {
    try {
      await this.docDB.createIndex(FUNCTION_DATABASE_NAME, {
        primaryKey: 'name'
      })
      const docIndex = this.docDB.index(FUNCTION_DATABASE_NAME)
      await docIndex.updateFilterableAttributes(['name', 'vecId'])
      await docIndex.updateSearchableAttributes(['name', 'description'])
      console.debug(`[function] docDB index created.`)
    } catch (e) {
      // console.debug(e)
      console.debug(`[function] docDB index existed.`)
    }

    try {
      await this.vecDB.createCollection(FUNCTION_DATABASE_NAME, {
        vectors: {
          ...{
            size: GPT_EMBEDDING_VECTOR_DIM,
            distance: 'Cosine'
          },
          ...QDRANT_VECTOR_CONFIG
        }
      })
      console.debug(`[function] vecDB index created.`)
    } catch (e) {
      // console.debug(e)
      console.debug(`[function] vecDB index existed.`)
    }
  }

  async addFunction(option: FunctionalityAddOption): Promise<void> {
    const vecID = uuidv4() as string
    const docIndex = this.docDB.index(FUNCTION_DATABASE_NAME)
    try {
      await docIndex.getDocument(option.name)
      throw new Error(`function ${option.name} already exists.`)
    } catch (error) {
      let message
      if (error instanceof Error) message = error.message
      else message = String(error)
      if (!message.includes('not found')) {
        throw new Error(message)
      }
    }

    const functionObj: FunctionEntity = {
      name: option.name,
      vecId: vecID,
      description: option.description,
      parameters: JSON.stringify(option.parameters),
      function: option.function
    }
    await docIndex.addDocuments([functionObj])
    const vec = (await this.LLM.embed([option.description]))[0]
    await this.vecDB.upsert(FUNCTION_DATABASE_NAME, {
      wait: true,
      points: [
        {
          id: vecID,
          vector: vec
        }
      ]
    })
  }

  async searchFunctions(
    text: string,
    page: number,
    limit: number
  ): Promise<SearchResult<FunctionEntity>> {
    const docIndex = this.docDB.index(FUNCTION_DATABASE_NAME)
    const textSearchResults = await docIndex.search(text, {
      page: page,
      limit: limit
    })
    return {
      results: textSearchResults.hits as FunctionEntity[],
      totalPages: textSearchResults.totalPages
    }
  }

  async queryFunctions(
    query: string,
    k: number,
    queryEmbed?: number[] | undefined
  ): Promise<FunctionEntity[]> {
    const docIndex = this.docDB.index(FUNCTION_DATABASE_NAME)
    queryEmbed = queryEmbed ?? (await this.LLM.embed([query]))[0]
    const resultVec = await this.vecDB.search(FUNCTION_DATABASE_NAME, {
      vector: queryEmbed,
      limit: k,
      with_payload: false,
      with_vector: false
    })
    const textSearchResults = await docIndex.search(query, {
      limit: k >> 1
    })

    const textSearchFunctionsResults = textSearchResults.hits as FunctionEntity[]

    const vectorSearchFunctionsResults = await Promise.all<FunctionEntity>(
      resultVec.map(async (vRes) => {
        return (
          await docIndex.getDocuments({
            filter: `vecId = ${vRes.id}`,
            limit: 1
          })
        ).results[0] as FunctionEntity
      })
    )

    const functionsResult: FunctionEntity[] = uniqueByKey(
      textSearchFunctionsResults.concat(vectorSearchFunctionsResults),
      'name'
    ).slice(0, k)

    return functionsResult
  }

  async executeFunctions(function_name: string, parameters: object): Promise<string> {
    const docIndex = this.docDB.index(FUNCTION_DATABASE_NAME)
    const funcEntity: FunctionEntity = await docIndex.getDocument(function_name)
    const theFunc = this.vm.run(funcEntity.function)
    let result: string | object = await theFunc(parameters)
    if (typeof result === 'object') {
      result = JSON.stringify(result)
    }
    return result
  }

  async deleteFunctions(function_names: string[]): Promise<void> {
    const docIndex = this.docDB.index(FUNCTION_DATABASE_NAME)
    const vecIds = await Promise.all(
      function_names.map(async (name) => {
        return ((await docIndex.getDocument(name)) as FunctionEntity).vecId
      })
    )
    await this.vecDB.delete(FUNCTION_DATABASE_NAME, { points: vecIds })
    await docIndex.deleteDocuments(function_names)
  }
}
