import { net } from 'electron'
import { LLMOption, LLMCompletionOption, LLMChatOption, LLMChatResult } from './options'
import { MessageFrom } from '../../models/Chat'

export interface LLMInterface {
  complete(prompt: string, option?: LLMCompletionOption): Promise<string>
  embed(texts: string[]): Promise<number[][]>
  chat(option: LLMChatOption): Promise<LLMChatResult>
}

export class LLM implements LLMInterface {
  endPoint: string
  key: string
  chatModelName: string // 'gpt-3.5-turbo'
  embedModelName: string // 'text-embedding-ada-002'

  constructor(options: LLMOption) {
    this.endPoint = options.endPoint
    this.key = options.key
    this.chatModelName = options.chatModelName
    this.embedModelName = options.embedModelName
  }

  complete(prompt: string, option?: LLMCompletionOption): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const request = net.request({
        url: this.endPoint + 'v1/chat/completions',
        method: 'POST'
      })
      request.on('response', (response) => {
        let respBody = ''
        response.on('data', (data) => {
          respBody += data.toString('utf-8')
        })
        response.on('end', () => {
          if (response.statusCode !== 200) {
            return reject(new Error('Failed to request LLM chat completion: ' + respBody))
          }
          const jsonBody = JSON.parse(respBody)
          resolve(jsonBody['choices'][0]['message']['content'])
        })
        response.on('error', (error: Error) => {
          reject(error)
        })
        response.on('aborted', () => {
          reject(new Error('Request aborted'))
        })
      })
      request.setHeader('Content-Type', 'application/json')
      request.setHeader('Authorization', `Bearer ${this.key}`)
      request.write(
        JSON.stringify({
          model: this.chatModelName,
          messages: [{ role: 'system', content: prompt }],
          temperature: option?.temp ?? 1.0,
          stop: ['\n']
        })
      )
      request.end()
    })
  }

  async chat(info: LLMChatOption, option?: LLMCompletionOption): Promise<LLMChatResult> {
    return new Promise<LLMChatResult>((resolve, reject) => {
      const request = net.request({
        url: this.endPoint + 'v1/chat/completions',
        method: 'POST'
      })
      request.on('response', (response) => {
        let respBody = ''
        response.on('data', (data) => {
          respBody += data.toString('utf-8')
        })
        response.on('end', () => {
          if (response.statusCode !== 200) {
            return reject(new Error('Failed to request LLM chat completion: ' + respBody))
          }
          const jsonBody = JSON.parse(respBody)
          resolve(jsonBody['choices'][0]['message'])
        })
        response.on('error', (error: Error) => {
          reject(error)
        })
        response.on('aborted', () => {
          reject(new Error('Request aborted'))
        })
      })
      request.setHeader('Content-Type', 'application/json')
      request.setHeader('Authorization', `Bearer ${this.key}`)
      const messages: object[] = []
      info.history.forEach((msg) => {
        switch (msg.from) {
          case MessageFrom.System:
            messages.push({
              role: 'system',
              content: msg.content
            })
            break
          case MessageFrom.Actor:
            messages.push({
              role: 'assistant',
              content: msg.content
            })
            break
          case MessageFrom.User:
            messages.push({
              role: 'user',
              content: msg.content
            })
            break
          case MessageFrom.Function:
            messages.push({
              role: 'assistant',
              content: 'function called',
              function_call: {
                name: msg.function?.name,
                arguments: msg.function?.input
              }
            })
            messages.push({
              role: 'function',
              name: msg.function?.name,
              content: msg.function?.output
            })
            break
        }
      })
      request.write(
        JSON.stringify({
          model: this.chatModelName,
          messages: messages,
          temperature: option?.temp ?? 0.7,
          functions: info.functions,
          function_call: info.call ?? 'auto'
        })
      )
      request.end()
    })
  }

  embed(texts: string[]): Promise<number[][]> {
    return new Promise<number[][]>((resolve, reject) => {
      const request = net.request({
        url: this.endPoint + 'v1/embeddings',
        method: 'POST'
      })
      request.on('response', (response) => {
        let respBody = ''
        response.on('data', (data) => {
          respBody += data.toString('utf-8')
        })
        response.on('end', () => {
          if (response.statusCode !== 200) {
            return reject(new Error('Failed to request LLM embedding: ' + respBody))
          }
          const jsonBody = JSON.parse(respBody)
          resolve(jsonBody['data'].map((obj) => obj['embedding']))
        })
        response.on('error', (error: Error) => {
          reject(error)
        })
        response.on('aborted', () => {
          reject(new Error('Request aborted'))
        })
      })
      request.setHeader('Content-Type', 'application/json')
      request.setHeader('Authorization', `Bearer ${this.key}`)
      request.write(JSON.stringify({ input: texts, model: this.embedModelName }))
      request.end()
    })
  }
}
