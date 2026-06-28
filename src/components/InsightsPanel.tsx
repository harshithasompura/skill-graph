import type { InsightsData } from '@/lib/types'

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null
  return (
    <div className="mt-5">
      <p className="text-[10px] text-muted font-mono uppercase tracking-widest mb-2">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => (
          <span
            key={item}
            className="text-xs font-mono border border-border px-2 py-0.5 text-foreground bg-background hover:border-accent hover:text-accent transition-colors duration-100 cursor-default"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

interface InsightsPanelProps {
  insights: InsightsData | null
  rateLimited?: boolean
  onClose: () => void
}

export default function InsightsPanel({ insights, rateLimited, onClose }: InsightsPanelProps) {
  if (rateLimited) return (
    <div className="h-full border-l border-border bg-surface w-72 flex-shrink-0 flex flex-col items-center justify-center gap-2 p-6">
      <span className="text-[10px] font-mono text-muted tracking-widest uppercase">rate limited</span>
      <p className="text-xs font-mono text-muted text-center leading-relaxed">too many requests<br />try again shortly</p>
    </div>
  )

  if (!insights) return (
    <div className="h-full border-l border-border bg-surface w-72 flex-shrink-0 flex flex-col items-center justify-center gap-2 p-6">
      <span className="text-[10px] font-mono text-muted tracking-widest uppercase">skill graph</span>
      <p className="text-xs font-mono text-muted text-center leading-relaxed">click any node<br />to explore insights</p>
    </div>
  )

  const typeLabel =
    insights.type === 'skill' ? 'SKILL' : insights.type === 'role' ? 'ROLE' : 'COMPANY'

  return (
    <div className="h-full border-l border-border bg-surface p-5 overflow-y-auto w-72 flex-shrink-0">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] text-muted font-mono tracking-widest">{typeLabel}</p>
          <h2 className="text-base font-mono font-medium text-foreground mt-1 leading-tight">{insights.label}</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="close"
          className="text-muted hover:text-foreground font-mono text-lg leading-none ml-2 mt-0.5 transition-colors"
        >
          ×
        </button>
      </div>

      <div className="flex items-baseline gap-1.5 border-t border-border pt-4">
        <span className="text-2xl font-mono font-medium text-accent tabular-nums">{insights.jobCount}</span>
        <span className="text-xs text-muted font-mono">jobs</span>
      </div>

      {insights.type === 'skill' && (
        <>
          <Section title="Most common with" items={insights.topCoSkills} />
          <Section title="Roles" items={insights.topRoles} />
          <Section title="Companies hiring" items={insights.topCompanies} />
        </>
      )}

      {insights.type === 'role' && (
        <>
          <Section title="Skills required" items={insights.topSkills} />
          <Section title="Companies hiring" items={insights.topCompanies} />
        </>
      )}

      {insights.type === 'company' && (
        <>
          <Section title="Skills sought" items={insights.topSkills} />
          <Section title="Roles" items={insights.topRoles} />
        </>
      )}
    </div>
  )
}
