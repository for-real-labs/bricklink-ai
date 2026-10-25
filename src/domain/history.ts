import type { Project } from "./model";
export interface History {
  past: Project[];
  present: Project;
  future: Project[];
}
export type HistoryAction =
  | { type: "commit"; project: Project }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; project: Project };
export function historyReducer(state: History, action: HistoryAction): History {
  if (action.type === "reset")
    return { past: [], present: action.project, future: [] };
  if (action.type === "commit") {
    if (JSON.stringify(action.project) === JSON.stringify(state.present))
      return state;
    return {
      past: [...state.past.slice(-49), state.present],
      present: action.project,
      future: [],
    };
  }
  if (action.type === "undo" && state.past.length)
    return {
      past: state.past.slice(0, -1),
      present: state.past.at(-1)!,
      future: [state.present, ...state.future],
    };
  if (action.type === "redo" && state.future.length)
    return {
      past: [...state.past, state.present],
      present: state.future[0],
      future: state.future.slice(1),
    };
  return state;
}
