import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, UserCheck, X, ChevronDown, Check, Building2, BookOpen } from 'lucide-react';
import { UserProfile } from '../../types';

interface TrainerSearchAutocompleteProps {
  trainers: UserProfile[];
  selectedTrainerId: string;
  onSelectTrainer: (trainerId: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  label?: string;
}

export const TrainerSearchAutocomplete: React.FC<TrainerSearchAutocompleteProps> = ({
  trainers,
  selectedTrainerId,
  onSelectTrainer,
  placeholder = 'Type name (e.g. "es", "alex", "priya") or ID...',
  className = '',
  compact = false,
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Selected trainer object
  const selectedTrainer = useMemo(() => {
    return trainers.find(t => t.uid === selectedTrainerId) || trainers[0];
  }, [trainers, selectedTrainerId]);

  // Filter trainers based on search query
  const filteredTrainers = useMemo(() => {
    if (!searchTerm.trim()) {
      return trainers;
    }
    const term = searchTerm.toLowerCase().trim();
    return trainers.filter(t => 
      t.fullName?.toLowerCase().includes(term) ||
      t.employeeId?.toLowerCase().includes(term) ||
      t.department?.toLowerCase().includes(term) ||
      t.designation?.toLowerCase().includes(term) ||
      t.subject?.toLowerCase().includes(term) ||
      t.companyEmail?.toLowerCase().includes(term)
    );
  }, [trainers, searchTerm]);

  // Handle outside click to close popover
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredTrainers.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredTrainers.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTrainers[highlightedIndex]) {
        handleSelect(filteredTrainers[highlightedIndex].uid);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (id: string) => {
    onSelectTrainer(id);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Helper to highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    const regex = new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <span key={i} className="bg-amber-200 text-amber-900 font-extrabold px-0.5 rounded-xs">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1">
          {label}
        </label>
      )}

      {/* Trigger & Search Input Bar */}
      <div 
        className={`flex items-center gap-2 rounded-xl border bg-white transition-all shadow-2xs ${
          isOpen 
            ? 'border-sky-500 ring-2 ring-sky-100' 
            : 'border-slate-300 hover:border-sky-400'
        } ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'}`}
      >
        <Search className={`shrink-0 text-slate-400 ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
        
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setHighlightedIndex(0);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTrainer ? `${selectedTrainer.fullName} (${selectedTrainer.employeeId})` : placeholder}
          className={`w-full bg-transparent font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden ${
            compact ? 'text-xs' : 'text-sm'
          }`}
          aria-label="Search and select assigned trainer"
        />

        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              inputRef.current?.focus();
            }}
            className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Toggle dropdown list"
        >
          <ChevronDown className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
        </button>
      </div>

      {/* Dropdown Suggestions Popover */}
      {isOpen && (
        <div 
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header count info */}
          <div className="flex items-center justify-between px-2.5 py-1 text-2xs font-semibold text-slate-400 border-b border-slate-100 mb-1">
            <span>
              {searchTerm 
                ? `Matching "${searchTerm}" (${filteredTrainers.length} found)`
                : `All Assigned Trainers (${trainers.length})`}
            </span>
            <span className="text-2xs text-sky-600">Type 2+ letters to filter</span>
          </div>

          {filteredTrainers.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              <p className="font-semibold text-slate-700">No matching trainers found</p>
              <p className="text-2xs text-slate-400 mt-0.5">Try searching by name, ID (e.g. NW1095), or department</p>
            </div>
          ) : (
            filteredTrainers.map((trainer, index) => {
              const isSelected = trainer.uid === selectedTrainerId;
              const isHighlighted = index === highlightedIndex;

              return (
                <button
                  key={trainer.uid}
                  type="button"
                  onClick={() => handleSelect(trainer.uid)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full flex items-center justify-between rounded-lg p-2 text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-sky-50 font-bold text-sky-950 border border-sky-200/80'
                      : isHighlighted
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs ${
                      isSelected ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {trainer.fullName?.slice(0, 2).toUpperCase() || 'TR'}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 truncate">
                          {highlightMatch(trainer.fullName, searchTerm)}
                        </span>
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-2xs font-extrabold text-slate-700 border border-slate-200">
                          {highlightMatch(trainer.employeeId, searchTerm)}
                        </span>
                      </div>
                      <div className="text-2xs text-slate-500 truncate flex items-center gap-2 mt-0.5">
                        <span className="font-medium text-sky-700">{trainer.department || 'Training'}</span>
                        <span>•</span>
                        <span className="truncate">{trainer.designation || trainer.subject}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
                    {isSelected && (
                      <span className="flex items-center gap-1 rounded-md bg-sky-100 px-1.5 py-0.5 text-2xs font-bold text-sky-800">
                        <Check className="h-3 w-3" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
