import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  Trash2,
  Save,
  FolderOpen,
  Settings as SettingsIcon,
  Download,
  Play,
  Pause,
  X,
  Plus,
  Hand,
  MousePointer2,
  TrendingUp,
  Sun,
  Moon,
  Palette,
  Type
} from 'lucide-react';
import { Settings, SessionInfo } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ToolbarProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  sessionInfo: SessionInfo;
  onNew: () => void;
  onTimeframeChange: (newWidth: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSave: () => void;
  onLoad: () => void;
  onExport: () => void;
  onPlay: () => void;
  isPlaying: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  settings,
  setSettings,
  sessionInfo,
  onNew,
  onTimeframeChange,
  onUndo,
  onRedo,
  onClear,
  onSave,
  onLoad,
  onExport,
  onPlay,
  isPlaying,
  canUndo,
  canRedo,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isDark = settings.theme === 'dark';
  const panelBg = isDark ? 'bg-[#1e1e1e]/70 border-white/10' : 'bg-white/70 border-gray-200';
  const btnHover = isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100';
  const primaryText = isDark ? 'text-white' : 'text-gray-900';
  const secondaryText = isDark ? 'text-white/40' : 'text-gray-400';
  const divider = isDark ? 'bg-white/10' : 'bg-gray-200';
  const toolBg = isDark ? 'bg-white/5' : 'bg-gray-100';

  return (
    <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
      {/* Left Bar: Main Actions */}
      <div className="flex gap-2 pointer-events-auto items-center">
        <div className={`${panelBg} backdrop-blur-xl border rounded-xl p-1 flex gap-1 shadow-2xl transition-colors duration-300`}>
          <button
            onClick={onNew}
            className={`p-2 ${btnHover} rounded-lg transition-colors flex items-center gap-2 px-3 border-r ${isDark ? 'border-white/10' : 'border-gray-200'} mr-1`}
            title="New Drawing"
          >
            <Plus size={18} className="text-emerald-500" />
            <span className={`text-xs ${primaryText} font-bold`}>New</span>
          </button>

          <div className={`flex gap-1 ${toolBg} rounded-lg p-0.5`}>
            <button
              onClick={() => setSettings(s => ({ ...s, tool: 'draw' }))}
              className={`p-1.5 rounded-md transition-all ${settings.tool === 'draw' ? 'bg-emerald-500 text-white shadow-lg' : `${secondaryText} ${isDark ? 'hover:text-white' : 'hover:text-gray-900'}`}`}
              title="Draw Tool"
            >
              <MousePointer2 size={16} />
            </button>
            <button
              onClick={() => setSettings(s => ({ ...s, tool: 'line' }))}
              className={`p-1.5 rounded-md transition-all ${settings.tool === 'line' ? 'bg-emerald-500 text-white shadow-lg' : `${secondaryText} ${isDark ? 'hover:text-white' : 'hover:text-gray-900'}`}`}
              title="Trendline Tool"
            >
              <TrendingUp size={16} />
            </button>
            <button
              onClick={() => setSettings(s => ({ ...s, tool: 'text' }))}
              className={`p-1.5 rounded-md transition-all ${settings.tool === 'text' ? 'bg-emerald-500 text-white shadow-lg' : `${secondaryText} ${isDark ? 'hover:text-white' : 'hover:text-gray-900'}`}`}
              title="Text Tool"
            >
              <Type size={16} />
            </button>
            <button
              onClick={() => setSettings(s => ({ ...s, tool: 'hand' }))}
              className={`p-1.5 rounded-md transition-all ${settings.tool === 'hand' ? 'bg-emerald-500 text-white shadow-lg' : `${secondaryText} ${isDark ? 'hover:text-white' : 'hover:text-gray-900'}`}`}
              title="Hand Tool"
            >
              <Hand size={16} />
            </button>
          </div>

          <div className={`w-px h-6 ${divider} my-auto mx-1`} />

          {/* Color Picker for lines/text */}
          <div className="relative flex items-center justify-center p-1.5 rounded-lg group" title="Color">
            <Palette size={18} className={primaryText} />
            <input
              type="color"
              value={settings.lineColor}
              onChange={(e) => setSettings(s => ({ ...s, lineColor: e.target.value }))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-black/20"
              style={{ backgroundColor: settings.lineColor }}
            />
          </div>

          <div className={`w-px h-6 ${divider} my-auto mx-1`} />

          <button
            onClick={onUndo}
            disabled={!canUndo || isPlaying}
            className={`p-2 ${btnHover} rounded-lg disabled:opacity-30 transition-colors`}
            title="Undo"
          >
            <Undo2 size={18} className={primaryText} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo || isPlaying}
            className={`p-2 ${btnHover} rounded-lg disabled:opacity-30 transition-colors`}
            title="Redo"
          >
            <Redo2 size={18} className={primaryText} />
          </button>
          <div className={`w-px h-6 ${divider} my-auto mx-1`} />
          <button
            onClick={onPlay}
            disabled={isPlaying}
            className={`p-2 ${btnHover} rounded-lg disabled:opacity-30 transition-colors group`}
            title="Playback"
          >
            {isPlaying ? <Pause size={18} className="text-emerald-500" /> : <Play size={18} className={primaryText} />}
          </button>
          <div className={`w-px h-6 ${divider} my-auto mx-1`} />
          <button
            onClick={onClear}
            disabled={isPlaying}
            className={`p-2 ${isDark ? 'hover:bg-red-500/20' : 'hover:bg-red-100'} rounded-lg transition-colors group disabled:opacity-30`}
            title="Clear All"
          >
            <Trash2 size={18} className={`${primaryText} group-hover:text-red-500`} />
          </button>
        </div>
      </div>

      {/* Center Bar: Timeframe Selector */}
      <div className="flex flex-col items-center gap-2 pointer-events-auto">
        <div className="bg-[#1e1e1e]/90 backdrop-blur-md border border-white/10 rounded-xl p-1 flex gap-1 shadow-2xl">
          {[
            { label: '1m', val: 1 },
            { label: '5m', val: 5 },
            { label: '15m', val: 15 },
            { label: '1h', val: 60 },
            { label: '4h', val: 240 },
            { label: '1d', val: 1440 },
          ].map((tf) => {
            const isDisabled = tf.val < settings.baseTimeframe;
            return (
              <button
                key={tf.label}
                disabled={isDisabled}
                onClick={() => setSettings(s => ({ ...s, activeTimeframe: tf.val }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${settings.activeTimeframe === tf.val
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : isDisabled
                    ? 'text-white/10 cursor-not-allowed'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
              >
                {tf.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/5">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{sessionInfo.pair}</span>
          <div className="w-1 h-1 rounded-full bg-white/20" />
          <span className="text-[10px] font-medium text-white/60">{sessionInfo.name}</span>
        </div>
      </div>

      {/* Right Bar: Session & Settings */}
      <div className="flex flex-col items-end gap-2 pointer-events-auto relative">
        <div className={`${panelBg} backdrop-blur-md border rounded-xl p-1 flex gap-1 shadow-2xl transition-colors duration-300`}>
          <button
            onClick={() => setSettings(s => ({ ...s, theme: isDark ? 'light' : 'dark' }))}
            className={`p-2 ${btnHover} rounded-lg transition-colors flex items-center gap-2 px-3`}
            title="Toggle Theme"
          >
            {isDark ? <Moon size={18} className="text-emerald-400" /> : <Sun size={18} className="text-amber-500" />}
          </button>

          <div className={`w-px h-6 ${divider} my-auto mx-1`} />
          <button
            onClick={onSave}
            className={`p-2 ${btnHover} rounded-lg transition-colors flex items-center gap-2 px-3`}
            title="Save Session"
          >
            <Save size={18} className={primaryText} />
            <span className={`text-xs ${primaryText} font-medium hidden sm:inline`}>Save</span>
          </button>
          <button
            onClick={onLoad}
            className={`p-2 ${btnHover} rounded-lg transition-colors flex items-center gap-2 px-3`}
            title="Load Session"
          >
            <FolderOpen size={18} className={primaryText} />
            <span className={`text-xs ${primaryText} font-medium hidden sm:inline`}>Load</span>
          </button>
          <div className={`w-px h-6 ${divider} my-auto mx-1`} />
          <button
            onClick={onExport}
            className={`p-2 ${btnHover} rounded-lg transition-colors`}
            title="Export Image"
          >
            <Download size={18} className={primaryText} />
          </button>
          <div className={`w-px h-6 ${divider} my-auto mx-1`} />
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-2 rounded-lg transition-colors ${isSettingsOpen ? 'bg-emerald-500/20 text-emerald-500' : `${btnHover} ${primaryText}`}`}
            title="Settings"
          >
            <SettingsIcon size={18} />
          </button>
        </div>

        {/* Settings Dropdown */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`${isDark ? 'bg-[#1e1e1e]/95 border-white/10' : 'bg-white/95 border-gray-200'} backdrop-blur-xl border rounded-2xl p-4 shadow-2xl w-64 flex flex-col gap-4`}
            >
              <div className="flex justify-between items-center">
                <span className={`text-[10px] font-bold ${secondaryText} uppercase tracking-widest`}>Board Settings</span>
                <button onClick={() => setIsSettingsOpen(false)} className={`${secondaryText} ${isDark ? 'hover:text-white' : 'hover:text-gray-900'}`}>
                  <X size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className={`flex items-center justify-between gap-4 px-2 py-2 ${btnHover} rounded-lg cursor-pointer transition-colors group`}>
                  <span className={`text-xs ${isDark ? 'text-white/70 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-900'}`}>Snap to Grid</span>
                  <input
                    type="checkbox"
                    checked={settings.snapToGrid}
                    onChange={e => setSettings(s => ({ ...s, snapToGrid: e.target.checked }))}
                    className={`w-4 h-4 accent-emerald-500 rounded ${isDark ? 'border-white/10' : 'border-gray-300'}`}
                  />
                </label>
                <label className={`flex items-center justify-between gap-4 px-2 py-2 ${btnHover} rounded-lg cursor-pointer transition-colors group`}>
                  <span className={`text-xs ${isDark ? 'text-white/70 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-900'}`}>Continuity</span>
                  <input
                    type="checkbox"
                    checked={settings.continuity}
                    onChange={e => setSettings(s => ({ ...s, continuity: e.target.checked }))}
                    className={`w-4 h-4 accent-emerald-500 rounded ${isDark ? 'border-white/10' : 'border-gray-300'}`}
                  />
                </label>
                <label className={`flex items-center justify-between gap-4 px-2 py-2 ${btnHover} rounded-lg cursor-pointer transition-colors group`}>
                  <span className={`text-xs ${isDark ? 'text-white/70 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-900'}`}>Continuous Draw</span>
                  <input
                    type="checkbox"
                    checked={settings.continuousDraw}
                    onChange={e => setSettings(s => ({ ...s, continuousDraw: e.target.checked }))}
                    className={`w-4 h-4 accent-emerald-500 rounded ${isDark ? 'border-white/10' : 'border-gray-300'}`}
                  />
                </label>
                <label className={`flex items-center justify-between gap-4 px-2 py-2 ${btnHover} rounded-lg cursor-pointer transition-colors group`}>
                  <span className={`text-xs ${isDark ? 'text-white/70 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-900'}`}>Prevent Past Drawing</span>
                  <input
                    type="checkbox"
                    checked={settings.preventPastDrawing}
                    onChange={e => setSettings(s => ({ ...s, preventPastDrawing: e.target.checked }))}
                    className={`w-4 h-4 accent-emerald-500 rounded ${isDark ? 'border-white/10' : 'border-gray-300'}`}
                  />
                </label>
              </div>

              <div className={`px-2 py-2 border-t ${divider} mt-1`}>
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-[10px] ${secondaryText} uppercase font-bold tracking-wider`}>Candle Width</span>
                  <span className="text-[10px] font-mono text-emerald-500">{settings.timeframe}px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={settings.timeframe}
                  onChange={e => onTimeframeChange(parseInt(e.target.value))}
                  className={`w-full h-1.5 ${isDark ? 'bg-white/10' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer accent-emerald-500`}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Toolbar;
