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

const LoadingSequence = ({ currentPhase }: { currentPhase: string }) => {
  const [dots, setDots] = useState(1)

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(d => (d % 3) + 1)
    }, 300)
    return () => clearInterval(dotsInterval)
  }, [])

  const phases = [
    'RETRIEVING_INDEXED_FAILURES',
    'QUERYING_LIVE_SOURCES',
    'SYNTHESIZING_TAXONOMY'
  ]
  const currentIndex = phases.indexOf(currentPhase);

  const dotString = Array(dots).fill('·').join('') + Array(3 - dots).fill('\u00A0').join('')

  return (
    <div style={{ marginTop: '32px' }}>
      {phases.map((phase, idx) => {
        if (idx > ((currentIndex < 0) ? phases.length : currentIndex)) return null;
        return (
          <div 
            key={idx} 
            className="fade-in"
            style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '11px', 
              color: idx < currentIndex ? 'var(--text-primary)' : 'var(--text-secondary)',
              marginBottom: '8px',
            }}
          >
            {phase.replace(/_/g, ' ')} {idx < currentIndex ? <span style={{ color: 'var(--accent-teal)' }}>✓</span> : <span>{Number(dots) ? dotString : '···'}</span>}
          </div>
        )
      })}
    </div>
  )
}

const attemptParse = (str: string) => {
  try { return JSON.parse(str); } catch {}
  try { return JSON.parse(str + '}'); } catch {}
  try { return JSON.parse(str + ']}'); } catch {}
  try { return JSON.parse(str + '"]}]}'); } catch {}
  try { return JSON.parse(str + '}]}]}'); } catch {}
  try { return JSON.parse(str + '"]}]}]}'); } catch {}
  return null;
}

