'use client'

import { useState, useEffect } from 'react'
import { TaxonomyCard } from '@/lib/failures'

// Minimal inline SVG Skull
const SkullIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M9 12h.01M15 12h.01M12 2C6.477 2 2 6.477 2 12c0 2.4.9 4.6 2.4 6.2L6 22h12l1.6-3.8C21.1 16.6 22 14.4 22 12 22 6.477 17.523 2 12 2z"/>
    <path d="M8 22v-4M16 22v-4M12 22v-4"/>
  </svg>
)

const LoadingSequence = () => {
  const [step, setStep] = useState(0)
  const [dots, setDots] = useState(1)

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStep(s => (s < 3 ? s + 1 : 3))
    }, 600)
    return () => clearInterval(stepInterval)
  }, [])

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(d => (d % 3) + 1)
    }, 300)
    return () => clearInterval(dotsInterval)
  }, [])

  const lines = [
    'RETRIEVING INDEXED FAILURES',
    'QUERYING LIVE SOURCES',
    'ABSTRACTING MECHANISMS',
    'SYNTHESIZING TAXONOMY'
  ]

  const dotString = Array(dots).fill('·').join('') + Array(3 - dots).fill('\u00A0').join('')

  return (
    <div style={{ marginTop: '32px' }}>
      {lines.map((text, idx) => (
        <div 
          key={idx} 
          className="fade-in"
          style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '11px', 
            color: 'var(--text-secondary)',
            marginBottom: '8px',
            visibility: step >= idx ? 'visible' : 'hidden'
          }}
        >
          {text} {step > idx ? <span style={{ color: 'var(--accent-teal)' }}>✓</span> : <span>{Number(dots) ? dotString : '···'}</span>}
        </div>
      ))}
    </div>
  )
}

