import type { Question } from '#/domain/question'
import type { ExecutionSpec } from './types'

/** Builds the execution spec for a question in a given language. */
export function buildSpec(question: Question, language: string): ExecutionSpec {
  const lang = question.languages[language]
  return {
    kind: question.kind,
    name: lang.functionName,
    decoderName: lang.decoderName,
    params: question.signature.params,
    returns: question.signature.returns,
    inplaceArg: question.signature.inplaceArg,
    requiresCopy: question.signature.requiresCopy,
  }
}