export default function GraveyardApp() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'streaming' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [card, setCard] = useState<TaxonomyCard | null>(null)
  const [meta, setMeta] = useState<{ databaseSize: number, exaFailed: boolean, usingLocalFallback: boolean } | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [phase, setPhase] = useState('RETRIEVING_INDEXED_FAILURES')

  const handleSearch = async (e?: React.FormEvent, overridingQuery?: string) => {
    if (e) e.preventDefault()
    const finalQuery = overridingQuery || query
    if (!finalQuery.trim()) return

    if (overridingQuery) setQuery(overridingQuery)
    setStatus('loading')
    setPhase('RETRIEVING_INDEXED_FAILURES')
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

      // Convert to SSE consumer
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No readable stream available");

      let fullJsonStr = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const events = chunk.split('\n\n').filter(Boolean);
        
        for (const event of events) {
          if (event.startsWith('data: ')) {
            const dataStr = event.slice(6);
            if (dataStr === '[DONE]') continue;
            
            try {
              const payload = JSON.parse(dataStr);
              if (payload.type === 'meta') {
                setMeta(prev => ({ 
                  ...prev, 
                  databaseSize: prev?.databaseSize || 0, // Fallback until db_count
                  exaFailed: payload.exaFailed, 
                  usingLocalFallback: payload.usingLocalFallback 
                }));
                setPhase('SYNTHESIZING_TAXONOMY');
                setStatus('streaming');
              } else if (payload.type === 'chunk') {
                fullJsonStr += payload.content;
                const partialObj = attemptParse(fullJsonStr);
                if (partialObj) {
                  setCard(partialObj);
                }
              } else if (payload.type === 'done') {
                try {
                  setCard(JSON.parse(fullJsonStr));
                } catch {
                  // Final safety net, use partial if valid fails
                }
                setStatus('success');
              } else if (payload.type === 'db_count') {
                setMeta(prev => prev ? { ...prev, databaseSize: payload.count } : null);
              }
            } catch (err) {
              console.error("Failed to parse SSE event:", err);
            }
          }
        }
      }
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
        <div style={{ maxWidth: '1440px', width: '100%', padding: '0 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }} className="max-md:px-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SkullIcon />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.2em', color: 'var(--text-primary)', fontWeight: 600 }}>
              GRAVEYARD
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="pulse-dot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-red)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em', color: 'var(--text-primary)', opacity: 0.9 }}>
              EARLY ACCESS
            </span>
            <span className="hidden md:inline" style={{ color: 'var(--text-secondary)' }}>&nbsp;|&nbsp;</span>
            <span className="hidden md:inline" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em', color: 'var(--text-primary)', opacity: 0.9 }}>
              {meta?.databaseSize ? meta.databaseSize : '...'} INDEXED FAILURES
            </span>
          </div>
        </div>
      </header>

      {/* Constraints Container */}
      <main style={{ maxWidth: '1440px', width: '100%', padding: '0 48px' }} className="max-md:px-5">
        
        {/* Zone 3: Hero */}
        <div style={{ paddingTop: '160px', paddingBottom: status === 'idle' ? '120px' : '40px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(48px, 8vw, 120px)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 0.9, display: 'block', margin: 0 }}>
            FAILURE
          </h1>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(48px, 8vw, 120px)', fontWeight: 800, color: 'var(--accent-red)', lineHeight: 0.9, display: 'block', margin: 0 }} className="md:ml-[clamp(32px,4vw,80px)]">
            INTELLIGENCE
          </h1>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(48px, 8vw, 120px)', fontWeight: 800, color: 'var(--text-secondary)', lineHeight: 0.9, display: 'block', margin: 0 }}>
            SYSTEM
          </h1>

          <div style={{ marginTop: '40px' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '15px', color: 'var(--text-primary)', opacity: 0.85, maxWidth: '480px', lineHeight: 1.6 }}>
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
                  disabled={status === 'loading' || status === 'streaming'}
                  placeholder="what are you building, and what has failed like it before?"
                  style={{
                    background: 'transparent', border: 'none', outline: 'none', flexGrow: 1,
                    fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-primary)',
                    width: '100%'
                  }}
                  className="placeholder-[var(--text-secondary)] focus:ring-0"
                />
                
                <button 
                  type="submit" 
                  disabled={status === 'loading' || status === 'streaming'}
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em',
                    color: 'var(--bg)', background: 'var(--accent-red)', padding: '10px 20px',
                    border: 'none', borderRadius: 0, cursor: (status === 'loading' || status === 'streaming') ? 'default' : 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseOver={(e) => { if(status !== 'loading' && status !== 'streaming') e.currentTarget.style.background = '#a93226' }}
                  onMouseOut={(e) => { if(status !== 'loading' && status !== 'streaming') e.currentTarget.style.background = 'var(--accent-red)' }}
                >
                  {status === 'loading' ? '···' : 'SEARCH'}
                </button>
              </div>
            </form>

            {status === 'idle' && (
              <div style={{ marginTop: '12px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)' }}>
                Try:{' '}
                <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e=>e.currentTarget.style.color='var(--text-primary)'} onMouseOut={e=>e.currentTarget.style.color='var(--text-secondary)'} onClick={() => handleTryClick("why do AI diagnostics tools fail")}>"why do AI diagnostics tools fail"</span> {' · '}
                <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e=>e.currentTarget.style.color='var(--text-primary)'} onMouseOut={e=>e.currentTarget.style.color='var(--text-secondary)'} onClick={() => handleTryClick("why do edtech startups fail")}>"why do edtech startups fail"</span> {' · '}
                <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e=>e.currentTarget.style.color='var(--text-primary)'} onMouseOut={e=>e.currentTarget.style.color='var(--text-secondary)'} onClick={() => handleTryClick("crew resource management failures")}>"crew resource management failures"</span>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {status === 'loading' && <LoadingSequence currentPhase={phase} />}

        {/* Error State */}
        {status === 'error' && (
          <div style={{ marginTop: '32px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>
            <span style={{ color: 'var(--accent-red)' }}>[ERROR]</span> {errorMessage}
          </div>
        )}

        {/* Taxonomy Card */}
        {(status === 'streaming' || status === 'success') && card && (
          <div className="fade-in" style={{ marginTop: '64px', borderTop: '1px solid var(--border-bright)' }}>
            
            {status === 'streaming' && (
               <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '16px', background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.3)', padding: '6px 12px' }}>
                 <div className="pulse-dot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-amber)' }}></div>
                 <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.15em', color: 'var(--accent-amber)'}}>SYNTHESIZING...</span>
               </div>
            )}

            {/* Meta Alerts (Live Exa failure info optionally placed before card if needed) */}
            {(meta?.exaFailed || meta?.usingLocalFallback) && (
              <div style={{ padding: '16px 0', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-amber)' }}>
                {meta?.exaFailed ? '[NOTICE] Live source retrieval unavailable — showing indexed failures only. ' : ''}
                {meta?.usingLocalFallback && !meta?.exaFailed ? '[NOTICE] Running on local index — live database unavailable. ' : ''}
              </div>
            )}

            {/* Card Header */}
            <div style={{ padding: '32px 0 24px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.2em', color: 'var(--accent-red)' }}>FAILURE TAXONOMY CARD</span>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)' }}>{new Date().toISOString().split('T')[0]}</span>
                </div>
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {card.query || query}
              </h2>
            </div>

            {/* Mechanisms */}
            {card.mechanisms && card.mechanisms.length > 0 && (
              <section style={{ marginTop: '48px' }}>
                <h3 className="slide-up" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--text-primary)', marginBottom: '24px' }}>
                  01 — FAILURE MECHANISMS
                </h3>
                
                <div>
                  {card.mechanisms?.map((mech, i) => (
                    <div key={i} className="slide-left" style={{ 
                      borderBottom: '1px solid var(--border)', padding: '28px 0',
                      display: 'flex', flexDirection: 'column', gap: 0,
                      animationDelay: `${i * 80 + 100}ms`
                    }}>
                      {/* Sub-row 1 */}
                      <div className="mobile-mech-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
                        <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                          {mech.name}
                        </h4>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em',
                          color: mech.frequency === 'HIGH' ? 'var(--accent-red)' : 
                                 mech.frequency === 'MEDIUM' ? 'var(--accent-amber)' : 'var(--text-secondary)',
                          border: '1px solid currentColor', padding: '4px 10px', borderRadius: 0
                        }}>
                          {mech.frequency?.toUpperCase() || "UNKNOWN"}
                        </span>
                      </div>

                      {/* Sub-row 2 */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 400, color: 'var(--text-primary)', opacity: 0.85, lineHeight: 1.65, maxWidth: '840px', margin: '0 0 14px 0' }}>
                          {mech.description}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                          {mech.warning_signs?.map((ws, j) => (
                            <span key={j} style={{
                              border: '1px solid var(--border-bright)', fontFamily: 'var(--font-mono)', fontSize: '10px', 
                              color: 'var(--text-primary)', opacity: 0.85, padding: '4px 12px', margin: '0 6px 6px 0', display: 'inline-block', borderRadius: 0
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
            )}

            {/* Broken Assumptions */}
            {card.broken_assumptions && card.broken_assumptions.length > 0 && (
              <section style={{ marginTop: '64px' }}>
                <h3 className="slide-up" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--text-primary)', marginBottom: '24px' }}>
                  02 — BROKEN ASSUMPTIONS
                </h3>
                
                <div>
                  {card.broken_assumptions?.map((ba, i) => (
                    <div key={i} className="slide-up" style={{ 
                      padding: '24px 0 24px 24px', borderBottom: '1px solid var(--border)', borderLeft: '2px solid var(--accent-red-dim)'
                    }}>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 600, fontStyle: 'italic', color: 'var(--text-primary)', marginBottom: '12px', lineHeight: 1.4 }}>
                        "{ba.assumption}"
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)' }}>
                          WHO HELD IT — <span style={{ color: 'var(--text-secondary)' }}>{ba.who_held_it}</span>
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)' }}>
                          EXPOSED BY — <span style={{ color: 'var(--text-secondary)' }}>{ba.what_revealed_it}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Cross-Domain Transfer */}
            {card.cross_domain_insights && card.cross_domain_insights.length > 0 && (
              <section style={{ marginTop: '64px' }}>
                <h3 className="slide-up" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--text-primary)', marginBottom: '24px' }}>
                  03 — CROSS-DOMAIN TRANSFER
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {card.cross_domain_insights.map((cdi, i) => (
                    <div key={i} className="slide-up" style={{ 
                      background: 'var(--bg-surface)', border: '1px solid var(--border)', borderLeft: '2px solid var(--accent-teal)',
                      padding: '28px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-teal)', textTransform: 'uppercase', fontWeight: 600 }}>{cdi.source_domain}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-primary)' }}>——→</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-primary)', textTransform: 'uppercase', fontWeight: 600 }}>QUERY DOMAIN</span>
                      </div>
                      
                      <h5 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                        {cdi.source_failure}
                      </h5>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontStyle: 'italic', color: 'var(--text-primary)', opacity: 0.85, lineHeight: 1.5, margin: 0 }}>
                        {cdi.pattern_match}
                      </p>
                      
                      {cdi.concrete_translation && (
                        <div style={{ 
                          marginTop: '16px', padding: '16px', background: 'rgba(26, 138, 122, 0.06)', border: '1px solid rgba(26, 138, 122, 0.15)' 
                        }}>
                          <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--accent-teal)', marginBottom: '8px' }}>
                            CONCRETE TRANSLATION
                          </span>
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--text-primary)', opacity: 0.9, lineHeight: 1.6, margin: 0 }}>
                            {cdi.concrete_translation}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Synthesis Summary Boxes */}
            {(card.uncomfortable_truth || card.if_starting_today) && (
              <section style={{ marginTop: '64px' }}>
                <h3 className="slide-up" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--text-primary)', marginBottom: '24px' }}>
                  04 — SYNTHESIS
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Box 1 */}
                  {card.uncomfortable_truth && (
                    <div className="slide-up" style={{ 
                      border: '1px solid var(--accent-red-dim)', background: 'var(--accent-red-glow)', padding: '28px'
                    }}>
                      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--accent-red)', marginBottom: '16px' }}>
                        THE UNCOMFORTABLE TRUTH
                      </span>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.75, margin: 0 }}>
                        {card.uncomfortable_truth}
                      </p>
                    </div>
                  )}

                  {/* Box 2 */}
                  {card.if_starting_today && card.if_starting_today.length > 0 && (
                    <div className="slide-up" style={{ 
                      border: '1px solid rgba(212, 160, 23, 0.2)', background: 'rgba(212, 160, 23, 0.04)', padding: '28px'
                    }}>
                      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--accent-amber)', marginBottom: '16px' }}>
                        IF I WERE STARTING TODAY
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {card.if_starting_today?.map((action, i) => (
                          <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--accent-amber)', marginTop: '-2px' }}>→</span>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.75 }}>
                              {action}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Source Failures */}
            {(card.direct_matches || card.cross_domain_matches) && (
              <section style={{ marginTop: '64px' }}>
                <h3 className="slide-up" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--text-primary)', marginBottom: '24px' }}>
                  05 — INDEXED SOURCES
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
                  {/* Direct Matches */}
                  <div className="slide-up">
                    <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--text-primary)', opacity: 0.9, marginBottom: '16px' }}>
                      DIRECT MATCHES
                    </span>
                    <div>
                      {card.direct_matches?.map((m, i) => (
                        <div key={i} className="match-row" style={{ borderBottom: '1px solid var(--border)', padding: '12px 0' }}
                             onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
                             onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--accent-amber)', fontSize: '14px', lineHeight: 1 }}>●</span>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>{m.name}</span>
                            {(m as any).source_url && (
                               <a href={(m as any).source_url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-teal)', textDecoration: 'none', borderBottom: '1px solid var(--accent-teal)', display: 'inline-block', marginLeft: '12px', transition: 'opacity 0.2s ease' }} onMouseOver={e => e.currentTarget.style.opacity = '0.7'} onMouseOut={e => e.currentTarget.style.opacity = '1'}>
                                 ↗ SOURCE
                               </a>
                            )}
                            <span style={{ flexGrow: 1 }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-primary)' }}>{m.domain}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)' }}>{m.year}</span>
                          </div>
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', opacity: 0.85, margin: 0, paddingLeft: '22px', lineHeight: 1.5 }}>
                            {m.mechanism_overlap}
                          </p>
                        </div>
                      ))}
                      {(!card.direct_matches || card.direct_matches.length === 0) && (
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>No high confidence direct matches in the index.</p>
                      )}
                    </div>
                  </div>

                  {/* Cross-Domain Matches */}
                  <div className="slide-up">
                    <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--text-primary)', opacity: 0.9, marginBottom: '16px' }}>
                      CROSS-DOMAIN MATCHES
                    </span>
                    <div>
                      {card.cross_domain_matches?.map((m, i) => (
                        <div key={i} className="match-row" style={{ borderBottom: '1px solid var(--border)', padding: '12px 0' }}
                             onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
                             onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--accent-teal)', fontSize: '14px', lineHeight: 1 }}>●</span>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>{m.name}</span>
                            {(m as any).source_url && (
                               <a href={(m as any).source_url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-teal)', textDecoration: 'none', borderBottom: '1px solid var(--accent-teal)', display: 'inline-block', marginLeft: '12px', transition: 'opacity 0.2s ease' }} onMouseOver={e => e.currentTarget.style.opacity = '0.7'} onMouseOut={e => e.currentTarget.style.opacity = '1'}>
                                 ↗ SOURCE
                               </a>
                            )}
                            <span style={{ flexGrow: 1 }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-primary)' }}>{m.domain}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)' }}>{m.year}</span>
                          </div>
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', opacity: 0.85, margin: 0, paddingLeft: '22px', lineHeight: 1.5 }}>
                            {m.structural_similarity}
                          </p>
                        </div>
                      ))}
                      {(!card.cross_domain_matches || card.cross_domain_matches.length === 0) && (
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>No diverse structural analogs retrieved.</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .mobile-mech-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }
        }
        .match-row {
          transition: background 0.15s ease;
        }
      `}} />
    </div>
  )
}
