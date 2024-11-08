import { beginWork } from "./beginWork";
import { completeWork } from "./completeWork";
import { FiberNode } from "./fiber";

let workInProgress: FiberNode | null = null;

/**
 * Prepares the workInProgress node to represent the current state of the component.
 * This function sets the workInProgress pointer to the given fiber node, indicating that
 * this node is now the current working node and will be used for the next render phase.
 * @param fiber 
 */
function prepareFreshState(fiber: FiberNode) {
  workInProgress = fiber;
}

/**
 * renders the root fiber node.
 * @param fiber 
 */
function renderRoot(fiber: FiberNode) {
  // init fiber node
  prepareFreshState(fiber);

  do {
    try {
      workLoop();
      break;
    } catch (e: any) {
      console.log('workLoop error', e);
      workInProgress = null;
    }
  } while (true)
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