import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ChartBoard, { ChartBoardHandle } from './components/ChartBoard';
import Toolbar from './components/Toolbar';
import { Candle, ViewTransform, Settings, DrawingSession, SessionInfo, TrendLine } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2 } from 'lucide-react';

const DEFAULT_SETTINGS: Settings = {
  snapToGrid: true,
  continuity: true,
  timeframe: 40,
  priceStep: 10,
  autoAdvance: true,
  continuousDraw: true,
  baseTimeframe: 1,
  activeTimeframe: 1,
  tool: 'draw',
  lineColor: '#3bf6ff',
  theme: 'dark',
  preventPastDrawing: false
};

const DEFAULT_SESSION: SessionInfo = {
  name: 'Untitled',
  pair: 'BTC/USDT',
  baseTimeframe: '1',
  startPrice: 60000,
  startTime: Date.now()
};

export default function App() {
  const chartRef = useRef<ChartBoardHandle>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [trendLines, setTrendLines] = useState<TrendLine[]>([]);
  const [texts, setTexts] = useState<TextElement[]>([]);
  const [history, setHistory] = useState<{ candles: Candle[], trendLines: TrendLine[], texts: TextElement[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [viewTransform, setViewTransform] = useState<ViewTransform>({ x: 100, y: 500, scale: 1 });
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>(DEFAULT_SESSION);
  const [activeCandleIndex, setActiveCandleIndex] = useState<number | null>(null);

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [newSessionData, setNewSessionData] = useState<SessionInfo>(DEFAULT_SESSION);

  // Local state for formatted date/time inputs in New Session modal
  const [newSessionDate, setNewSessionDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [newSessionTime, setNewSessionTime] = useState(() => {
    const d = new Date();
    return d.toTimeString().slice(0, 5);
  });

  const [sessionName, setSessionName] = useState('');
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [saveMode, setSaveMode] = useState<'prompt' | 'new'>('prompt');
  const [trialExpired, setTrialExpired] = useState(false);

  // Trial duration check
  useEffect(() => {
    const trialStart = localStorage.getItem('pricecanvas_trial_start');
    if (!trialStart) {
      localStorage.setItem('pricecanvas_trial_start', Date.now().toString());
    } else {
      const startMs = parseInt(trialStart, 10);
      const nowMs = Date.now();
      const daysElapsed = (nowMs - startMs) / (1000 * 60 * 60 * 24);
      if (daysElapsed > 30) {
        setTrialExpired(true);
      }
    }
  }, []);

  // Undo/Redo logic
  const pushToHistory = useCallback((newCandles: Candle[], newTrendLines: TrendLine[], newTexts: TextElement[]) => {
    if (historyIndex >= 0 && history[historyIndex]) {
      const current = history[historyIndex];
      const isSame = JSON.stringify(current.candles) === JSON.stringify(newCandles) &&
        JSON.stringify(current.trendLines) === JSON.stringify(newTrendLines) &&
        JSON.stringify(current.texts) === JSON.stringify(newTexts);
      if (isSame) return;
    }
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ candles: [...newCandles], trendLines: [...newTrendLines], texts: [...newTexts] });
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const handleHistoryCheckpoint = useCallback((state: { candles: Candle[], trendLines: TrendLine[], texts: TextElement[] }) => {
    pushToHistory(state.candles, state.trendLines, state.texts);
  }, [pushToHistory]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setCandles(prev.candles);
      setTrendLines(prev.trendLines);
      setTexts(prev.texts);
      setHistoryIndex(historyIndex - 1);
    } else if (historyIndex === 0) {
      // Revert completely to empty if we hit the very beginning of the history
      setCandles([]);
      setTrendLines([]);
      setTexts([]);
      setHistoryIndex(-1);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setCandles(next.candles);
      setTrendLines(next.trendLines);
      setTexts(next.texts);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  const handleClear = () => {
    setCandles([]);
    setTrendLines([]);
    setTexts([]);
    pushToHistory([], [], []);
  };

  const handleCreateNew = () => {
    const baseTf = parseInt(newSessionData.baseTimeframe) || 1;
    setCandles([]);
    setTrendLines([]);
    setTexts([]);
    setHistory([{ candles: [], trendLines: [], texts: [] }]);
    setHistoryIndex(0);
    setCurrentSessionId(null);

    // Parse date and time
    const parsedTime = new Date(`${newSessionDate}T${newSessionTime}`).getTime();

    setSessionInfo({
      ...newSessionData,
      startPrice: Number(newSessionData.startPrice) || 60000,
      startTime: isNaN(parsedTime) ? Date.now() : parsedTime
    });
    setSettings(s => ({
      ...s,
      baseTimeframe: baseTf,
      activeTimeframe: baseTf
    }));
    setIsNewModalOpen(false);
  };

  const handleTimeframeChange = (newWidth: number) => {
    const oldWidth = settings.timeframe;
    if (oldWidth === newWidth) return;

    // Calculate the candle index at the center of the screen to use as an anchor
    const centerX = window.innerWidth / 2;
    const centerCandleIndex = (centerX - viewTransform.x) / (oldWidth * viewTransform.scale);

    setSettings(s => ({ ...s, timeframe: newWidth }));

    // Adjust viewTransform.x to keep the center candle index at the same screen position
    setViewTransform(v => ({
      ...v,
      x: centerX - (centerCandleIndex * newWidth * v.scale)
    }));
  };

  const handleSave = async () => {
    if (!sessionName) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sessionName,
          data: JSON.stringify({ candles, trendLines, texts, settings, sessionInfo })
        })
      });
      if (response.ok) {
        const result = await response.json();
        setCurrentSessionId(result.id);
        setIsSaveModalOpen(false);
        setSessionName('');
      }
    } catch (error) {
      console.error('Save failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!currentSessionId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/drawings/${currentSessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sessionInfo.name,
          data: JSON.stringify({ candles, trendLines, texts, settings, sessionInfo })
        })
      });
      if (response.ok) {
        setIsSaveModalOpen(false);
      }
    } catch (error) {
      console.error('Update failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/drawings');
      const data = await response.json();
      setSavedSessions(data);
    } catch (error) {
      console.error('Fetch sessions failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSession = async (id: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/drawings/${id}`);
      const drawing = await response.json();
      const data = JSON.parse(drawing.data);
      setCandles(data.candles || []);
      setTrendLines(data.trendLines || []);
      setTexts(data.texts || []);
      setSettings(data.settings || DEFAULT_SETTINGS);
      setSessionInfo(data.sessionInfo || DEFAULT_SESSION);
      setHistory([{ candles: data.candles || [], trendLines: data.trendLines || [], texts: data.texts || [] }]);
      setHistoryIndex(0);
      setCurrentSessionId(id);
      setIsLoadModalOpen(false);
    } catch (error) {
      console.error('Load failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);

  const startPlayback = () => {
    if (candles.length === 0) return;
    setIsPlaying(true);
    setPlaybackIndex(0);
  };

  useEffect(() => {
    if (isPlaying) {
      const timer = setTimeout(() => {
        if (playbackIndex < candles.length) {
          setPlaybackIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, playbackIndex, candles.length]);

  const displayedCandles = useMemo(() => {
    let base = isPlaying ? candles.slice(0, playbackIndex) : candles;

    const multiplier = settings.activeTimeframe / settings.baseTimeframe;
    if (multiplier <= 1) return base;

    // Aggregate candles
    const aggregated: Candle[] = [];
    const groups = new Map<number, Candle[]>();

    base.forEach(c => {
      const aggIndex = Math.floor(c.index / multiplier);
      if (!groups.has(aggIndex)) groups.set(aggIndex, []);
      groups.get(aggIndex)!.push(c);
    });

    groups.forEach((group, aggIndex) => {
      group.sort((a, b) => a.index - b.index);
      aggregated.push({
        index: aggIndex,
        open: group[0].open,
        high: Math.max(...group.map(c => c.high)),
        low: Math.min(...group.map(c => c.low)),
        close: group[group.length - 1].close
      });
    });

    return aggregated.sort((a, b) => a.index - b.index);
  }, [isPlaying, playbackIndex, candles, settings.activeTimeframe, settings.baseTimeframe]);

  const activeCandle = useMemo(() => {
    if (activeCandleIndex === null) return null;
    return candles.find(c => c.index === activeCandleIndex);
  }, [activeCandleIndex, candles]);

  const isDark = settings.theme === 'dark';

  return (
    <div className={`relative w-screen h-screen font-sans overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#131722] text-[#D1D4DC]' : 'bg-[#FFFFFF] text-[#131722]'}`}>

      {trialExpired && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <div className="max-w-md text-center">
            <div className="mb-6 flex justify-center">
              <span className="font-bold tracking-tight text-5xl drop-shadow-lg text-white">Price<span className="text-emerald-500">Canvas</span></span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">30-Day Trial Expired</h1>
            <p className="text-lg text-white/70 mb-8 leading-relaxed">
              Thank you for trying out PriceCanvas! Your 30-day demo period has now concluded. The complete version is launching soon for just $1/month, featuring unlimited cloud sync, advanced chart indicators, and more.
            </p>
            <button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-not-allowed opacity-80" disabled>
              Full Version Coming Soon
            </button>
          </div>
        </div>
      )}

      <ChartBoard
        ref={chartRef}
        candles={displayedCandles}
        setCandles={setCandles}
        trendLines={trendLines}
        setTrendLines={setTrendLines}
        texts={texts}
        setTexts={setTexts}
        viewTransform={viewTransform}
        setViewTransform={setViewTransform}
        settings={settings}
        sessionInfo={sessionInfo}
        activeCandleIndex={activeCandleIndex}
        setActiveCandleIndex={setActiveCandleIndex}
        onHistoryCheckpoint={handleHistoryCheckpoint}
      />

      <Toolbar
        settings={settings}
        setSettings={setSettings}
        sessionInfo={sessionInfo}
        onNew={() => setIsNewModalOpen(true)}
        onTimeframeChange={handleTimeframeChange}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onSave={() => {
          setIsSaveModalOpen(true);
          setSaveMode('prompt');
        }}
        onLoad={() => {
          setIsLoadModalOpen(true);
          fetchSessions();
        }}
        onExport={() => {
          const dataUrl = chartRef.current?.exportImage();
          if (dataUrl) {
            const link = document.createElement('a');
            link.download = `candlestick-drawing-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
          }
        }}
        onPlay={startPlayback}
        isPlaying={isPlaying}
        canUndo={historyIndex >= 0}
        canRedo={historyIndex < history.length - 1}
      />

      {/* Branding Logo */}
      <div className={`absolute bottom-8 left-4 px-4 py-2 font-bold tracking-tight text-3xl z-0 pointer-events-none drop-shadow-md opacity-40 select-none ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Price<span className="text-emerald-500">Canvas</span>
      </div>

      {/* Drawing Mode Indicator */}
      {settings.activeTimeframe > settings.baseTimeframe && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-500/20 backdrop-blur-md border border-amber-500/30 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-xl"
          >
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] font-bold text-amber-200 uppercase tracking-widest">Viewing Mode: Drawing Disabled</span>
          </motion.div>
        </div>
      )}

      {/* Removed Bottom Pan Slider */}


      {/* OHLC Overlay */}
      <AnimatePresence>
        {activeCandle && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: -60 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#1e1e1e]/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex gap-8 shadow-2xl pointer-events-none"
          >
            <div className="flex flex-col">
              <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Open</span>
              <span className="text-lg font-mono font-medium">{activeCandle.open.toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">High</span>
              <span className="text-lg font-mono font-medium text-emerald-400">{activeCandle.high.toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Low</span>
              <span className="text-lg font-mono font-medium text-red-400">{activeCandle.low.toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Close</span>
              <span className="text-lg font-mono font-medium">{activeCandle.close.toFixed(2)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Drawing Modal */}
      <AnimatePresence>
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">New Drawing</h2>
                <button onClick={() => setIsNewModalOpen(false)} className="p-2 hover:bg-white/5 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <label className="text-[10px] text-white/40 uppercase font-bold mb-1 block">Drawing Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Bullish Reversal"
                    value={newSessionData.name}
                    onChange={e => setNewSessionData(d => ({ ...d, name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase font-bold mb-1 block">Coin Pair</label>
                  <input
                    type="text"
                    placeholder="e.g. BTC/USDT"
                    value={newSessionData.pair}
                    onChange={e => setNewSessionData(d => ({ ...d, pair: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase font-bold mb-1 block">Base Timeframe</label>
                  <select
                    value={newSessionData.baseTimeframe}
                    onChange={e => setNewSessionData(d => ({ ...d, baseTimeframe: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none"
                  >
                    <option value="1">1m</option>
                    <option value="5">5m</option>
                    <option value="15">15m</option>
                    <option value="60">1h</option>
                    <option value="240">4h</option>
                    <option value="1440">1d</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase font-bold mb-1 block">Start Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newSessionData.startPrice}
                    onChange={e => setNewSessionData(d => ({ ...d, startPrice: parseFloat(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] text-white/40 uppercase font-bold mb-1 block">Start Date</label>
                    <input
                      type="date"
                      value={newSessionDate}
                      onChange={e => setNewSessionDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-white/40 uppercase font-bold mb-1 block">Start Time</label>
                    <input
                      type="time"
                      value={newSessionTime}
                      onChange={e => setNewSessionTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={handleCreateNew}
                disabled={!newSessionData.name || !newSessionData.pair}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Create Drawing
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Save Modal */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Save Session</h2>
                <button onClick={() => setIsSaveModalOpen(false)} className="p-2 hover:bg-white/5 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              {currentSessionId && saveMode === 'prompt' ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-white/70 mb-4 leading-relaxed">
                    You are editing an existing drawing. Would you like to update the existing file or save this as a new copy?
                  </p>
                  <button onClick={handleUpdate} disabled={isLoading} className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex justify-center items-center">
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Update Existing'}
                  </button>
                  <button onClick={() => setSaveMode('new')} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors">
                    Save as New Copy
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Session Name"
                    value={sessionName}
                    onChange={e => setSessionName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    autoFocus
                  />
                  <button
                    onClick={handleSave}
                    disabled={!sessionName || isLoading}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Save Drawing'}
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Load Modal */}
      <AnimatePresence>
        {isLoadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Load Session</h2>
                <button onClick={() => setIsLoadModalOpen(false)} className="p-2 hover:bg-white/5 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {isLoading && savedSessions.length === 0 ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-white/20" size={32} />
                  </div>
                ) : savedSessions.length === 0 ? (
                  <div className="text-center py-12 text-white/30 italic">No saved sessions found</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {savedSessions.map(session => (
                      <button
                        key={session.id}
                        onClick={() => loadSession(session.id)}
                        className="flex flex-col items-start p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-colors text-left"
                      >
                        <span className="font-bold text-white">{session.name}</span>
                        <span className="text-[10px] text-white/40 uppercase tracking-wider mt-1">
                          {new Date(session.created_at).toLocaleDateString()} {new Date(session.created_at).toLocaleTimeString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
