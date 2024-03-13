export interface JSONProperties {
  [name: string]: JSONSchema
}

export interface JSONSchema {
  type: string
  description?: string
  properties?: JSONProperties
  enum?: string[]
  required?: string[]
}

export interface LLMFunction {
  name: string
  description: string
  parameters: JSONSchema
}

export interface FunctionEntity {
  name: string // unique
  vecId: string // uuid filterable
  description: string
  parameters: string
  function: string
}
