/// <reference lib="webworker" />
import { executeCases } from './execute'
import type { ExecutionSpec } from './types'

export type WorkerRequest = {
  js: string
  spec: ExecutionSpec
  inputs: unknown[][]
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { js, spec, inputs } = event.data
  await executeCases(js, spec, inputs, {
    onLog: (entry) => self.postMessage({ type: 'log', entry }),
    onCase: (index, result) =>
      self.postMessage({ type: 'case', index, result }),
  })
  self.postMessage({ type: 'done' })
}
