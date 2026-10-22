'use client';

import React from 'react';
import { Sliders, RotateCcw } from '@/components/ui/icons';
import { PropSchemaItem } from '@/data/presets';
import StudioColorPicker from './StudioColorPicker';

interface PropsCustomizerProps {
  propsSchema: PropSchemaItem[];
  propValues: Record<string, any>;
  onChangeProp: (name: string, value: any) => void;
  onResetDefaults: () => void;
}

export default function PropsCustomizer({
  propsSchema,
  propValues,
  onChangeProp,
  onResetDefaults,
}: PropsCustomizerProps) {
  return (
    <aside className="w-full h-full flex flex-col py-6 px-5 overflow-y-auto border-l border-white/[0.06] bg-[#0e0e11]/95">
      {/* Header with Bubbly Reset Button */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#202026] flex items-center justify-center text-zinc-300">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
            Customize
          </h3>
        </div>

        <button
          onClick={onResetDefaults}
          className="h-8 px-3 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-[#1e1e24] hover:bg-[#282832] border border-white/[0.06] active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
          title="Reset all props to default configuration"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Dynamic Prop Controls Table */}
      <div className="flex flex-col gap-5 pt-4">
        {propsSchema.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500 font-sans">
            No configurable props for this component.
          </div>
        ) : (
          propsSchema.map((item) => {
            const currentVal = propValues[item.name] !== undefined ? propValues[item.name] : item.defaultValue;

            return (
              <div key={item.name} className="flex flex-col gap-2 p-3 rounded-2xl bg-[#141417] border border-white/[0.05]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-200">
                    {item.name}
                  </label>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#1e1e24] text-zinc-400">
                    {item.type}
                  </span>
                </div>

                {item.description && (
                  <p className="text-[11px] text-zinc-400 leading-tight">
                    {item.description}
                  </p>
                )}

                {/* String Input */}
                {item.type === 'string' && (
                  <input
                    type="text"
                    value={currentVal ?? ''}
                    onChange={(e) => onChangeProp(item.name, e.target.value)}
                    className="w-full bg-[#1b1b22] border border-white/[0.06] rounded-xl px-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-white/[0.2] font-mono transition-colors"
                  />
                )}

                {/* Number Slider */}
                {item.type === 'number' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-500 text-[11px]">VALUE</span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#202026] border border-white/[0.06] text-white font-bold text-xs">
                        {currentVal}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={item.min ?? 0}
                      max={item.max ?? 100}
                      step={item.step ?? 1}
                      value={currentVal ?? item.defaultValue ?? 0}
                      onChange={(e) => onChangeProp(item.name, Number(e.target.value))}
                      className="w-full accent-white h-2 bg-[#202026] rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                      <span>{item.min ?? 0}</span>
                      <span>{item.max ?? 100}</span>
                    </div>
                  </div>
                )}

                {/* Boolean Switch (bubbly pill switch like Image 5) */}
                {item.type === 'boolean' && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs font-medium text-zinc-300">
                      {currentVal ? 'Enabled' : 'Disabled'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onChangeProp(item.name, !currentVal)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentVal ? 'bg-white' : 'bg-[#222228]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-md ring-0 transition duration-200 ease-in-out ${
                          currentVal ? 'translate-x-5 bg-zinc-950' : 'translate-x-0 bg-zinc-500'
                        }`}
                      />
                    </button>
                  </div>
                )}

                {/* Color Swatch Picker */}
                {item.type === 'color' && (
                  <StudioColorPicker label={item.name} value={String(currentVal??'#ffffff')} onChange={next=>onChangeProp(item.name,next)}/>
                )}

                {/* Select Dropdown */}
                {item.type === 'select' && item.options && (
                  <select
                    value={currentVal ?? item.options[0]}
                    onChange={(e) => onChangeProp(item.name, e.target.value)}
                    className="w-full bg-[#1b1b22] border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-white/[0.2] font-mono transition-colors"
                  >
                    {item.options.map((opt) => (
                      <option key={opt} value={opt} className="bg-[#141417] text-zinc-200">
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
