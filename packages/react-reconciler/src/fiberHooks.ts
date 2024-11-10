import { FiberNode } from "./fiber";

export function renderWithHooks(wip: FiberNode) {
  const { type: Component, pendingProps: props } = wip;
  const children = Component(props);
  return children;
}