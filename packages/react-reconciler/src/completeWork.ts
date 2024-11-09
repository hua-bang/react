import { appendInitialChild, createInstance, createTextInstance } from "hostConfig";
import { FiberNode } from "./fiber";
import { HostComponent, HostRoot, HostText } from "./workTags";
import { NoFlags } from "./fiberFlags";

// - 对于`Host`类型`fiberNode`：构建离屏DOM树
// - 标记Update flag（TODO）
export const completeWork = (wip: FiberNode) => {
  // 递归中的归
  const newProps = wip.pendingProps;
  const current = wip.alternate;

  switch (wip.tag) {
    case HostComponent:
      if (current !== null && wip.stateNode !== null) {
        // update
      } else {
        // 1. 构建 DOM
        const instance = createInstance(wip.type, newProps);
        // 2. 插入 DOM 到 离屏DOM树
        appendAllChildren(instance, wip);
        wip.stateNode = instance;
      }
      bubbleProperties(wip);
      return null;
    case HostText:
      if (current !== null && wip.stateNode !== null) {
        // update
      } else {
        // 1. 构建 DOM
        const instance = createTextInstance(newProps.content);
        // 2. 插入 DOM 到 离屏DOM树
        wip.stateNode = instance;

      }
      bubbleProperties(wip);
      return null;
    case HostRoot:
      bubbleProperties(wip);
      return null;
    default:
      if (__DEV__) {
        console.warn('completeWork未实现的类型');
      }
      break;
  }
}

function appendAllChildren(parent: FiberNode, wip: FiberNode) {
  let node = wip.child;

  if (!node) {
    return;
  }

  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node.stateNode);
    } else if (node.child !== null) {
      node.child.return = node;
      node = node.child;
    }

    if (node === wip) {
      return;
    }

    while (node.sibling === null) {
      if (node.return === null || node.return === wip) {
        return;
      }
      node = node?.return;
    }

    node.sibling.return = node.return;
    node = node.sibling;
  }

}

export function bubbleProperties(wip: FiberNode) {
  let subtreeFlags = NoFlags;

  let child = wip.child;

  while (child !== null) {
    // 1. 收集子节点的 subtreeFlags
    subtreeFlags |= child.subtreeFlags;
    // 2. 收集子节点的 flags
    subtreeFlags |= child.flags;

    child.return = wip;
    // 3. 收集子节点的 flags
    child = child.sibling;
  }

  wip.subtreeFlags |= subtreeFlags;
}