import { Context } from "./context";
import { Action, HookDeps } from "./ReactTypes";

export interface Dispatcher {
  useState: <T>(initial: () => T | T) => [T, Dispatch<T>];
  useEffect: (callback: () => void, deps: Array<any> | void) => void;
  useTransition: () => [boolean, (callback: () => void) => void];
  useRef: <T>(initialValue: T) => { current: T };
  useContext: <T>(context: Context<T>) => T;
  useMemo: <T>(create: () => T, deps: HookDeps) => T;
  useCallback: <T extends (...args: any[]) => any>(fn: T, deps: HookDeps) => T;
}

export type Dispatch<State> = (action: Action<State>) => void;