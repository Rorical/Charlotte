import { MeiliSearch } from 'meilisearch'
import { QdrantClient } from '@qdrant/js-client-rest'
import { KnowledgeBaseOption } from './option'
import { Document, RawDocument } from '../../models/Document'
import { LLMInterface } from '../llm'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { uniqueByKey } from '../../utils'
import { QDRANT_VECTOR_CONFIG, GPT_EMBEDDING_VECTOR_DIM } from '../../models/Constants'
import { SearchResult } from '../../models/Utils'

export interface KnowledgeBaseInterface {
  init(): Promise<void>
  addDocuments(document: Document[]): Promise<void>
  addRawDocuments(rawDocuments: RawDocument[]): Promise<void>

  queryDocuments(query: string, k: number, queryEmbed?: number[]): Promise<Document[]>
  searchDocuments(text: string, page: number, limit: number): Promise<SearchResult<Document>>

  deleteDocuments(docIds: string[]): Promise<void>
}

const KNOWLEDGE_DATABASE_NAME = 'Charlotte-Knowledge'
const SUMMARY_DATABASE_POSTFIX = 'Summary'
const KEYPOINTS_DATABASE_POSTFIX = 'KeyPoints'

export class KnowledgeBase implements KnowledgeBaseInterface {
  docDB: MeiliSearch
  vecDB: QdrantClient
  LLM: LLMInterface

  constructor(options: KnowledgeBaseOption) {
    this.docDB = options.docDB
    this.vecDB = options.vecDB
    this.LLM = options.llm
  }

  async init() {
    try {
      await this.docDB.createIndex(KNOWLEDGE_DATABASE_NAME, {
        primaryKey: 'id'
      })
      console.debug(`[knowledge] docDB knowledge index created.`)
    } catch (e) {
      // console.debug(e)
      console.debug(`[knowledge] docDB knowledge index existed.`)
    }
    try {
      await this.vecDB.createCollection(`${KNOWLEDGE_DATABASE_NAME}-${SUMMARY_DATABASE_POSTFIX}`, {
        vectors: {
          ...{
            size: GPT_EMBEDDING_VECTOR_DIM,
            distance: 'Cosine'
          },
          ...QDRANT_VECTOR_CONFIG
        }
      })
      await this.vecDB.createCollection(
        `${KNOWLEDGE_DATABASE_NAME}-${KEYPOINTS_DATABASE_POSTFIX}`,
        {
          vectors: {
            ...{
              size: GPT_EMBEDDING_VECTOR_DIM,
              distance: 'Cosine'
            },
            ...QDRANT_VECTOR_CONFIG
          }
        }
      )
      console.debug(`[knowledge] vecDB index created.`)
    } catch (e) {
      // console.debug(e)
      console.debug(`[knowledge] vecDB index existed.`)
    }
  }

  async addDocuments(documents: Document[]) {
    console.debug(`[knowledge] add docs: ${documents.map((doc) => doc.id)}`)
    const docIndex = this.docDB.index(KNOWLEDGE_DATABASE_NAME)
    await docIndex.addDocuments(documents)
    const summaryPoints = (await this.LLM.embed(documents.map((doc: Document) => doc.summary))).map(
      (pt: number[], i) => {
        return {
          id: documents[i].id,
          vector: pt
        }
      }
    )
    const keyPoints = (await this.LLM.embed(documents.map((doc: Document) => doc.keyPoints))).map(
      (pt: number[], i) => {
        return {
          id: documents[i].id,
          vector: pt
        }
      }
    )
    await this.vecDB.upsert(`${KNOWLEDGE_DATABASE_NAME}-${SUMMARY_DATABASE_POSTFIX}`, {
      wait: true,
      points: summaryPoints
    })
    await this.vecDB.upsert(`${KNOWLEDGE_DATABASE_NAME}-${KEYPOINTS_DATABASE_POSTFIX}`, {
      wait: true,
      points: keyPoints
    })
  }

