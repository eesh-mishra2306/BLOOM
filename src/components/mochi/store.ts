"use client";
import { create } from "zustand";
import { INITIAL_MOCHI, mochiReducer, type MochiAction, type MochiState } from "./behaviour";

type MochiStore = MochiState & {
  open: boolean;
  wave: number;
  setOpen: (open: boolean) => void;
  dispatch: (action: MochiAction) => void;
  greet: () => void;
};

let revert: ReturnType<typeof setTimeout> | undefined;

export const useMochi = create<MochiStore>((set, get) => ({
  ...INITIAL_MOCHI,
  open: false,
  wave: 0,
  setOpen: (open) => set({ open }),
  dispatch: (action) => {
    const { open: _o, wave: _w, setOpen: _s, dispatch: _d, greet: _g, ...state } = get();
    const next = mochiReducer(state, action);
    set(next);
    if (revert) clearTimeout(revert);
    if (next.transient) revert = setTimeout(() => get().dispatch("timeout"), 2400);
  },
  greet: () => {
    set((s) => ({ wave: s.wave + 1 }));
    get().dispatch("greet");
  },
}));
