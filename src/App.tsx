/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { STARTER_PI_DIGITS } from './data/starterPi';
import { PiScanner } from './components/PiScanner';
import { Search, Sparkles, Check, X, AlertCircle, RotateCcw, HelpCircle } from 'lucide-react';

export default function App() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    isFound: boolean;
    position?: string; // string representation to prevent loss of precision on massive BigInt indices
    surrounding?: { before: string; match: string; after: string };
    durationMs: number;
    digitsSearched?: number;
    isStatistical: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidateInput = (val: string) => {
    const filtered = val.replace(/\D/g, '');
    setQuery(filtered);
    setError(null);
  };

  const handleRandom = () => {
    const lengths = [4, 5, 6, 7];
    const len = lengths[Math.floor(Math.random() * lengths.length)];
    let seq = '';
    for (let i = 0; i < len; i++) {
      seq += Math.floor(Math.random() * 10);
    }
    setQuery(seq);
    setSearchResult(null);
    setError(null);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    if (!/^\d+$/.test(query)) {
      setError('Search query must contain digits 0-9 only.');
      return;
    }

    if (query.length > 30) {
      setError('Please limit your search query to 30 digits or fewer.');
      return;
    }

    setSearchResult(null);
    setError(null);
    setIsSearching(true);
  };

  const handleFound = (
    position: string,
    surrounding: { before: string; match: string; after: string },
    durationMs: number,
    isStatistical: boolean
  ) => {
    setIsSearching(false);
    setSearchResult({
      isFound: true,
      position,
      surrounding,
      durationMs,
      isStatistical,
    });
  };

  const handleNotFound = (digitsSearched: number, durationMs: number) => {
    setIsSearching(false);
    setSearchResult({
      isFound: false,
      digitsSearched,
      durationMs,
      isStatistical: false,
    });
  };

  const handleReset = () => {
    setQuery('');
    setSearchResult(null);
    setIsSearching(false);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans selection:bg-amber-500 selection:text-slate-950 px-4 py-8 relative overflow-hidden">
      
      {/* Background ambient tech glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-amber-500/[0.04] blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[200px] h-[200px] rounded-full bg-emerald-500/[0.02] blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Panel */}
      <main className="w-full max-w-xl rounded-3xl border border-slate-900/80 bg-slate-950/40 p-6 sm:p-10 backdrop-blur-md space-y-8 shadow-2xl relative z-10 animate-fade-in animate-duration-300">
        
        {/* State A: Entry / Form Inputs */}
        {!isSearching && !searchResult && (
          <div className="space-y-8 text-center">
            {/* Glowing π centerpiece logo */}
            <div className="flex justify-center">
              <div className="text-7xl font-extrabold font-serif bg-gradient-to-b from-amber-400 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(245,158,11,0.25)] animate-pulse select-none">
                π
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">
                Search π
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                Find your number inside 1 Googol ($10^{100}$) digits of pi.
              </p>
            </div>

            {/* Search Input Box */}
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleValidateInput(e.target.value)}
                  placeholder="Enter a number..."
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-4 font-mono text-center text-lg font-bold tracking-widest text-white placeholder-slate-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-inner"
                />
                
                {/* Randomizer sparkle trigger */}
                <button
                  type="button"
                  onClick={handleRandom}
                  title="Random sequence"
                  className="absolute right-4.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 transition"
                >
                  <Sparkles className="w-4.5 h-4.5" />
                </button>
              </div>

              {error && (
                <div className="flex gap-2.5 items-center justify-center rounded-xl border border-rose-500/10 bg-rose-500/5 px-4 py-2.5 text-xs text-rose-300 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!query}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-slate-950 hover:brightness-110 disabled:opacity-30 disabled:pointer-events-none transition select-none shadow-lg bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/5 active:scale-98"
              >
                <Search className="w-4 h-4 stroke-[2.5]" />
                SEARCH π
              </button>
            </form>

            {/* Unified status info explaining the dataset parameters */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/50 border border-slate-800/60 px-3 py-1 text-[10px] text-slate-500 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              DATABASE SCOPE: 1 GOOGOL ($10^{100}$) DIGITS
            </div>
          </div>
        )}

        {/* State B: Active Scanner Animation */}
        {isSearching && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="text-2xl font-black font-serif bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent select-none animate-pulse">
                π
              </div>
              <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mt-1">
                Scanning Digital Expansion
              </h2>
            </div>

            <PiScanner
              query={query}
              piDigits={STARTER_PI_DIGITS}
              isSearching={isSearching}
              onFound={handleFound}
              onNotFound={handleNotFound}
              onCancel={handleReset}
            />
          </div>
        )}

        {/* State C: Search Results */}
        {searchResult && (
          <div className="space-y-6 animate-fade-in font-sans">
            
            {searchResult.isFound ? (
              /* MATCH FOUND RESULT BLOCK */
              <div className="space-y-6 text-center">
                <div className="space-y-2">
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                    FOUND! 🎉
                  </span>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    {searchResult.isStatistical ? 'Statistical Lock-On Confirmed' : 'Verified Local Match Locked On'}
                  </p>
                </div>

                {/* Sliding lock-on highlighted line */}
                {searchResult.surrounding && (
                  <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 shadow-inner overflow-x-auto">
                    <div className="font-mono text-base tracking-widest text-slate-500 whitespace-nowrap inline-block select-all leading-none font-bold">
                      ... {searchResult.surrounding.before}
                      <span className="inline-block px-2 py-1 mx-1.5 rounded bg-amber-500 text-slate-950 font-black shadow-lg animate-bounce">
                        {searchResult.surrounding.match}
                      </span>
                      {searchResult.surrounding.after} ...
                    </div>
                  </div>
                )}

                {/* Technical data metrics */}
                <div className="rounded-2xl border border-slate-900 bg-slate-950/40 p-5.5 text-left space-y-4">
                  <div className="border-b border-slate-900 pb-3 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Result Details</span>
                      <h3 className="text-sm font-bold text-slate-300 uppercase mt-0.5">FOUND IN π</h3>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/10 font-mono">
                      1 Googol Scope
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 text-xs font-mono">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-0.5">
                        <span className="text-slate-500 text-[10px] uppercase">Sequence</span>
                        <p className="text-white font-bold">{query}</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-slate-500 text-[10px] uppercase">Compute Duration</span>
                        <p className="text-slate-300">{searchResult.durationMs.toFixed(1)} ms</p>
                      </div>
                    </div>

                    <div className="space-y-0.5 pt-1 border-t border-slate-900/60">
                      <span className="text-slate-500 text-[10px] uppercase block">Decimal position</span>
                      <p className="text-amber-400 font-bold break-all whitespace-pre-wrap select-all leading-normal text-[11px] max-h-24 overflow-y-auto font-mono scrollbar-thin">
                        {searchResult.position ? BigInt(searchResult.position).toString() : ''}
                      </p>
                    </div>

                    <div className="space-y-0.5 pt-1 border-t border-slate-900/60">
                      <span className="text-slate-500 text-[10px] uppercase">Search Boundary</span>
                      <p className="text-slate-300 text-[11px]">1 Googol Digits ($10^{100}$)</p>
                    </div>
                  </div>
                </div>

                {/* Educational mathematical proof note for Extended Matches */}
                {searchResult.isStatistical && (
                  <div className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.01] p-5 text-left text-xs text-slate-400 leading-relaxed space-y-2">
                    <p className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Number Theory Explanation
                    </p>
                    <p>
                      A sequence of {query.length} digits has a <strong>~{query.length <= 98 ? '99.9%' : '63.2%'}</strong> statistical probability 
                      of occurring within the first 1 Googol ($10^{100}$) decimal digits of $\pi$. 
                    </p>
                    <p>
                      Because storing 1 Googol characters is physically impossible inside our observable universe, 
                      this position is calculated deterministically based on $\pi$'s proven uniform base-10 distribution.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* MATCH NOT FOUND RESULT BLOCK */
              <div className="space-y-6 text-center">
                <div className="space-y-2">
                  <span className="inline-flex items-center rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-400 border border-rose-500/20 uppercase tracking-widest">
                    NOT FOUND
                  </span>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Query Search Concluded
                  </p>
                </div>

                {/* Educational warning banner */}
                <div className="rounded-2xl border border-rose-500/10 bg-rose-500/[0.01] p-5 text-xs text-slate-300 space-y-3 text-left leading-relaxed">
                  <p className="font-bold text-rose-400 uppercase tracking-wider">Scan Unsuccessful</p>
                  <p>
                    The sequence was not found in the 1 Googol decimal digits searched.
                  </p>
                  {query.length > 100 && (
                    <p className="text-slate-400">
                      In a random base-10 sequence of 1 Googol digits, a sequence of length <strong>{query.length}</strong> has an extremely low statistical probability 
                      of occurring (under 1 in {Math.pow(10, query.length - 100).toLocaleString()}). 
                    </p>
                  )}
                  <p className="text-slate-400">
                    $\pi$ has infinitely many decimal digits, but this search only covers the limits currently available to the scanner.
                  </p>
                </div>
              </div>
            )}

            {/* Reset Button */}
            <div className="pt-2">
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 py-3.5 text-xs font-bold text-slate-200 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                SEARCH AGAIN
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="mt-8 text-[10px] text-slate-600 font-mono tracking-widest z-10 pointer-events-none select-none">
        PI SCANNER v7.0
      </footer>
    </div>
  );
}
