import { useRef, useState } from 'react'
import type { ReactNode } from 'react'

type Props = {
  direction: 'horizontal' | 'vertical'
  /** Initial size of the first pane, as a percentage. */
  initial?: number
  min?: number
  max?: number
  first: ReactNode
  second: ReactNode
  /** Collapse the second pane to a fixed header-sized strip (px). */
  collapseSecondTo?: number
}

/** Two panes with a draggable divider. `horizontal` places panes side by side. */
export default function SplitPane({
  direction,
  initial = 50,
  min = 15,
  max = 85,
  first,
  second,
  collapseSecondTo,
}: Props) {
  const [pct, setPct] = useState(initial)
  const container = useRef<HTMLDivElement>(null)
  const horizontal = direction === 'horizontal'

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault()
    const el = container.current!
    const rect = el.getBoundingClientRect()
    const move = (ev: PointerEvent) => {
      const p = horizontal
        ? ((ev.clientX - rect.left) / rect.width) * 100
        : ((ev.clientY - rect.top) / rect.height) * 100
      setPct(Math.min(max, Math.max(min, p)))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      document.body.style.userSelect = ''
    }
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div
      ref={container}
      className={'flex h-full w-full ' + (horizontal ? 'flex-row' : 'flex-col')}
    >
      <div
        className="min-h-0 min-w-0 overflow-hidden"
        style={
          collapseSecondTo
            ? { flex: 1 }
            : { flexBasis: `${pct}%`, flexShrink: 0 }
        }
      >
        {first}
      </div>
      <div
        role="separator"
        aria-orientation={horizontal ? 'vertical' : 'horizontal'}
        onPointerDown={startDrag}
        className={
          'shrink-0 bg-zinc-200 transition-colors hover:bg-amber-500 dark:bg-zinc-700 ' +
          (horizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize')
        }
      />
      <div
        className={
          'min-h-0 min-w-0 overflow-hidden ' +
          (collapseSecondTo ? '' : 'flex-1')
        }
        style={
          collapseSecondTo ? { flex: `0 0 ${collapseSecondTo}px` } : undefined
        }
      >
        {second}
      </div>
    </div>
  )
}
