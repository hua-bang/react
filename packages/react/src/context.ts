import { Context } from "shared/context"
import { REACT_CONTEXT_TYPE, REACT_PROVIDER_TYPE } from "shared/ReactSymbols"

export const createContext = <T>(val: T) => {
  const context: Context<T> = {
    _currentValue: val,
    Provider: null,
    $$typeof: REACT_CONTEXT_TYPE
  }

  const provider = {
    $$typeof: REACT_PROVIDER_TYPE,
    _context: context
  }
  context.Provider = provider
  return context;
}