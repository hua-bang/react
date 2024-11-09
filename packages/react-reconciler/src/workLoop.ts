import { beginWork } from "./beginWork";
import { completeWork } from "./completeWork";
import { createWorkInProgress, FiberNode, FiberRootNode } from "./fiber";
import { MutationMask, NoFlags } from "./fiberFlags";
import { HostRoot } from "./workTags";

let workInProgress: FiberNode | null = null;

/**
 * Prepares the workInProgress node to represent the current state of the component.
 * This function sets the workInProgress pointer to the given fiber node, indicating that
 * this node is now the current working node and will be used for the next render phase.
 * @param fiber 
 */
function prepareFreshState(fiber: FiberRootNode) {
  workInProgress = createWorkInProgress(fiber.current, {});
}

export function scheduleUpdateOnFiber(fiber: FiberNode) {
  // TODO: 调度
  const root = markUpdateFromFiberToRoot(fiber);

  if (!root) {
    return;
  }

  renderRoot(root);
}

function markUpdateFromFiberToRoot(fiber: FiberNode): FiberRootNode | null {
  let node = fiber, parent = node.return;

  while (parent !== null) {
    node = parent;
    parent = node.return;
  }

  if (node.tag === HostRoot) {
    return node.stateNode;
  }

  return null;
}

/**
 * renders the root fiber node.
 * @param fiber 
 */
function renderRoot(root: FiberRootNode) {
  // init fiber node
  prepareFreshState(root);

  do {
    try {
      workLoop();
      break;
    } catch (e: any) {
      if (__DEV__) {
        console.log('workLoop error', e);
      }
      workInProgress = null;
    }
    // eslint-disable-next-line no-constant-condition
  } while (true)

  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;

  // 提交
  commitRoot(root);
}

function commitRoot(root: FiberRootNode) {
  const finishedWork = root.finishedWork;

  if (finishedWork === null) {
    return;
  }

  if (__DEV__) {
    console.log('commitRoot 开始执行');
  }

  // 重置
  root.finishedWork = null;

  // 判断是否存在 3个子阶段需要执行

  const subtreeHasEffect = (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;

  if (subtreeHasEffect || rootHasEffect) {

    // 1. beforeMutation

    // 2. mutation Placement
    root.current = finishedWork;

    // 3. layout
  } else {
    root.current = finishedWork;
  }

}

function workLoop() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(fiber: FiberNode) {
  // beginWork
  const next = beginWork(fiber);

  fiber.memoizedProps = fiber.pendingProps;

  if (next === null) {
    completeUnitOfWork(fiber);
  } else {
    workInProgress = next;
  }
}

function completeUnitOfWork(fiber: FiberNode) {
  let node: FiberNode | null = fiber;

  do {
    completeWork(node);
    const sibling = node.sibling;

    if (sibling !== null) {
      workInProgress = sibling;
      return;
    }

    node = node.return;
    workInProgress = node;
  } while (node !== null);
}