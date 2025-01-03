import currentDispatcher, { resolveDispatcher } from "./src/currentDispatcher";
import currentBatchConfig from './src/currentBatchConfig';
import { Dispatcher } from 'shared/dispatch';
import { jsx, isValidElement as isValidElementFn } from "./src/jsx";
export { createContext } from './src/context';
export { memo } from './src/memo';

export const useState: Dispatcher['useState'] = (initialState) => {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
}

export const useEffect: Dispatcher['useEffect'] = (callback, deps) => {
  const dispatcher = resolveDispatcher();
  return dispatcher.useEffect(callback, deps);
};

export const useTransition: Dispatcher['useTransition'] = () => {
  const dispatcher = resolveDispatcher();
  return dispatcher.useTransition();
};

export const useRef: Dispatcher['useRef'] = (initialValue) => {
  const dispatcher = resolveDispatcher();
  return dispatcher.useRef(initialValue);
}

export const useContext: Dispatcher['useContext'] = (context) => {
  const dispatcher = resolveDispatcher();
  return dispatcher.useContext(context);
}

export const useMemo: Dispatcher['useMemo'] = (creator, deps) => {
  const dispatcher = resolveDispatcher();
  return dispatcher.useMemo(creator, deps);
}

export const useCallback: Dispatcher['useCallback'] = (callback, deps) => {
  const dispatcher = resolveDispatcher();
  return dispatcher.useCallback(callback, deps);
}


// 内部数据共享层
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
  currentDispatcher,
  currentBatchConfig,
};

export const version = '0.0.0';
// TODO 根据环境区分使用jsx/jsxDEV
export const createElement = jsx;
export const isValidElement = isValidElementFn;