export default function GraveyardApp() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [card, setCard] = useState<TaxonomyCard | null>(null)
  const [meta, setMeta] = useState<{ databaseSize: number, exaFailed: boolean, usingLocalFallback: boolean } | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  const handleSearch = async (e?: React.FormEvent, overridingQuery?: string) => {
    if (e) e.preventDefault()
    const finalQuery = overridingQuery || query
    if (!finalQuery.trim()) return

    if (overridingQuery) setQuery(overridingQuery)
    setStatus('loading')
    setErrorMessage('')
    setCard(null)
    setMeta(null)

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: finalQuery })
      })

      if (res.status === 429) {
        setStatus('error')
        setErrorMessage('Synthesis engine rate limited. Retry in 30 seconds.')
        return
      }

      if (!res.ok) {
        throw new Error('Search failed to run properly.')
      }

      const data = await res.json()
      if (data.error) {
        console.error("API error:", data.error)
        setStatus('error')
        setErrorMessage('Synthesis engine error. Output malformed or API unreachable.')
        return
      }

      setCard(data.card)
      setMeta(data.meta)
      setStatus('success')
    } catch (err: unknown) {
      console.error(err)
      setStatus('error')
      setErrorMessage('Network or parsing error. Please try again.')
    }
  }

  const handleTryClick = (example: string) => {
    handleSearch(undefined, example)
  }

  return (
    <div style={{ paddingBottom: '96px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Zone 1: Header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '56px', width: '100%',
        borderBottom: '1px solid var(--border)', background: 'rgba(8, 8, 8, 0.8)',
        backdropFilter: 'blur(12px)', zIndex: 50, display: 'flex', justifyContent: 'center'
      }}>
        <div style={{ maxWidth: '1200px', width: '100%', padding: '0 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }} className="max-md:px-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SkullIcon />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.2em', color: 'var(--text-primary)' }}>
              GRAVEYARD
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="pulse-dot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-red)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.15em', color: 'var(--text-secondary)' }}>
              EARLY ACCESS
            </span>
            <span className="hidden md:inline" style={{ color: 'var(--text-muted)' }}>&nbsp;|&nbsp;</span>
            <span className="hidden md:inline" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.15em', color: 'var(--text-secondary)' }}>
              {meta ? meta.databaseSize : '10'} INDEXED FAILURES
            </span>
          </div>
        </div>
      </header>

      {/* Constraints Container */}
      <main style={{ maxWidth: '1200px', width: '100%', padding: '0 48px' }} className="max-md:px-5">
        
        {/* Zone 3: Hero */}
        <div style={{ paddingTop: '160px', paddingBottom: status === 'idle' ? '120px' : '40px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(48px, 8vw, 120px)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 0.9, display: 'block', margin: 0 }}>
            FAILURE
          </h1>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(48px, 8vw, 120px)', fontWeight: 800, color: 'var(--accent-red)', lineHeight: 0.9, display: 'block', margin: 0 }} className="md:ml-[clamp(32px,4vw,80px)]">
            INTELLIGENCE
          </h1>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(48px, 8vw, 120px)', fontWeight: 800, color: 'var(--text-muted)', lineHeight: 0.9, display: 'block', margin: 0 }}>
            SYSTEM
          </h1>

          <div style={{ marginTop: '40px' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '480px', lineHeight: 1.6 }}>
              Every field relearns the same lessons. Graveyard indexes failure so you don't have to repeat it.
            </p>
          </div>

          <div style={{ marginTop: '48px' }}>
            <form onSubmit={e => handleSearch(e)}>
              <div style={{
                border: `1px solid ${isFocused ? 'var(--accent-red)' : 'var(--border-bright)'}`,
                background: 'var(--bg-surface)',
                height: '64px', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                boxShadow: isFocused ? '0 0 0 1px var(--accent-red-glow)' : 'none'
              }}>
                <span className={isFocused ? "caret-blink" : ""} style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--accent-red)' }}>{'>'}</span>
                
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  disabled={status === 'loading'}
                  placeholder="what are you building, and what has failed like it before?"
                  style={{
                    background: 'transparent', border: 'none', outline: 'none', flexGrow: 1,
                    fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-primary)',
                    width: '100%'
                  }}
                  className="placeholder-[var(--text-muted)] focus:ring-0"
                />
                
                <button 
                  type="submit" 
                  disabled={status === 'loading'}
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em',
                    color: 'var(--bg)', background: 'var(--accent-red)', padding: '10px 20px',
                    border: 'none', borderRadius: 0, cursor: status === 'loading' ? 'default' : 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseOver={(e) => { if(status !== 'loading') e.currentTarget.style.background = '#a93226' }}
                  onMouseOut={(e) => { if(status !== 'loading') e.currentTarget.style.background = 'var(--accent-red)' }}
                >
                  {status === 'loading' ? '···' : 'SEARCH'}
                </button>
              </div>
            </form>

            {status === 'idle' && (
              <div style={{ marginTop: '12px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>
                Try:{' '}
                <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e=>e.currentTarget.style.color='var(--text-secondary)'} onMouseOut={e=>e.currentTarget.style.color='var(--text-muted)'} onClick={() => handleTryClick("why do AI diagnostics tools fail")}>"why do AI diagnostics tools fail"</span> {' · '}
                <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e=>e.currentTarget.style.color='var(--text-secondary)'} onMouseOut={e=>e.currentTarget.style.color='var(--text-muted)'} onClick={() => handleTryClick("why do edtech startups fail")}>"why do edtech startups fail"</span> {' · '}
                <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e=>e.currentTarget.style.color='var(--text-secondary)'} onMouseOut={e=>e.currentTarget.style.color='var(--text-muted)'} onClick={() => handleTryClick("crew resource management failures")}>"crew resource management failures"</span>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {status === 'loading' && <LoadingSequence />}

        {/* Error State */}
        {status === 'error' && (
          <div style={{ marginTop: '32px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--accent-red)' }}>[ERROR]</span> {errorMessage}
          </div>
        )}

        {/* Taxonomy Card */}
        {status === 'success' && card && (
          <div className="fade-in" style={{ marginTop: '64px', borderTop: '1px solid var(--border-bright)' }}>
            {/* Meta Alerts (Live Exa failure info optionally placed before card if needed) */}
            {(meta?.exaFailed || meta?.usingLocalFallback) && (
              <div style={{ padding: '16px 0', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-amber)' }}>
                {meta?.exaFailed ? '[NOTICE] Live source retrieval unavailable — showing indexed failures only.' : ''}
                {meta?.usingLocalFallback && !meta?.exaFailed ? '[NOTICE] Running on local index — live database unavailable.' : ''}
              </div>
            )}

            {/* Card Header */}
            <div style={{ padding: '32px 0 24px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.2em', color: 'var(--accent-red)' }}>FAILURE TAXONOMY CARD</span>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>{new Date().toISOString().split('T')[0]}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>{meta?.databaseSize || 0} FAILURES INDEXED</span>
                </div>
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {card.query}
              </h2>
            </div>

            {/* Mechanisms */}
            <section style={{ marginTop: '48px' }}>
              <h3 className="slide-up" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.15em', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                01 — FAILURE MECHANISMS
              </h3>
              
              <div>
                {card.mechanisms?.map((mech, i) => (
                  <div key={i} className="slide-left mx-max-md-grid-override" style={{ 
                    borderBottom: '1px solid var(--border)', padding: '20px 0',
                    display: 'grid', gridTemplateColumns: '200px 80px 1fr', gap: '32px', alignItems: 'start',
                    animationDelay: `${i * 80 + 100}ms`
                  }}>
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {mech.name}
                      <span className="md:hidden ml-2 px-2 py-0.5" style={{
                        display: 'inline-block',
                        fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', borderRadius: '2px',
                        color: mech.frequency.toUpperCase() === 'HIGH' ? 'var(--accent-red)' : 
                               mech.frequency.toUpperCase() === 'MEDIUM' ? 'var(--accent-amber)' : 'var(--text-secondary)',
                        border: `1px solid ${mech.frequency.toUpperCase() === 'HIGH' ? 'var(--accent-red-dim)' : 
                                         mech.frequency.toUpperCase() === 'MEDIUM' ? 'rgba(212,160,23,0.3)' : 'var(--border)'}`,
                        background: 'transparent'
                      }}>
                        {mech.frequency.toUpperCase()}
                      </span>
                    </h4>
                    
                    <span className="hidden md:inline-block px-2 py-0.5 text-center" style={{
                      fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', borderRadius: '2px',
                      color: mech.frequency.toUpperCase() === 'HIGH' ? 'var(--accent-red)' : 
                             mech.frequency.toUpperCase() === 'MEDIUM' ? 'var(--accent-amber)' : 'var(--text-secondary)',
                      border: `1px solid ${mech.frequency.toUpperCase() === 'HIGH' ? 'var(--accent-red-dim)' : 
                                       mech.frequency.toUpperCase() === 'MEDIUM' ? 'rgba(212,160,23,0.3)' : 'var(--border)'}`,
                      background: 'transparent'
                    }}>
                      {mech.frequency.toUpperCase()}
                    </span>

                    <div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                        {mech.description}
                      </p>
                      <div style={{ marginTop: '12px' }}>
                        {mech.warning_signs?.map((ws, j) => (
                          <span key={j} style={{
                            border: '1px solid var(--border-bright)', fontFamily: 'var(--font-mono)', fontSize: '9px', 
                            color: 'var(--text-muted)', padding: '3px 8px', margin: '4px 4px 0 0', display: 'inline-block'
                          }}>
                            {ws}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Broken Assumptions */}
            <section style={{ marginTop: '64px' }}>
              <h3 className="slide-up" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.15em', color: 'var(--text-secondary)', marginBottom: '24px', animationDelay: '200ms' }}>
                02 — BROKEN ASSUMPTIONS
              </h3>
              
              <div>
                {card.broken_assumptions?.map((ba, i) => (
                  <div key={i} className="slide-up" style={{ 
                    padding: '24px 0 24px 24px', borderBottom: '1px solid var(--border)', borderLeft: '2px solid var(--accent-red-dim)',
                    animationDelay: `${i * 80 + 300}ms`
                  }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, fontStyle: 'italic', color: 'var(--text-primary)', marginBottom: '12px', lineHeight: 1.4 }}>
                      "{ba.assumption}"
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)' }}>
                        WHO HELD IT — <span style={{ color: 'var(--text-muted)' }}>{ba.who_held_it}</span>
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)' }}>
                        EXPOSED BY — <span style={{ color: 'var(--text-muted)' }}>{ba.what_revealed_it}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Cross-Domain Transfer */}
            {card.cross_domain_insights?.length > 0 && (
              <section style={{ marginTop: '64px' }}>
                <h3 className="slide-up" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.15em', color: 'var(--text-secondary)', marginBottom: '24px', animationDelay: '300ms' }}>
                  03 — CROSS-DOMAIN TRANSFER
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {card.cross_domain_insights.map((cdi, i) => (
                    <div key={i} className="slide-up" style={{ 
                      background: 'var(--bg-surface)', border: '1px solid var(--border)', borderLeft: '2px solid var(--accent-teal)',
                      padding: '28px', animationDelay: `${i * 80 + 400}ms`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--accent-teal)', textTransform: 'uppercase' }}>{cdi.source_domain}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-secondary)' }}>——→</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>QUERY DOMAIN</span>
                      </div>
                      
                      <h5 style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                        {cdi.source_failure}
                      </h5>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                        {cdi.pattern_match}
                      </p>
                      
                      <div style={{ 
                        marginTop: '16px', padding: '16px', background: 'rgba(26, 138, 122, 0.06)', border: '1px solid rgba(26, 138, 122, 0.15)' 
                      }}>
                        <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.15em', color: 'var(--accent-teal)', marginBottom: '8px' }}>
                          CONCRETE TRANSLATION
                        </span>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
                          {cdi.concrete_translation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Synthesis Summary Boxes */}
            <section style={{ marginTop: '64px' }}>
              <h3 className="slide-up" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.15em', color: 'var(--text-secondary)', marginBottom: '24px', animationDelay: '400ms' }}>
                04 — SYNTHESIS
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Box 1 */}
                <div className="slide-up" style={{ 
                  border: '1px solid var(--accent-red-dim)', background: 'var(--accent-red-glow)', padding: '28px',
                  animationDelay: '450ms'
                }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: 'var(--accent-red)', marginBottom: '16px' }}>
                    THE UNCOMFORTABLE TRUTH
                  </span>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.7, margin: 0 }}>
                    {card.uncomfortable_truth}
                  </p>
                </div>

                {/* Box 2 */}
                <div className="slide-up" style={{ 
                  border: '1px solid rgba(212, 160, 23, 0.2)', background: 'rgba(212, 160, 23, 0.04)', padding: '28px',
                  animationDelay: '500ms'
                }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: 'var(--accent-amber)', marginBottom: '16px' }}>
                    IF I WERE STARTING TODAY
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {card.if_starting_today?.map((action, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--accent-amber)', marginTop: '-2px' }}>→</span>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.6 }}>
                          {action}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Source Failures */}
            <section style={{ marginTop: '64px' }}>
              <h3 className="slide-up" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.15em', color: 'var(--text-secondary)', marginBottom: '24px', animationDelay: '500ms' }}>
                05 — INDEXED SOURCES
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
                {/* Direct Matches */}
                <div className="slide-up" style={{ animationDelay: '550ms' }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    DIRECT MATCHES
                  </span>
                  <div>
                    {card.direct_matches?.map((m, i) => (
                      <div key={i} className="match-row" style={{ borderBottom: '1px solid var(--border)', padding: '12px 0' }}
                           onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
                           onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ color: 'var(--accent-amber)', fontSize: '14px', lineHeight: 1 }}>●</span>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{m.name}</span>
                          <span style={{ flexGrow: 1 }} />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)' }}>{m.domain}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{m.year}</span>
                        </div>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', margin: 0, paddingLeft: '22px', lineHeight: 1.5 }}>
                          {m.mechanism_overlap}
                        </p>
                      </div>
                    ))}
                    {(!card.direct_matches || card.direct_matches.length === 0) && (
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>No high confidence direct matches in the index.</p>
                    )}
                  </div>
                </div>

                {/* Cross-Domain Matches */}
                <div className="slide-up" style={{ animationDelay: '600ms' }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    CROSS-DOMAIN MATCHES
                  </span>
                  <div>
                    {card.cross_domain_matches?.map((m, i) => (
                      <div key={i} className="match-row" style={{ borderBottom: '1px solid var(--border)', padding: '12px 0' }}
                           onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
                           onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ color: 'var(--accent-teal)', fontSize: '14px', lineHeight: 1 }}>●</span>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{m.name}</span>
                          <span style={{ flexGrow: 1 }} />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)' }}>{m.domain}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{m.year}</span>
                        </div>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', margin: 0, paddingLeft: '22px', lineHeight: 1.5 }}>
                          {m.structural_similarity}
                        </p>
                      </div>
                    ))}
                    {(!card.cross_domain_matches || card.cross_domain_matches.length === 0) && (
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>No diverse structural analogs retrieved.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Global Style Override for specific dynamic responsive elements if needed */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .mx-max-md-grid-override {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }
        .match-row {
          transition: background 0.15s ease;
        }
      `}} />
    </div>
  )
}
