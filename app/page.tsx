'use client'

import { useState } from 'react'
import { Search, Skull, AlertCircle, RefreshCw } from 'lucide-react'
import { TaxonomyCard } from '@/lib/failures'

export default function GraveyardApp() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [card, setCard] = useState<TaxonomyCard | null>(null)
  const [meta, setMeta] = useState<{ databaseSize: number, exaFailed: boolean, usingLocalFallback: boolean } | null>(null)

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim()) return

    setStatus('loading')
    setErrorMessage('')
    setCard(null)
    setMeta(null)

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 selection:bg-red-900/30 font-sans pb-24">
      {/* Header */}
      <header className="flex items-center justify-between p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2 text-white">
          <Skull size={18} className="text-[#dc2626]" />
          <span className="font-mono tracking-widest text-sm font-bold">GRAVEYARD</span>
        </div>
        <div className="text-xs text-[#dc2626]/70 max-w-xs text-right hidden sm:block">
          Early Access — Database organically growing. Full ingestion pipeline active.
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-6 pt-16">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white">
            Every field relearns the same lessons.
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Graveyard indexes failure so you don't have to repeat it.
          </p>

          <form onSubmit={handleSearch} className="mt-12 relative max-w-3xl mx-auto">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#dc2626] transition-colors" size={20} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="What are you building, and what has failed like it before?"
                className="w-full bg-[#111] border-0 border-b-2 border-gray-800 text-white placeholder-gray-600 px-12 py-5 text-lg focus:ring-0 focus:outline-none focus:border-[#dc2626] transition-colors rounded-t-xl"
                disabled={status === 'loading'}
              />
              <button 
                type="submit" 
                disabled={status === 'loading'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-mono text-gray-500 hover:text-white transition-colors disabled:opacity-50"
              >
                ENTER
              </button>
            </div>
          </form>
        </div>

        {/* Status States */}
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-pulse">
            <div className="w-12 h-12 border-4 border-[#dc2626]/20 border-t-[#dc2626] rounded-full animate-spin" />
            <p className="font-mono text-sm text-gray-500">Searching indexed failures and live sources...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="py-12 flex flex-col items-center text-center space-y-4">
            <AlertCircle className="text-[#dc2626]" size={48} />
            <p className="text-gray-300 max-w-md">{errorMessage}</p>
            <button 
              onClick={() => handleSearch()}
              className="flex items-center gap-2 px-6 py-2 bg-[#dc2626]/10 text-[#dc2626] border border-[#dc2626]/30 rounded hover:bg-[#dc2626]/20 transition-colors font-mono text-sm"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {/* Results Card */}
        {status === 'success' && card && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-10">
            {/* Meta Warnings */}
            <div className="flex flex-col gap-2 mb-4">
              {meta?.exaFailed && (
                <div className="text-xs font-mono text-gray-500 flex items-center gap-2">
                  <AlertCircle size={12} className="text-[#f59e0b]" /> Live source retrieval unavailable — showing indexed failures only.
                </div>
              )}
              {meta?.usingLocalFallback && !meta?.exaFailed && (
                <div className="text-xs font-mono text-gray-500 flex items-center gap-2">
                  <AlertCircle size={12} className="text-[#f59e0b]" /> Running on local index — live database unavailable.
                </div>
              )}
            </div>

            {/* Banner */}
            <div className="border border-[#dc2626]/30 bg-[#111] overflow-hidden rounded-xl">
              <div className="bg-[#dc2626] text-black px-6 py-3 font-mono font-bold tracking-widest text-sm flex items-center justify-between">
                <span>FAILURE TAXONOMY CARD</span>
              </div>
              <div className="px-6 py-8 border-b border-gray-800 bg-[#0a0a0a]">
                <p className="font-mono text-[#dc2626] text-sm mb-1">QUERY:</p>
                <p className="text-2xl font-light text-white">{card.query}</p>
              </div>

              <div className="p-6 md:p-8 space-y-12">
                {/* Broken Assumptions */}
                <section>
                  <h3 className="font-mono text-sm text-gray-500 tracking-wider mb-6">BROKEN ASSUMPTIONS</h3>
                  <div className="space-y-6">
                    {card.broken_assumptions?.map((ba, i) => (
                      <div key={i} className="pl-6 border-l-2 border-gray-700 space-y-3">
                        <p className="text-2xl text-white italic">"{ba.assumption}"</p>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                          <span className="text-gray-400">
                            <span className="font-mono text-[#f59e0b]">HELD BY:</span> {ba.who_held_it}
                          </span>
                          <span className="text-gray-400">
                            <span className="font-mono text-[#f59e0b]">REVEALED BY:</span> {ba.what_revealed_it}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Mechanisms */}
                <section>
                  <h3 className="font-mono text-sm text-gray-500 tracking-wider mb-6">FAILURE MECHANISMS</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {card.mechanisms?.map((mech, i) => (
                      <div key={i} className="bg-[#111] p-5 rounded-lg border border-gray-800 flex flex-col relative overflow-hidden group hover:border-[#dc2626]/50 transition-colors">
                        <div className="absolute top-0 right-0 p-3">
                          <span className="text-[10px] font-mono px-2 py-1 rounded bg-gray-800 text-gray-300">
                            {mech.frequency.toUpperCase()}
                          </span>
                        </div>
                        <h4 className="font-mono font-bold text-[#dc2626] text-lg mb-3">{mech.name}</h4>
                        <p className="text-gray-300 text-sm mb-5 flex-grow leading-relaxed">{mech.description}</p>
                        <div className="pt-4 border-t border-gray-800/50">
                          <p className="text-xs font-mono text-gray-500 mb-2">WARNING SIGNS:</p>
                          <ul className="space-y-1 text-sm text-gray-400">
                            {mech.warning_signs?.map((ws, j) => (
                              <li key={j} className="flex items-start gap-2">
                                <span className="text-[#dc2626] mt-1">•</span> {ws}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Cross-Domain Insights */}
                {card.cross_domain_insights?.length > 0 && (
                  <section>
                    <h3 className="font-mono text-sm text-gray-500 tracking-wider mb-6">CROSS-DOMAIN INSIGHTS</h3>
                    <div className="space-y-4">
                      {card.cross_domain_insights.map((cdi, i) => (
                        <div key={i} className="bg-[#111] border border-gray-800 rounded-lg p-6">
                          <div className="flex items-center gap-3 font-mono text-xs mb-4 text-gray-500">
                            <span className="uppercase">{cdi.source_domain}</span>
                            <span className="text-[#14b8a6]">→</span>
                            <span className="uppercase text-[#14b8a6]">YOUR DOMAIN</span>
                          </div>
                          <p className="text-gray-300 mb-4 pb-4 border-b border-gray-800 border-dashed">
                            <span className="font-bold text-white mr-2">Pattern Match:</span> {cdi.pattern_match}
                          </p>
                          <div className="bg-[#14b8a6]/10 border border-[#14b8a6]/20 p-4 rounded text-[#14b8a6] text-sm leading-relaxed">
                            <span className="font-mono text-xs block mb-2 opacity-80">CONCRETE TRANSLATION:</span>
                            {cdi.concrete_translation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Summaries */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="border border-[#dc2626]/40 bg-[#111] p-6 rounded-xl relative">
                    <div className="absolute top-0 left-6 -translate-y-1/2 bg-[#0a0a0a] px-2">
                      <h4 className="font-mono text-xs text-[#dc2626] font-bold">THE UNCOMFORTABLE TRUTH</h4>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed mt-2">{card.uncomfortable_truth}</p>
                  </div>

                  <div className="border border-[#f59e0b]/40 bg-[#111] p-6 rounded-xl relative">
                    <div className="absolute top-0 left-6 -translate-y-1/2 bg-[#0a0a0a] px-2">
                      <h4 className="font-mono text-xs text-[#f59e0b] font-bold">IF I WERE STARTING TODAY</h4>
                    </div>
                    <ul className="space-y-3 mt-2">
                      {card.if_starting_today?.map((action, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-gray-300 leading-relaxed">
                          <span className="text-[#f59e0b] font-mono mt-0.5">{i+1}.</span> {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Source Failures */}
                <section className="pt-8 border-t border-gray-800">
                  <h3 className="font-mono text-sm text-gray-500 tracking-wider mb-6">REFERENCED FAILURES</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div>
                      <h4 className="font-mono text-xs text-[#f59e0b] mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span> DIRECT MATCHES
                      </h4>
                      <ul className="space-y-4">
                        {card.direct_matches?.map((m, i) => (
                          <li key={i} className="text-sm">
                            <div className="flex justify-between items-baseline mb-1">
                              <span className="font-bold text-white">{m.name}</span>
                              <span className="text-gray-600 text-xs font-mono">{m.domain} • {m.year}</span>
                            </div>
                            <p className="text-gray-400 text-xs leading-relaxed">{m.mechanism_overlap}</p>
                          </li>
                        ))}
                        {(!card.direct_matches || card.direct_matches.length === 0) && (
                          <p className="text-gray-600 text-xs italic">No direct matches found. Relying on cross-domain abstractions.</p>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-mono text-xs text-[#14b8a6] mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#14b8a6]"></span> CROSS-DOMAIN MATCHES
                      </h4>
                      <ul className="space-y-4">
                        {card.cross_domain_matches?.map((m, i) => (
                          <li key={i} className="text-sm">
                            <div className="flex justify-between items-baseline mb-1">
                              <span className="font-bold text-white">{m.name}</span>
                              <span className="text-gray-600 text-xs font-mono">{m.domain} • {m.year}</span>
                            </div>
                            <p className="text-gray-400 text-xs leading-relaxed">{m.structural_similarity}</p>
                          </li>
                        ))}
                         {(!card.cross_domain_matches || card.cross_domain_matches.length === 0) && (
                          <p className="text-gray-600 text-xs italic">No diverse structural matches found.</p>
                        )}
                      </ul>
                    </div>
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-[#0a0a0a] border-t border-gray-800 text-right">
                 <p className="font-mono text-xs text-gray-600">Database: {meta?.databaseSize || 0} indexed failures</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
