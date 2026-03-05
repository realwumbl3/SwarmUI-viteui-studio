import { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

const NumberSelector = ({
  value,
  onChange,
  min = 1,
  max = 100,
  step = 1,
  className = "",
  inputClassName = "",
  disabled = false,
  label,
  suffix,
  disable_scroll = false,
  ctrl_multiplier = 5,
  shift_multiplier = 10
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  label?: string;
  suffix?: string;
  disable_scroll?: boolean;
  ctrl_multiplier?: number;
  shift_multiplier?: number;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const getStepDecimalPlaces = (num: number): number => {
    const stepString = num.toString();
    const [mantissa, exponentPart] = stepString.split('e-');
    const decimalPart = mantissa.split('.')[1] ?? '';
    const exponent = exponentPart ? parseInt(exponentPart, 10) : 0;
    return Math.max(0, decimalPart.length + exponent);
  };

  const decimalPlaces = getStepDecimalPlaces(step);
  const precisionFactor = decimalPlaces > 0 ? 10 ** decimalPlaces : 1;

  const clamp = (num: number) => Math.max(min, Math.min(max, num));

  const roundToStep = (num: number): number => {
    if (decimalPlaces === 0) return num;
    return Math.round(num * precisionFactor) / precisionFactor;
  };

  const adjustValue = (delta: number): number => clamp(roundToStep(value + delta));

  const formatDisplayValue = (num: number): string => roundToStep(num).toString();

  const displayValue = formatDisplayValue(value);

  // Handle scroll wheel
  useEffect(() => {
    const container = containerRef.current;
    if (!container || disable_scroll) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      let currentStep = step;
      if (e.ctrlKey) {
        currentStep = step * ctrl_multiplier;
      } else if (e.shiftKey) {
        currentStep = step * shift_multiplier;
      }

      const delta = e.deltaY > 0 ? -currentStep : currentStep;
      const newValue = adjustValue(delta);
      if (newValue !== value) {
        onChange(newValue);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [value, min, max, step, onChange, disable_scroll, ctrl_multiplier, shift_multiplier]);

  const increment = (): void => onChange(adjustValue(step));

  const decrement = (): void => onChange(adjustValue(-step));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const inputValue = parseFloat(e.target.value);
    if (!isNaN(inputValue)) {
      const normalizedValue = roundToStep(inputValue);
      onChange(clamp(normalizedValue));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (disabled) return;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      increment();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      decrement();
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(max);
    } else if (/^[0-9]$/.test(e.key)) {
      // Allow number input - focus the input element for typing
      e.preventDefault();
      inputRef.current?.focus();
      // If input is empty or has selection, replace it; otherwise append
      if (inputRef.current) {
        const input = inputRef.current;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const currentValue = input.value;
        const newValue = currentValue.slice(0, start) + e.key + currentValue.slice(end);
        input.value = newValue;
        input.setSelectionRange(start + 1, start + 1);
        handleInputChange({ target: input } as React.ChangeEvent<HTMLInputElement>);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      return;
    }
  };

  const valueLength = Math.max(1, displayValue.length);

  return (
    <div
      ref={containerRef}
      role="spinbutton"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
      className={cn(
        "relative inline-flex flex-col text-sm bg-studio-surface border border-studio-border rounded transition-all duration-200 w-fit",
        "focus-within:ring-2 focus-within:ring-studio-accent focus-within:ring-offset-2 focus-within:ring-offset-studio-surface outline-none",
        isFocused && "ring-2 ring-studio-accent ring-offset-2 ring-offset-studio-surface",
        className
      )}
    >
      <div className="flex items-stretch">
        <div className="flex flex-col h-full w-4 bg-studio-surface border-r rounded-l overflow-hidden">
          <button
            type="button"
            onClick={increment}
            disabled={disabled || value >= max}
            tabIndex={-1}
            className={cn(
              "flex-1 flex items-center justify-center transition-all duration-150",
              "hover:bg-studio-accent/20 active:bg-studio-accent/40",
              "disabled:opacity-20 disabled:cursor-not-allowed focus:outline-none"
            )}
            title="Increase"
          >
            <ChevronUp size={14} className="text-studio-textSecondary hover:text-studio-accent transition-colors" />
          </button>

          <div className="h-[1px] w-full bg-studio-border" />

          <button
            type="button"
            onClick={decrement}
            disabled={disabled || value <= min}
            tabIndex={-1}
            className={cn(
              "flex-1 flex items-center justify-center transition-all duration-150",
              "hover:bg-studio-accent/20 active:bg-studio-accent/40",
              "disabled:opacity-20 disabled:cursor-not-allowed focus:outline-none"
            )}
            title="Decrease"
          >
            <ChevronDown size={14} className="text-studio-textSecondary hover:text-studio-accent transition-colors" />
          </button>
        </div>

        <div className="grid grid-flow-col auto-cols-max items-center gap-1">
          <input
            ref={inputRef}
            type="number"
            value={displayValue}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={(e) => {
              if (!containerRef.current?.contains(e.relatedTarget as Node)) {
                setIsFocused(false);
              }
            }}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            tabIndex={-1}
            aria-hidden="true"
            className={cn(
              "col-start-1 row-start-1 w-auto min-w-[3ch] px-1 bg-transparent text-right text-base font-bold text-white appearance-none [appearance:textfield]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              "focus:outline-none focus:ring-0 transition-all duration-200 placeholder:text-studio-textMuted",
              inputClassName
            )}
            size={valueLength}
            style={{ width: `${valueLength + 1}ch` }}
          />
          {label && (
            <div className="col-start-1 row-start-1 self-end justify-self-end text-[9px] leading-none pr-1 pl-1 text-studio-textSecondary font-medium whitespace-nowrap pointer-events-none translate-y-[1px]">
              {label}
            </div>
          )}
          {suffix && (
            <span className="text-[10px] font-semibold text-studio-textMuted leading-none">
              {suffix}
            </span>
          )}
        </div>
      </div>


    </div>
  );
};

export default NumberSelector;
