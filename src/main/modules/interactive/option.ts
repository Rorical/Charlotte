import { LLMInterface } from '../llm/index'
import { PersonalityManagerInterface } from '../personality/index'
import { KnowledgeBaseInterface } from '../knowledge/index'
import { FunctionalityInterface } from '../functionality'

export interface InteractiveOption {
  llm: LLMInterface
  persona: PersonalityManagerInterface
  knowledge: KnowledgeBaseInterface
  functional: FunctionalityInterface
  userName: string
  maxContextWindow: number
}
