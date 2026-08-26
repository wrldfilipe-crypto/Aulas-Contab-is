import React, { useState, useEffect } from 'react';
import { HelpCircle, BookOpen, AlertTriangle, Edit3, Sparkles, ArrowRight } from 'lucide-react';
import { getSmartSuggestions, SmartSuggestion } from '../lib/memoryManager';

interface SmartSuggestionsWidgetProps {
  onSelectSuggestion: (suggestion: SmartSuggestion) => void;
}

export const SmartSuggestionsWidget: React.FC<SmartSuggestionsWidgetProps> = ({ onSelectSuggestion }) => {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);

  useEffect(() => {
    const loaded = getSmartSuggestions();
    setSuggestions(loaded);
  }, []);

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div id="sidebar-smart-suggestions" className="mx-3 my-2 p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-slate-200 text-xs space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        <Sparkles className="w-3 h-3 text-amber-400" />
        <span>Sugerido para si</span>
      </div>

      <div className="space-y-1.5">
        {suggestions.map((sug) => {
          let IconComponent = ArrowRight;
          if (sug.icon === 'HelpCircle') IconComponent = HelpCircle;
          if (sug.icon === 'BookOpen') IconComponent = BookOpen;
          if (sug.icon === 'AlertTriangle') IconComponent = AlertTriangle;
          if (sug.icon === 'Edit3') IconComponent = Edit3;

          return (
            <button
              key={sug.id}
              onClick={() => onSelectSuggestion(sug)}
              className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-700/80 transition-all group"
            >
              <IconComponent className={`w-3.5 h-3.5 shrink-0 ${
                sug.color === 'amber' ? 'text-amber-400' : 'text-cyan-400'
              }`} />
              <span className="text-[11px] font-medium text-slate-300 group-hover:text-white truncate">
                {sug.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SmartSuggestionsWidget;
