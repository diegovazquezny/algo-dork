/**
 * Runtime data structures injected into user code, plus conversion between the
 * JSON representation used in question files (LeetCode-style) and live instances.
 *
 * JSON formats:
 * - ListNode:   [1,2,3]
 * - TreeNode:   level-order with nulls, e.g. [3,9,20,null,null,15,7]
 * - GraphNode:  adjacency list, node i+1 at index i, e.g. [[2,4],[1,3],[2,4],[1,3]]
 * - CyclicList: { values: [3,2,0,-4], pos: 1 } (pos = index the tail links to, -1 for none)
 * Any type may be suffixed with "[]" for an array of that type.
 */

export class ListNode {
  val: number
  next: ListNode | null
  constructor(val?: number, next?: ListNode | null) {
    this.val = val === undefined ? 0 : val
    this.next = next === undefined ? null : next
  }
}

export class TreeNode {
  val: number
  left: TreeNode | null
  right: TreeNode | null
  constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {
    this.val = val === undefined ? 0 : val
    this.left = left === undefined ? null : left
    this.right = right === undefined ? null : right
  }
}

export class GraphNode {
  val: number
  neighbors: GraphNode[]
  constructor(val?: number, neighbors?: GraphNode[]) {
    this.val = val === undefined ? 0 : val
    this.neighbors = neighbors === undefined ? [] : neighbors
  }
}

export const STRUCTURE_TYPES = [
  'json',
  'ListNode',
  'TreeNode',
  'GraphNode',
  'CyclicList',
] as const

const MAX_NODES = 100_000

export function listFromArray(values: number[] | null): ListNode | null {
  let head: ListNode | null = null
  for (let i = (values?.length ?? 0) - 1; i >= 0; i--) {
    head = new ListNode(values![i], head)
  }
  return head
}

export function listToArray(head: ListNode | null): number[] {
  const out: number[] = []
  let cur = head
  while (cur) {
    out.push(cur.val)
    if (out.length > MAX_NODES)
      throw new Error('Linked list is too long or contains a cycle.')
    cur = cur.next
  }
  return out
}

export function cyclicFromJson(v: { values: number[]; pos: number }) {
  const head = listFromArray(v.values)
  if (head && v.pos >= 0) {
    let tail = head
    let target = head
    let i = 0
    for (let cur: ListNode | null = head; cur; cur = cur.next, i++) {
      if (i === v.pos) target = cur
      tail = cur
    }
    tail.next = target
  }
  return head
}

export function treeFromArray(
  values: (number | null)[] | null,
): TreeNode | null {
  if (!values?.length || values[0] === null) return null
  const root = new TreeNode(values[0])
  const queue: TreeNode[] = [root]
  let i = 1
  for (let q = 0; q < queue.length && i < values.length; q++) {
    const node = queue[q]
    const l = values[i++]
    if (l !== null) {
      node.left = new TreeNode(l)
      queue.push(node.left)
    }
    if (i < values.length) {
      const r = values[i++]
      if (r !== null) {
        node.right = new TreeNode(r)
        queue.push(node.right)
      }
    }
  }
  return root
}

export function treeToArray(root: TreeNode | null): (number | null)[] {
  const out: (number | null)[] = []
  const queue: (TreeNode | null)[] = [root]
  // The queue grows while iterating; array iterators pick up pushed items.
  for (const node of queue) {
    if (queue.length > MAX_NODES)
      throw new Error('Tree is too large or cyclic.')
    if (!node) {
      out.push(null)
    } else {
      out.push(node.val)
      queue.push(node.left, node.right)
    }
  }
  while (out.length && out[out.length - 1] === null) out.pop()
  return out
}

export function graphFromAdjacency(adj: number[][] | null): GraphNode | null {
  if (!adj?.length) return null
  const nodes = adj.map((_, i) => new GraphNode(i + 1))
  adj.forEach((ns, i) => {
    nodes[i].neighbors = ns.map((n) => nodes[n - 1])
  })
  return nodes[0]
}

export function graphNodes(start: GraphNode | null): GraphNode[] {
  const seen = new Set<GraphNode>()
  const stack = start ? [start] : []
  while (stack.length) {
    const n = stack.pop()!
    if (seen.has(n)) continue
    seen.add(n)
    for (const m of n.neighbors) stack.push(m)
  }
  return [...seen]
}

export function graphToAdjacency(start: GraphNode | null): number[][] {
  const nodes = graphNodes(start).sort((a, b) => a.val - b.val)
  return nodes.map((n) => n.neighbors.map((m) => m.val))
}

function splitType(type: string): { base: string; array: boolean } {
  return type.endsWith('[]')
    ? { base: type.slice(0, -2), array: true }
    : { base: type, array: false }
}

function decodeOne(base: string, v: unknown): unknown {
  switch (base) {
    case 'ListNode':
      return listFromArray(v as number[] | null)
    case 'TreeNode':
      return treeFromArray(v as (number | null)[] | null)
    case 'GraphNode':
      return graphFromAdjacency(v as number[][] | null)
    case 'CyclicList':
      return cyclicFromJson(v as { values: number[]; pos: number })
    default:
      return v
  }
}

function encodeOne(base: string, v: unknown): unknown {
  switch (base) {
    case 'ListNode':
      return v === null || v instanceof ListNode ? listToArray(v) : v
    case 'TreeNode':
      return v === null || v instanceof TreeNode ? treeToArray(v) : v
    case 'GraphNode':
      return v === null || v instanceof GraphNode ? graphToAdjacency(v) : v
    default:
      return v
  }
}

/** JSON (from a question file) -> live value to pass into user code. */
export function decodeValue(type: string, json: unknown): unknown {
  const { base, array } = splitType(type)
  if (array) return (json as unknown[]).map((x) => decodeOne(base, x))
  return decodeOne(base, json)
}

/** Live value returned by user code -> JSON for comparison and display. */
export function encodeValue(type: string, value: unknown): unknown {
  const { base, array } = splitType(type)
  if (array && Array.isArray(value)) return value.map((x) => encodeOne(base, x))
  return encodeOne(base, value)
}
