import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from 'shared/ReactSymbols';
import { Type, Key, Ref, Props, ReactElementType, ElementType } from 'shared/ReactTypes';

export const ReactElement = (type: Type, key: Key, ref: Ref | null, props: Props): ReactElementType => {
  const element = {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
    __mark: 'hua',
  };

  return element;
}

export const jsx = (type: ElementType, config: Record<string, any>, ...maybeChild: any[]) => {
  let key: Key = null;
  let ref: Ref | null = null;
  const props: Props = {};

  for (const prop in config) {
    const val = config[prop];
    if (prop === 'key') {
      if (val !== undefined) {
        key = '' + val;
      }
      continue;
    }

    if (prop === 'ref') {
      if (val !== undefined) {
        ref = val;
      }
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(config, prop)) {
      props[prop] = val;
    }
  }

  const maybeChildrenLength = maybeChild.length;

  if (maybeChildrenLength) {
    if (maybeChildrenLength === 1) {
      props.children = maybeChild[0];
    } else {
      props.children = maybeChild;
    }
  }

  return ReactElement(type, key, ref, props);
};

export const jsxDEV = (type: ElementType, config: Record<string, any>) => {
  let key: Key = null;
  let ref: Ref | null = null;
  const props: Props = {};

  for (const prop in config) {
    const val = config[prop];
    if (prop === 'key') {
      if (val !== undefined) {
        key = '' + val;
      }
      continue;
    }

    if (prop === 'ref') {
      if (val !== undefined) {
        ref = val;
      }
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(config, prop)) {
      props[prop] = val;
    }
  }

  return ReactElement(type, key, ref, props);
};

export function isValidElement(object: any) {
  return (
    typeof object === 'object' &&
    object !== null &&
    object.$$typeof === REACT_ELEMENT_TYPE
  );
}

export const Fragment = REACT_FRAGMENT_TYPE;