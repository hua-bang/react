import { scheduleMicroTask } from "hostConfig";
import { beginWork } from "./beginWork";
import { commitMutationEffects } from "./commitWork";
import { completeWork } from "./completeWork";
import { createWorkInProgress, FiberNode, FiberRootNode } from "./fiber";
import { MutationMask, NoFlags } from "./fiberFlags";
import { getHighestPriorityLane, Lane, markRootFinished, mergeLanes, NoLane, SyncLane } from "./fiberLanes";
import { flushSyncCallbacks, scheduleSyncCallback } from "./syncTaskQueue";
import { HostRoot } from "./workTags";

let workInProgress: FiberNode | null = null;
let wipRootRenderLane: Lane = NoLane;

/**
 * Prepares the workInProgress node to represent the current state of the component.
 * This function sets the workInProgress pointer to the given fiber node, indicating that
 * this node is now the current working node and will be used for the next render phase.
 * @param fiber 
 */
function prepareFreshState(fiber: FiberRootNode, lane: Lane) {
  workInProgress = createWorkInProgress(fiber.current, {});
  wipRootRenderLane = lane;
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
  const root = markUpdateFromFiberToRoot(fiber);

  if (!root) {
    return;
  }

  markRootUpdated(root, lane);
  ensureRootIsScheduled(root);
}

function ensureRootIsScheduled(root: FiberRootNode) {
  const updateLane = getHighestPriorityLane(root.pendingLanes);
  if (updateLane === NoLane) {
    return;
  }

  if (updateLane === SyncLane) {
    // 同步优先级 用微任务调度
    if (__DEV__) {
      console.log('在微任务中调度，优先级：', updateLane);
    }

    // 调度：注册任务，执行任务
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane));
    scheduleMicroTask(flushSyncCallbacks);
  } else {
    // 其他优先级 用宏任务调度
  }

}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
  root.pendingLanes = mergeLanes(root.pendingLanes, lane);
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
function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
  const nextLane = getHighestPriorityLane(root.pendingLanes);

  if (nextLane !== SyncLane) {
    // 其他比SyncLane低的优先级
    // NoLane
    ensureRootIsScheduled(root);
    return;
  }

  if (__DEV__) {
    console.warn('render阶段开始');
  }

  // init fiber node
  prepareFreshState(root, lane);

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
  root.finishedLane = lane;
  wipRootRenderLane = NoLane;

  // 提交
  commitRoot(root);
}

function commitRoot(root: FiberRootNode) {
  const finishedWork = root.finishedWork;

  if (finishedWork === null) {
    return;
  }

  if (__DEV__) {
    console.warn('commitRoot 开始执行');
  }
  const lane = root.finishedLane;

  // 重置
  root.finishedWork = null;
  root.finishedLane = NoLane;
  markRootFinished(root, lane);

  // 判断是否存在 3个子阶段需要执行

  const subtreeHasEffect = (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;

  if (subtreeHasEffect || rootHasEffect) {

    // 1. beforeMutation

    // 2. mutation Placement
    commitMutationEffects(finishedWork);
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
  const next = beginWork(fiber, wipRootRenderLane);

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