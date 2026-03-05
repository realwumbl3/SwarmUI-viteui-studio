import React, {
    useState,
    useRef,
    useEffect,
    useLayoutEffect,
    useCallback,
    useMemo,
} from "react";
import { cn } from "../../../lib/utils";
import type { Tag } from "../types";
import { getSuggestions, TagSuggestion } from "../tagSuggestions/tagHelper";
import TagSuggestionDropdown from "./TagSuggestionDropdown";
import { useTagSource } from "../contexts/TagSourceContext";

// Individual Tag Component
interface TagComponentProps {
    tag: Tag;
    onUpdate: (updates: Partial<Tag>) => void;
    onRemove: () => void;
    onAddTag: (value?: string, focusNew?: boolean) => void;
    onSelectSuggestion?: (value: string) => void;
    shouldFocus?: boolean;
}

const TagComponent = React.forwardRef<HTMLInputElement, TagComponentProps>(
    ({ tag, onUpdate, onRemove, onAddTag, onSelectSuggestion, shouldFocus }, ref) => {
        const { tagSource } = useTagSource();
        const [inputValue, setInputValue] = useState(tag.value);
        const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
        const [selectedIndex, setSelectedIndex] = useState(0);
        const [showSuggestions, setShowSuggestions] = useState(false);
        const inputRef = useRef<HTMLInputElement>(null);
        const measureRef = useRef<HTMLSpanElement>(null);
        const prevTagValueRef = useRef<string>(tag.value);

        const adjustInputWidth = useCallback((value: string) => {
            if (measureRef.current && inputRef.current) {
                measureRef.current.textContent = value || "placeholder";
                const width = measureRef.current.offsetWidth + 4;
                const clampedWidth = Math.max(40, width);
                inputRef.current.style.width = `${clampedWidth}px`;
            }
        }, []);

        // Forward the ref to the input element
        React.useImperativeHandle(ref, () => inputRef.current!);

        // Update input value when tag.value changes externally (not from user input)
        useEffect(() => {
            if (tag.value !== prevTagValueRef.current && tag.value !== inputValue) {
                prevTagValueRef.current = tag.value;
                requestAnimationFrame(() => {
                    setInputValue(tag.value);
                });
            }
        }, [tag.value, inputValue]);

        useEffect(() => {
            if (shouldFocus && inputRef.current) {
                setTimeout(() => inputRef.current?.focus(), 0);
            }
        }, [shouldFocus]);

        useLayoutEffect(() => {
            adjustInputWidth(inputValue);
        }, [adjustInputWidth, inputValue]);

        const handleInputChange = (value: string) => {
            setInputValue(value);
            onUpdate({ value });
            if (value) {
                const newSuggestions = getSuggestions(value, tagSource);
                setSuggestions(newSuggestions);
                setSelectedIndex(0);
                setShowSuggestions(true);
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        };

        const handleSelectSuggestion = (suggestion: TagSuggestion) => {
            const newValue = suggestion.v;
            setInputValue(newValue);
            
            if (onSelectSuggestion) {
                onSelectSuggestion(newValue);
            } else {
                onUpdate({ value: newValue });
                onAddTag("", true);
            }
            
            setShowSuggestions(false);
            setSuggestions([]);
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
            // When typing quickly, we might need to get suggestions right now
            // to see if we should intercept Enter
            if (showSuggestions) {
                // If we have suggestions in state, use them
                if (suggestions.length > 0) {
                    if (e.key === "ArrowDown") {
                        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
                        e.preventDefault();
                        return;
                    } else if (e.key === "ArrowUp") {
                        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
                        e.preventDefault();
                        return;
                    } else if (e.key === "Enter" || e.key === "Tab") {
                        const selectedSuggestion = suggestions[selectedIndex];
                        if (selectedSuggestion) {
                            handleSelectSuggestion(selectedSuggestion);
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                        }
                    } else if (e.key === "Escape") {
                        setShowSuggestions(false);
                        e.preventDefault();
                        return;
                    }
                } else if (e.key === "Enter" && inputValue.trim() !== "") {
                    // Quick check for suggestions if state is lagging
                    const quickSuggestions = getSuggestions(inputValue, tagSource);
                    if (quickSuggestions.length > 0) {
                        handleSelectSuggestion(quickSuggestions[0]);
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                }
            }

            if (e.key === "Enter") {
                // If we're here, no suggestion was accepted
                onAddTag("", true); 
                e.preventDefault();
                e.stopPropagation();
            } else if (e.key === "Backspace" && inputValue === "") {
                onRemove();
                e.preventDefault();
            } else if (e.altKey && e.key === "ArrowUp") {
                const newWeight = Math.min(1.7, Number((tag.weight + 0.05).toFixed(2)));
                onUpdate({ weight: newWeight });
                e.preventDefault();
            } else if (e.altKey && e.key === "ArrowDown") {
                const newWeight = Math.max(-1.7, Number((tag.weight - 0.05).toFixed(2)));
                onUpdate({ weight: newWeight });
                e.preventDefault();
            }
        };

        const isLora = tag.value.trim().startsWith("<") && tag.value.trim().endsWith(">");
        const weightClass = tag.weight === 1 ? "neutral" : tag.weight > 1 ? "positive" : "negative";

        return (
            <div
                className={cn("tag", weightClass, { lora: isLora })}
                style={{ "--weight": tag.weight } as React.CSSProperties}
                onBlur={(e) => {
                    // Hide suggestions if clicking outside the tag
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setShowSuggestions(false);
                    }
                }}
            >
                <div className="weight-indicator">{tag.weight}</div>
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (inputValue) setShowSuggestions(true);
                    }}
                    placeholder="Enter tag..."
                    style={{ fontSize: "13px" }}
                />
                {showSuggestions && suggestions.length > 0 && (
                    <TagSuggestionDropdown
                        suggestions={suggestions}
                        selectedIndex={selectedIndex}
                        query={inputValue}
                        onSelect={handleSelectSuggestion}
                        onHover={setSelectedIndex}
                    />
                )}
                <button className="remove" onClick={onRemove}>
                    X
                </button>
                {/* Hidden element for measuring text width */}
                <span
                    ref={measureRef}
                    style={{
                        position: "absolute",
                        visibility: "hidden",
                        whiteSpace: "pre",
                        fontSize: "13px",
                        fontFamily: "inherit",
                    }}
                />
            </div>
        );
    }
);

TagComponent.displayName = "TagComponent";

export default TagComponent;
