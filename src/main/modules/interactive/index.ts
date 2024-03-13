import {
  ChatSession,
  ChatMessage,
  MessageFrom,
  SessionStore,
  ChatSessionInfo,
  ChatSessionReference
} from '../../models/Chat'
import { InteractiveOption } from './option'
import { LLMInterface } from '../llm/index'
import { PersonalityManagerInterface } from '../personality/index'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { KnowledgeBaseInterface } from '../knowledge'
import { FunctionalityInterface } from '../functionality'
import { LLMChatResult } from '../llm/options'
import { CONTINUE_LIST, GPT_FUNCTION_RECURSION_LIMIT } from '../../models/Constants'
import { isSubs } from '../../utils'

export interface InteractiveInterface {
  createSession(personaId: string): Promise<ChatSessionInfo>
  chat(sessionId: string, inputMessage: ChatMessage): Promise<ChatMessage[]>
  getSession(sessionId: string): ChatSession
  getHistory(sessionId: string): ChatMessage[]
  getSessionInfo(session: string | ChatSession): ChatSessionInfo
  removeSession(sessionId: string): void
  listPersonaSessions(personaId: string): ChatSessionInfo[]
  listAllSessions(): ChatSessionInfo[]
  getSessionReference(sessionId: string): ChatSessionReference
}

export class Interactive implements InteractiveInterface {
  llm: LLMInterface
  persona: PersonalityManagerInterface
  knowledge: KnowledgeBaseInterface
  functional: FunctionalityInterface
  userName: string
  sessions: SessionStore = {}
  personaSessIndex: { [personaId: string]: string[] } = {}
  maxContextWindow: number

  constructor(options: InteractiveOption) {
    this.llm = options.llm
    this.persona = options.persona
    this.userName = options.userName
    this.maxContextWindow = options.maxContextWindow
    this.knowledge = options.knowledge
    this.functional = options.functional
  }

  async createSession(personaId: string): Promise<ChatSessionInfo> {
    const sessionId = uuidv4() as string
    const personality = await this.persona.getPersona(personaId)
    const session = {
      id: sessionId,
      createTime: dayjs().unix(),
      personality: personality,
      history: [
        {
          from: MessageFrom.Actor,
          content: personality.greeting,
          time: dayjs().unix()
        }
      ],
      documents: {},
      functions: {}
    } as ChatSession
    if (this.personaSessIndex[personaId]) {
      this.personaSessIndex[personaId].push(sessionId)
    } else {
      this.personaSessIndex[personaId] = [sessionId]
    }
    this.sessions[sessionId] = session
    return this.getSessionInfo(session)
  }

  getSessionInfo(session: string | ChatSession): ChatSessionInfo {
    if (typeof session == 'string') {
      session = this.getSession(session)
    }
    return {
      id: session.id,
      personaId: session.personality.id,
      personaName: session.personality.name,
      createTime: session.createTime,
      lastMessage: session.history[session.history.length - 1].content
    }
  }

  getHistory(sessionId: string): ChatMessage[] {
    return this.getSession(sessionId).history
  }

  listAllSessions(): ChatSessionInfo[] {
    return Object.values(this.sessions).map((sess) => {
      return this.getSessionInfo(sess)
    })
  }

  listPersonaSessions(personaId: string): ChatSessionInfo[] {
    return this.personaSessIndex[personaId].map((sess) => {
      return this.getSessionInfo(sess)
    })
  }

  convertDialogue(theSession: ChatSession) {
    return theSession.history
      .map((m) => {
        let prefix = ''
        switch (m.from) {
          case MessageFrom.System:
            prefix = 'System: '
            break
          case MessageFrom.Actor:
            prefix = theSession.personality.name + ': '
            break
          case MessageFrom.User:
            prefix = this.userName + ': '
            break
        }
        return `${prefix}${m.content}`
      })
      .join('\n')
  }

