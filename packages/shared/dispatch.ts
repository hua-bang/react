import { Action } from "./ReactTypes";

export interface Dispatcher {
  useState: <T>(initial: () => T | T) => [T, Dispatch<T>];
}

export type Dispatch<State> = (action: Action<State>) => void;