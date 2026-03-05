import { createContext, useContext, useRef } from "react";
import { createStore, useStore } from "zustand";
import type { SetStateAction } from "react";

type PanOffset = {
    x: number;
    y: number;
};

interface CanvasSyncState {
    zoom: number;
    panOffset: PanOffset;
    fitToScreen: boolean;
    showGrid: boolean;
    showMask: boolean;
    showBorder: boolean;
    maskBorderMode: boolean;
    brushSize: number;
    drawingMode: string;
    brushHardness: number;
    fillTarget: string;
    fillTolerance: number;
    fillOverfill: number;
}

const defaultCanvasSyncState: CanvasSyncState = {
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    fitToScreen: true,
    showGrid: false,
    showMask: true,
    showBorder: true,
    maskBorderMode: false,
    brushSize: 16,
    drawingMode: "brush",
    brushHardness: 1,
    fillTarget: "image",
    fillTolerance: 32,
    fillOverfill: 0,
};

type CanvasSyncSetters = {
    [K in keyof CanvasSyncState as `set${Capitalize<K>}`]: (value: SetStateAction<CanvasSyncState[K]>) => void;
};

type CanvasSyncStore = CanvasSyncState & CanvasSyncSetters & {
    syncState: (state: Partial<CanvasSyncState>) => void;
};

const resolveActionValue = <T,>(current: T, value: SetStateAction<T>): T =>
    typeof value === "function" ? (value as (prev: T) => T)(current) : value;

// Create setters with proper typing
const createSetters = (set: any): CanvasSyncSetters => {
    const setters = {} as CanvasSyncSetters;

    (Object.keys(defaultCanvasSyncState) as Array<keyof CanvasSyncState>).forEach((key) => {
        const setterName = `set${key.charAt(0).toUpperCase()}${key.slice(1)}` as keyof CanvasSyncSetters;
        setters[setterName] = ((value: SetStateAction<CanvasSyncState[typeof key]>) => {
            set((state: CanvasSyncState) => ({
                [key]: resolveActionValue(state[key], value)
            }));
        }) as any;
    });

    return setters;
};

const createCanvasSyncStore = () => createStore<CanvasSyncStore>((set) => ({
    ...defaultCanvasSyncState,
    ...createSetters(set),
    syncState: (payload: Partial<CanvasSyncState>) => {
        set((state) => ({ ...state, ...payload }));
    },
}));

type CanvasSyncStoreApi = ReturnType<typeof createCanvasSyncStore>;

const CanvasSyncContext = createContext<CanvasSyncStoreApi | null>(null);

export const CanvasSyncProvider = ({ children }: { children: React.ReactNode }) => {
    const storeRef = useRef<CanvasSyncStoreApi>();
    if (!storeRef.current) {
        storeRef.current = createCanvasSyncStore();
    }

    return (
        <CanvasSyncContext.Provider value={storeRef.current}>
            {children}
        </CanvasSyncContext.Provider>
    );
};

export const useCanvasSyncStore = <T,>(selector: (state: CanvasSyncStore) => T): T => {
    const store = useContext(CanvasSyncContext);
    if (!store) {
        throw new Error("useCanvasSyncStore must be used within CanvasSyncProvider");
    }
    return useStore(store, selector);
};

// Hook compatibility layer (simulates the old API where it returned the whole store)
export const useCanvasSync = (): CanvasSyncStore => {
    const store = useContext(CanvasSyncContext);
    if (!store) {
        throw new Error("useCanvasSync must be used within CanvasSyncProvider");
    }
    return useStore(store);
};

// Selector hook (same API as original context)
export const useCanvasSyncSelector = <T,>(selector: (state: CanvasSyncStore) => T): T => {
    return useCanvasSyncStore(selector);
};