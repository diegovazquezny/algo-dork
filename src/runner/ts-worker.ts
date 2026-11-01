/// <reference lib="webworker" />
import { executeCases } from './execute'

export type WorkerRequest = {
  js: string
  functionName: string
  inputs: unknown[][]
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { js, functionName, inputs } = event.data
  await executeCases(js, functionName, inputs, {
    onLog: (entry) => self.postMessage({ type: 'log', entry }),
    onCase: (index, result) =>
      self.postMessage({ type: 'case', index, result }),
  })
  self.postMessage({ type: 'done' })
}