  async addRawDocuments(rawDocuments: RawDocument[]): Promise<void> {
    const documents: Document[] = []

    for (const rawDocument of rawDocuments) {
      const documentUniqueID = uuidv4() as string

      const summary = await this.LLM.complete(
        `Briefly and logically summarize the document with only a few sentences.
Make sure to include the purpose and main topic of this document.
The document is written in markdown, and the content is enclosed by dash line.

Document File Name: ${rawDocument.name}.
Document Content:
------
${rawDocument.content}
------

Summarization: `,
        {
          temp: 0.2
        }
      )
      console.debug(`[knowledge] generated summary: ${summary}`)

      const keyPoints = await this.LLM.complete(
        `Find out a few important key points or sentences in this document.
Make sure that these key points are important information and crucial for understanding.
Be sure to include time arrangements and locations of events if there are.
DO NOT INCLUDE CONTENTS PRESENTED IN SUMMARY.
Example:
\`\`\`
Key points:
- First point
- Second point
\`\`\`
The document is written in markdown, and the content is enclosed by dash line.

Document File Name: ${rawDocument.name}.
Document Content:
------
${rawDocument.content}
------

Key points: `,
        {
          temp: 0.2
        }
      )
      console.debug(`[knowledge] generated key points: ${keyPoints}`)
      const title = await this.LLM.complete(
        `Write an accurate headline for the document below, given the file name and summary.

Document File Name: ${rawDocument.name}.
Document Summary: ${summary}

Title: `,
        {
          temp: 0.2
        }
      )
      console.debug(`[knowledge] generated title: ${title}`)

      documents.push({
        id: documentUniqueID,
        title: title,
        summary: summary,
        keyPoints: keyPoints,
        content: rawDocument.content,
        createTime: dayjs().unix(),
        from: rawDocument.from,
        uri: rawDocument.uri,
        type: rawDocument.type,
        timeZone: rawDocument.timezone
      })
    }

    await this.addDocuments(documents)
  }

  async queryDocuments(query: string, k: number, queryEmbed?: number[]): Promise<Document[]> {
    const docIndex = this.docDB.index(KNOWLEDGE_DATABASE_NAME)
    queryEmbed = queryEmbed ?? (await this.LLM.embed([query]))[0]
    const resultSummary = await this.vecDB.search(
      `${KNOWLEDGE_DATABASE_NAME}-${SUMMARY_DATABASE_POSTFIX}`,
      {
        vector: queryEmbed,
        limit: k,
        with_payload: false,
        with_vector: false
      }
    )
    const resultKeyPoints = await this.vecDB.search(
      `${KNOWLEDGE_DATABASE_NAME}-${KEYPOINTS_DATABASE_POSTFIX}`,
      {
        vector: queryEmbed,
        limit: k,
        with_payload: false,
        with_vector: false
      }
    )
    const textSearchResults = await docIndex.search(query, {
      limit: k >> 1
    })

    const vectorSearchResults = uniqueByKey(
      resultKeyPoints.concat(resultSummary).sort((a, b) => b.score - a.score),
      'id'
    )

    const textSearchDocumentsResults = textSearchResults.hits as Document[]
    const vectorSearchDocumentsResults = await Promise.all<Document[]>(
      vectorSearchResults.map(async (vRes) => {
        return (await docIndex.getDocument(vRes.id)) as Document
      })
    )

    const documentsResult: Document[] = uniqueByKey(
      textSearchDocumentsResults.concat(vectorSearchDocumentsResults),
      'id'
    ).slice(0, k)

    return documentsResult
  }

  async searchDocuments(
    text: string,
    page: number,
    limit: number
  ): Promise<SearchResult<Document>> {
    const docIndex = this.docDB.index(KNOWLEDGE_DATABASE_NAME)
    const textSearchResults = await docIndex.search(text, {
      page: page,
      limit: limit
    })
    return {
      results: textSearchResults.hits as Document[],
      totalPages: textSearchResults.totalPages
    }
  }

  async deleteDocuments(docIds: string[]): Promise<void> {
    const docIndex = this.docDB.index(KNOWLEDGE_DATABASE_NAME)
    await docIndex.deleteDocuments(docIds)
    await this.vecDB.delete(KNOWLEDGE_DATABASE_NAME, { points: docIds })
  }
}
