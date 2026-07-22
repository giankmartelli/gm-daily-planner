type Props = { compact?: boolean; inverse?: boolean }

export function BrandLogo({ compact = false, inverse = false }: Props) {
  return <a className={`brand-logo ${compact ? 'compact' : ''} ${inverse ? 'inverse' : ''}`} href="/" aria-label="GM Daily Planner, inicio">
    <img src={inverse ? '/brand/logo-mark-dark.svg' : '/brand/logo-mark.svg'} alt=""/>
    {!compact && <span><strong>GM</strong><small>Daily Planner</small></span>}
  </a>
}
