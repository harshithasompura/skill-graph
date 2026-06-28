import type { InsightsData } from '@/lib/types'

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div className="mt-4">
      <p className="text-xs text-muted font-mono uppercase tracking-wider mb-1">{title}</p>
      <div className="flex flex-wrap gap-1">
        {items.map(item => (
          <span key={item} className="text-xs font-mono border border-border px-1.5 py-0.5 text-foreground">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

interface InsightsPanelProps {
  insights: InsightsData | null
  onClose: () => void
}

export default function InsightsPanel({ insights, onClose }: InsightsPanelProps) {
  if (!insights) return null

  const typeLabel =
    insights.type === 'skill' ? 'SKILL' : insights.type === 'role' ? 'ROLE' : 'COMPANY'

  return (
    <div className="h-full border-l border-border bg-background p-4 overflow-y-auto w-72 flex-shrink-0">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-muted font-mono">{typeLabel}</p>
          <h2 className="text-base font-mono font-medium text-foreground mt-0.5">{insights.label}</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="close"
          className="text-muted hover:text-foreground font-mono text-sm leading-none ml-2"
        >
          ×
        </button>
      </div>

      <p className="text-sm font-mono text-accent">{insights.jobCount} jobs</p>

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
