import { HostComponent, HostText } from 'react-reconciler/src/workTags';
import { FiberNode } from "react-reconciler/src/fiber";
import { Props } from "shared/ReactTypes";

export type Container = Element;
export type Instance = Element;
export type TextInstance = Text;

// DOM 实例上保存 props 的 key
export const elementPropsKey = '__props'

declare global {
  interface Element {
    [elementPropsKey]: Props;
  }
}

export const createInstance = (type: string, props: Props): Instance => {
  const element = document.createElement(type);
  updateFiberProps(element, props);
  return element;
}

export const appendInitialChild = (parent: Instance | Container, child: Instance) => {
  parent.appendChild(child);
}

export const createTextInstance = (content: string) => {
  return document.createTextNode(content);
}

export const appendChildToContainer = appendInitialChild;

export function commitTextUpdate(text: TextInstance, content: string) {
  text.textContent = content;
}

export const commitUpdate = (fiber: FiberNode) => {
  switch (fiber.tag) {
    case HostText:
      {
        const text = fiber.memoizedProps.content;
        return commitTextUpdate(fiber.stateNode, text);
      }
    case HostComponent:
      return updateFiberProps(fiber.stateNode, fiber.memoizedProps);
    default:
      if (__DEV__) {
        console.warn('未实现的类型', fiber);
      }
  }
}

export function removeChild(child: Instance | TextInstance, container: Container) {
  container.removeChild(child);
}

export function updateFiberProps(node: Element, props: Props) {
  node[elementPropsKey] = props;
}

export function insertChildToContainer(
  child: Instance,
  container: Container,
  before: Instance
) {
  container.insertBefore(child, before);
}


const getScheduleMicroTaskManager = () => {
  if (typeof queueMicrotask === 'function') {
    return queueMicrotask;
  }

  if (typeof Promise === 'function') {
    return (callback: (...args: any[]) => void) => Promise.resolve(null).then(callback);
  }

  return setTimeout;
}

export const scheduleMicroTask = getScheduleMicroTaskManager();