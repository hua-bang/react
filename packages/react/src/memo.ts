import { REACT_MEMO_TYPE } from "shared/ReactSymbols";
import { Props } from "shared/ReactTypes";

export function memo(type: any, compare?: (oldProps: Props, newProps: any) => boolean) {
  const fiberType = {
    $$typeof: REACT_MEMO_TYPE,
    type,
    compare: compare === undefined ? null : compare
  };

  return fiberType;
}