import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** Renders markdown without raw HTML (react-markdown ignores it by default). */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-q text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}
