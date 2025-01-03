import { Context } from 'shared/context';
import { FiberNode } from './fiber';
import { includeSomeLanes, isSubsetOfLanes, Lane, mergeLanes, NoLanes } from './fiberLanes';
import { markWipeReceivedUpdate } from './beginWork';
import { ContextProvider } from './workTags';

let lastContextDep: ContextItem<any> | null = null;

export interface ContextItem<Value> {
  context: Context<Value>;
  memoizedState: Value;
  next: ContextItem<Value> | null;
}

let prevContextValue: any = null;
const prevContextValueStack: any[] = [];
export function pushProvider<T>(context: Context<T>, newValue: T) {
  prevContextValueStack.push(prevContextValue);
  prevContextValue = context._currentValue;
  context._currentValue = newValue;
}

export function popProvider<T>(context: Context<T>) {
  context._currentValue = prevContextValue;
  prevContextValue = prevContextValueStack.pop();
}

export function prepareToReadContext(wip: FiberNode, renderLane: Lane) {
  lastContextDep = null;

  const deps = wip.dependencies;

  if (deps !== null) {
    const firstContext = deps.firstContext;
    if (firstContext !== null) {
      if (includeSomeLanes(deps.lanes, renderLane)) {
        markWipeReceivedUpdate();
      }
      deps.firstContext = null;
    }
  }
}

export const readContext = <T>(context: Context<T>, consumer: FiberNode | null): T => {
  if (consumer === null) {
    throw new Error('只能在函数组件内调用useContext');
  }

  // 建立 context 的依赖
  const contextItem: ContextItem<T> = {
    context,
    memoizedState: context._currentValue,
    next: null,
  };

  if (lastContextDep === null) {
    lastContextDep = contextItem;
    consumer.dependencies = {
      firstContext: contextItem,
      lanes: NoLanes,
    }
  } else {
    lastContextDep.next = contextItem;
    lastContextDep = lastContextDep.next;
  }

  return context._currentValue;
}

export function propagateContextChange<T>(wip: FiberNode, context: Context<T>, renderLane: Lane) {
  let fiber = wip.child;

  if (fiber !== null) {
    fiber.return = wip;
  }

  while (fiber !== null) {
    let nextFiber = null;
    const deps = fiber.dependencies;
    if (deps !== null) {
      // TODO
      nextFiber = fiber.child;

      let contextItem = deps.firstContext;
      while (contextItem !== null) {
        // 找到对应的 context
        if (contextItem.context === context) {
          fiber.lanes = mergeLanes(fiber.lanes, renderLane);
          const alternate = fiber.alternate;
          if (alternate !== null) {
            alternate.lanes = mergeLanes(alternate.lanes, renderLane);
          }

          // TODO: 往上
          scheduleContextWorkOnParentPath(fiber.return, wip, renderLane);
          deps.lanes = mergeLanes(deps.lanes, renderLane);
          break;
        }
        contextItem = contextItem.next;
      }
    } else if (fiber.tag === ContextProvider) {
      nextFiber = fiber.type === wip.type ? null : fiber.child;
    } else {
      nextFiber = fiber.child;
    }

    if (nextFiber !== null) {
      nextFiber.return = fiber;
    } else {
      // 到了叶子节点
      nextFiber = fiber;
      while (nextFiber !== null) {
        if (nextFiber === wip) {
          nextFiber = null
          break;
        }

        const sibling = nextFiber.sibling;
        if (sibling !== null) {
          sibling.return = nextFiber.return;
          nextFiber = sibling;
          break;
        } else {
          nextFiber = nextFiber.return;
        }
      }
    }
    fiber = nextFiber;
  }
}

function scheduleContextWorkOnParentPath(from: FiberNode | null, to: FiberNode, renderLane: Lane) {
  let node = from;

  while (node !== null) {
    const alternate = node.alternate;

    if (!isSubsetOfLanes(node.childLanes, renderLane)) {
      node.childLanes = mergeLanes(node.childLanes, renderLane);
      if (alternate !== null) {
        alternate.childLanes = mergeLanes(alternate.childLanes, renderLane);
      }
    } else if (alternate !== null && !isSubsetOfLanes(alternate.childLanes, renderLane)) {
      alternate.childLanes = mergeLanes(alternate.childLanes, renderLane);
    }

    if (node === to) {
      break;
    }
    node = node.return;
  }
}