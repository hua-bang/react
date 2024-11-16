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

export function removeChild(child: Instance | TextInstance, container: Container) {
  container.removeChild(child);
}

export function updateFiberProps(node: Element, props: Props) {
  node[elementPropsKey] = props;
}