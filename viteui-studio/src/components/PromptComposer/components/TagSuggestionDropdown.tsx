import React, { useEffect, useRef } from 'react';
import { TagSuggestion, getCategoryColor, getCategoryName } from '../tagSuggestions/tagHelper';
import { cn } from '../../../lib/utils';

interface TagSuggestionDropdownProps {
    suggestions: TagSuggestion[];
    selectedIndex: number;
    query: string;
    onSelect: (suggestion: TagSuggestion) => void;
    onHover: (index: number) => void;
}

const TagSuggestionDropdown: React.FC<TagSuggestionDropdownProps> = ({
    suggestions,
    selectedIndex,
    query,
    onSelect,
    onHover,
}) => {
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (listRef.current && selectedIndex >= 0) {
            const items = listRef.current.querySelectorAll('.suggestion-item');
            const selectedItem = items[selectedIndex] as HTMLElement;
            if (selectedItem) {
                selectedItem.scrollIntoView({
                    block: 'nearest',
                    behavior: 'auto'
                });
            }
        }
    }, [selectedIndex]);

    if (suggestions.length === 0) return null;

    const renderValue = (value: string) => {
        if (!query) return value.replace(/_/g, ' ');
        const normalizedQuery = query.replace(/ /g, '_');
        const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = value.split(new RegExp(`(${escapedQuery})`, 'gi'));
        return (
            <>
                {parts.map((part, i) => (
                    part.toLowerCase() === normalizedQuery.toLowerCase() ? 
                    <span key={i} className="match">{part.replace(/_/g, ' ')}</span> : 
                    <span key={i}>{part.replace(/_/g, ' ')}</span>
                ))}
            </>
        );
    };

    return (
        <div className="tag-suggestion-dropdown" ref={listRef}>
            {suggestions.map((suggestion, index) => (
                <div
                    key={suggestion.v}
                    className={cn("suggestion-item", { active: index === selectedIndex })}
                    onMouseEnter={() => onHover(index)}
                    onMouseDown={(e) => {
                        e.preventDefault(); // Prevent focus loss from input
                        onSelect(suggestion);
                    }}
                >
                    <span 
                        className="category-dot" 
                        style={{ backgroundColor: getCategoryColor(suggestion.c) }}
                        title={getCategoryName(suggestion.c)}
                    />
                    <span className="value">{renderValue(suggestion.v)}</span>
                    <span className="post-count">
                        {suggestion.p > 1000 ? `${(suggestion.p / 1000).toFixed(1)}k` : suggestion.p}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default TagSuggestionDropdown;