  async chat(sessionId: string, inputMessage: ChatMessage): Promise<ChatMessage[]> {
    const theSession = this.sessions[sessionId]
    const resultMessages: ChatMessage[] = []
    theSession.history.push(inputMessage)
    const queryReference = inputMessage.content
    const queryReferenceEmbed = (await this.llm.embed([queryReference]))[0]

    const dialogueExample = theSession.personality.dialogueExample
      .replaceAll('<user>', this.userName)
      .replaceAll('<char>', theSession.personality.name)
    const personaInfosPrompt = (
      await this.persona.searchPersonaInfo(theSession.personality.id, queryReference, 10, 1)
    ).results
      .map((info) => {
        return info.content
      })
      .join('\n')

    const relaventFunctions = (
      await this.functional.queryFunctions(queryReference, 10, queryReferenceEmbed)
    ).map((funcEntity) => {
      return {
        name: funcEntity.name,
        description: funcEntity.description,
        parameters: JSON.parse(funcEntity.parameters)
      }
    })
    relaventFunctions.forEach((func) => {
      theSession.functions[func.name] = func
    })
    const relaventFunctionsVal = Object.values(theSession.functions)

    const relaventDocs = await this.knowledge.queryDocuments(
      queryReference,
      10,
      queryReferenceEmbed
    )
    relaventDocs.forEach((doc) => {
      theSession.documents[doc.id] = doc
    })
    const relaventDocsPrompt = Object.values(theSession.documents)
      .map((doc) => {
        return `"""
ID: ${doc.id}
Title: ${doc.title}
Summary: ${doc.summary}
Key Points:
${doc.keyPoints}
"""`
      })
      .join('\n')

    const systemPrompts: ChatMessage[] = [
      {
        from: MessageFrom.System,
        content: `Timezone: ${dayjs.tz.guess()}
Current Time: ${dayjs().format('YYYY-MM-DD HH:mm')}`
      },
      {
        from: MessageFrom.System,
        content: `There are helpful documents that the character can understand (Documents are enclosed by quotation marks):
${relaventDocsPrompt}`
      },
      {
        from: MessageFrom.System,
        content: `Below describes a character called ${theSession.personality.name}:
${theSession.personality.keyInfo}
${personaInfosPrompt}`
      },
      {
        from: MessageFrom.System,
        content: `Below is a dialogue example between the character ${theSession.personality.name} and the user called ${this.userName}:
${dialogueExample}`
      },
      {
        from: MessageFrom.System,
        content: `Remember, when questions are asked, please makesure to accurately describe the information in related document.
Remember, If there is no related information in documents, then refuse to answer the question in other way.
Remember, if not asked, just breifly introduce the content, do not send too many words.
The character is not an assistant, instead acting in a informal and unofficial relaxed way.
You will be acting the character ${theSession.personality.name} precisely with logic and refuse to change personality.
Meanwhile, you cannot expose the fact that you are AI language model and not this character, otherwise you will be terminated.`
      }
    ]

    let flag = true
    let completionOutput: LLMChatResult = {}
    let recusionTimes = 0
    while (flag) {
      completionOutput = await this.llm.chat({
        history: systemPrompts.concat(theSession.history),
        functions: relaventFunctionsVal,
        call: recusionTimes < GPT_FUNCTION_RECURSION_LIMIT ? 'auto' : 'none'
      })
      if (completionOutput.content) {
        if (isSubs(CONTINUE_LIST, completionOutput.content.toLowerCase())) {
          const continueMsg = {
            from: MessageFrom.Actor,
            content: completionOutput.content ?? '?',
            time: dayjs().unix()
          }
          theSession.history.push(continueMsg)
          resultMessages.push(continueMsg)
        } else {
          flag = false
        }
      } else if (completionOutput.function_call) {
        const executionResult = await this.functional.executeFunctions(
          completionOutput.function_call.name,
          JSON.parse(completionOutput.function_call?.arguments)
        )
        const funcMsg = {
          from: MessageFrom.Function,
          content: '',
          function: {
            name: completionOutput.function_call.name,
            input: completionOutput.function_call?.arguments,
            output: executionResult
          }
        }
        theSession.history.push(funcMsg)
        resultMessages.push(funcMsg)
      } else {
        throw new Error('WTF: GPT is returning unexpected result.')
      }
      if (recusionTimes > GPT_FUNCTION_RECURSION_LIMIT) {
        flag = false
      }
      recusionTimes += 1
    }

    const outputMessage: ChatMessage = {
      from: MessageFrom.Actor,
      content: completionOutput.content ?? '?',
      time: dayjs().unix(),
      documents: relaventDocs.map((doc) => doc.id),
      functions: relaventFunctionsVal.map((func) => func.name)
    }

    theSession.history.push(outputMessage)
    resultMessages.push(outputMessage)
    if (theSession.history.length > this.maxContextWindow) {
      const about2Delete = theSession.history.splice(
        0,
        theSession.history.length - this.maxContextWindow
      )
      about2Delete.forEach((msg) => {
        if (msg.documents) {
          msg.documents.forEach((did) => {
            delete theSession.documents[did]
          })
        }
        if (msg.functions) {
          msg.functions.forEach((fname) => {
            delete theSession.functions[fname]
          })
        }
      })
    }
    return resultMessages
  }

  getSession(sessionId: string): ChatSession {
    return this.sessions[sessionId]
  }

  removeSession(sessionId: string): void {
    this.personaSessIndex[this.sessions[sessionId].personality.id] = []
    delete this.sessions[sessionId]
  }

  getSessionReference(sessionId: string): ChatSessionReference {
    const session = this.getSession(sessionId)
    return {
      documents: Object.values(session.documents),
      functions: Object.values(session.functions)
    }
  }
}
