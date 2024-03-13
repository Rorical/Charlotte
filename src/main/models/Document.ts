export interface Document {
  id: string // UUID
  title: string
  summary: string
  keyPoints: string
  content: string
  createTime: number // timestamp
  from: string
  uri: string
  type: string
  timeZone: string
}

export interface RawDocument {
  name: string // file name or webpage title
  content: string // all in markdown
  from: string
  uri: string
  type: string
  timezone: string
}