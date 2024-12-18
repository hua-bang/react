import { Action } from "./ReactTypes";

export interface Dispatcher {
  useState: <T>(initial: () => T | T) => [T, Dispatch<T>];
  useEffect: (callback: () => void, deps: Array<any> | void) => void;
  useTransition: () => [boolean, (callback: () => void) => void];
  useRef: <T>(initialValue: T) => { current: T };
}

export type Dispatch<State> = (action: Action<State>) => void;