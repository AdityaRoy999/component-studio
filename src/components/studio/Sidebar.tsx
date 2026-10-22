'use client';

import React from 'react';
import { History, Compass, Clock } from '@/components/ui/icons';
import { ComponentPreset } from '@/data/presets';

interface SidebarProps {
  presets: ComponentPreset[];
  activeComponentId: string;
  onSelectPreset: (preset: ComponentPreset) => void;
  history: ComponentPreset[];
  onSelectHistory: (item: ComponentPreset) => void;
}

export default function Sidebar({
  presets,
  activeComponentId,
  onSelectPreset,
  history,
  onSelectHistory,
}: SidebarProps) {
  return (
    <aside className="w-full h-full flex flex-col justify-between py-6 px-4 overflow-y-auto border-r border-white/[0.06] bg-[#0e0e11]/95">
      <div className="flex flex-col gap-6">
        {/* Presets Section */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 px-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
            <Compass className="w-3.5 h-3.5 text-zinc-400" />
            <span>Prompt Presets</span>
          </div>

          <div className="flex flex-col gap-1.5">
            {presets.map((preset) => {
              const isActive = activeComponentId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => onSelectPreset(preset)}
                  className={`group w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-left text-xs font-semibold transition-all active:scale-[0.98] ${
                    isActive
                      ? 'bg-[#2a2a34] text-white shadow-sm border border-white/[0.08]'
                      : 'text-zinc-400 hover:text-white hover:bg-[#1e1e24]'
                  }`}
                >
                  <span className="truncate">{preset.title}</span>
                  {preset.badge && (
                    <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#262035] text-[#c4b5fd] border border-[#7c5ce9]/20">
                      {preset.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Session Generation History */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
            <div className="flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-zinc-400" />
              <span>Session History</span>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#1e1e24] text-zinc-400">
              {history.length}
            </span>
          </div>

          {history.length === 0 ? (
            <div className="px-4 py-6 rounded-2xl border border-dashed border-white/[0.06] text-center text-xs text-zinc-500 font-sans">
              No generations yet. Submit a prompt below!
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1">
              {history.map((item, idx) => {
                const isActive = activeComponentId === item.id;
                return (
                  <button
                    key={`${item.id}-${idx}`}
                    onClick={() => onSelectHistory(item)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-left text-xs transition-all active:scale-[0.98] ${
                      isActive
                        ? 'bg-[#2a2a34] text-white font-semibold border border-white/[0.08]'
                        : 'text-zinc-400 hover:text-white hover:bg-[#1e1e24]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="pt-4 mt-6 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-zinc-500 px-2">
        <span>Studio Engine</span>
        <span className="text-emerald-400 font-mono text-[11px]">Ready</span>
      </div>
    </aside>
  );
}
