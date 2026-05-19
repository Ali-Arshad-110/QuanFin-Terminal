import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../config/api';

interface TickerSearchProps {
    onSelect: (symbol: string) => void;
    initialValue?: string;
    placeholder?: string;
    compact?: boolean;
    className?: string;
    clearOnSelect?: boolean;
    trailingIcon?: React.ReactNode;
    onFocus?: () => void;
    autoFocus?: boolean;
    autoClear?: boolean;
}

const TickerSearch: React.FC<TickerSearchProps> = ({
    onSelect,
    initialValue = '',
    placeholder = 'Search...',
    compact = false,
    className = '',
    clearOnSelect = false,
    trailingIcon,
    onFocus,
    autoFocus = false,
    autoClear = false
}) => {
    const [query, setQuery] = useState(initialValue);
    const [suggestions, setSuggestions] = useState<{ symbol: string; name: string }[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto focus
    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
            if (autoClear) {
                setQuery('');
            }
        }
    }, [autoFocus, autoClear]);

    // Debounced search
    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (query.trim().length < 2) {
                setSuggestions([]);
                return;
            }

            // Don't search if query equals initial value (prevent search on mount if provided)
            if (query === initialValue && !isOpen) return;

            setLoading(true);
            try {
                // Use the backend search API
                const res = await axios.get(`${API_BASE}/api/v1/search?q=${encodeURIComponent(query)}&limit=5`);
                if (res.data && res.data.status === 'success') {
                    setSuggestions(res.data.data);
                    if (res.data.data.length > 0) setIsOpen(true);
                }
            } catch (err) {
                console.error("Search failed:", err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query]);

    // Sync query with external initialValue changes
    useEffect(() => {
        setQuery(initialValue);
    }, [initialValue]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (symbol: string) => {
        if (clearOnSelect) {
            setQuery('');
        } else {
            setQuery(symbol); // Update input
        }
        onSelect(symbol); // Notify parent immediately
        setIsOpen(false);
        setSuggestions([]);
    };

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <div className={`flex items-center bg-card border ${isOpen ? 'border-primary ring-1 ring-primary/50' : 'border-border-primary'} rounded-md transition-all shadow-sm`}>
                <div className={`flex items-center justify-center text-text-muted ${compact ? 'pl-1.5' : 'pl-2'}`}>
                    <Search size={compact ? 12 : 14} />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value.toUpperCase());
                        if (!isOpen && e.target.value.length >= 1) setIsOpen(true);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && query.trim()) {
                            if (suggestions.length > 0) {
                                handleSelect(suggestions[0].symbol);
                            } else {
                                handleSelect(query.trim());
                            }
                        }
                    }}
                    onFocus={() => {
                        setQuery(''); // Clear on click/focus as requested
                        if (onFocus) onFocus();
                        if (suggestions.length > 0) setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    className={`w-full bg-transparent border-none outline-none text-text-primary placeholder-text-muted ${compact ? 'py-1 px-1.5 text-[10px]' : 'py-1.5 px-2 text-xs'
                        }`}
                />
                {trailingIcon && (
                    <div className="pr-2 flex items-center justify-center">
                        {trailingIcon}
                    </div>
                )}
                {loading && (
                    <div className="pr-2">
                        <div className="w-3 h-3 border-2 border-border-primary border-t-primary rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-primary rounded-md shadow-2xl z-[60] overflow-hidden max-h-60 overflow-y-auto">
                    {suggestions.map((s) => (
                        <button
                            key={s.symbol}
                            onClick={() => handleSelect(s.symbol)}
                            className="w-full text-left px-3 py-2 hover:bg-primary/10 hover:text-primary transition-colors border-b border-border-primary/30 last:border-0"
                        >
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-text-primary">{s.symbol}</span>
                                {!compact && <span className="text-[10px] text-text-muted truncate">{s.name}</span>}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TickerSearch;
