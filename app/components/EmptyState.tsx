import Link from 'next/link'

interface Props {
  icon: string
  headline: string
  context: string
  action?: { label: string; href: string }
}

export default function EmptyState({ icon, headline, context, action }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '72px 24px',
    }}>
      <div style={{ fontSize: '44px', marginBottom: '16px', lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
        {headline}
      </div>
      <div style={{
        fontSize: '13px',
        color: '#64748b',
        maxWidth: '380px',
        lineHeight: '1.6',
        marginBottom: action ? '24px' : 0,
      }}>
        {context}
      </div>
      {action && (
        <Link href={action.href} className="btn btn-primary">
          {action.label}
        </Link>
      )}
    </div>
  )
}
