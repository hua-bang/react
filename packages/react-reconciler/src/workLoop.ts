import { scheduleMicroTask } from "hostConfig";
import { beginWork } from "./beginWork";
import { commitHookEffectListCreate, commitHookEffectListDestroy, commitHookEffectListUnmount, commitMutationEffects } from "./commitWork";
import { completeWork } from "./completeWork";
import { createWorkInProgress, FiberNode, FiberRootNode, PendingPassiveEffects } from "./fiber";
import { MutationMask, NoFlags, PassiveEffect } from "./fiberFlags";
import { getHighestPriorityLane, Lane, lanesToSchedulerPriority, markRootFinished, mergeLanes, NoLane, SyncLane } from "./fiberLanes";
import { flushSyncCallbacks, scheduleSyncCallback } from "./syncTaskQueue";
import { HostRoot } from "./workTags";
import {
  unstable_scheduleCallback as scheduleCallback,
  unstable_NormalPriority as NormalPriority,
  unstable_shouldYield,
  unstable_cancelCallback
} from 'scheduler';
import { HookHasEffect, Passive } from './hookEffectTags';

let workInProgress: FiberNode | null = null;
let wipRootRenderLane: Lane = NoLane;
let rootDoesHasPassiveEffects = false;

// type RootExitStatus = number;
const RootIncomplete = 1;
const RootCompleted = 2;

/**
 * Prepares the workInProgress node to represent the current state of the component.
 * This function sets the workInProgress pointer to the given fiber node, indicating that
 * this node is now the current working node and will be used for the next render phase.
 * @param fiber 
 */
function prepareFreshState(fiber: FiberRootNode, lane: Lane) {
  fiber.finishedLane = NoLane;
  fiber.finishedWork = null;
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

// scheduler 入口
function ensureRootIsScheduled(root: FiberRootNode) {
  const updateLane = getHighestPriorityLane(root.pendingLanes);
  const existingCallback = root.callbackNode;

  if (updateLane === NoLane) {
    if (existingCallback !== null) {
      unstable_cancelCallback(existingCallback);
    }
    root.callbackNode = null;
    root.callbackPriority = NoLane;
    return;
  }

  const curPriority = updateLane;
  const prevPriority = root.callbackPriority;

  if (curPriority === prevPriority) {
    return;
  }

  if (existingCallback !== null) {
    unstable_cancelCallback(existingCallback);
  }
  let newCallbackNode = null;

  if (__DEV__) {
    console.log(
      `在${updateLane === SyncLane ? '微' : '宏'}任务中调度，优先级：`,
      updateLane
    );
  }


  if (updateLane === SyncLane) {
    // 同步优先级 用微任务调度

    // 调度：注册任务，执行任务
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
    scheduleMicroTask(flushSyncCallbacks);
  } else {
    // 其他优先级 用宏任务调度
    const schedulerPriority = lanesToSchedulerPriority(updateLane);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    newCallbackNode = scheduleCallback(schedulerPriority, performConcurrentWorkOnRoot.bind(null, root));
  }

  root.callbackNode = newCallbackNode;
  root.callbackPriority = curPriority;

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


function performConcurrentWorkOnRoot(root: FiberRootNode, didTimeout?: boolean): any {

  const curCallback = root.callbackNode;
  // 保证 useEffect 回调执行
  const didFlushPassiveEffects = flushPassiveEffects(root.pendingPassiveEffects);
  if (didFlushPassiveEffects) {
    if (root.callbackNode !== curCallback) {
      return null;
    }
  }

  const lane = getHighestPriorityLane(root.pendingLanes);
  const curCallbackNode = root.callbackNode;
  if (lane === NoLane) {
    return null;
  }

  const needSync = lane === SyncLane || didTimeout;
  // render 阶段
  const exitStatus = renderRoot(root, lane, !needSync);

  ensureRootIsScheduled(root);

  if (exitStatus === RootIncomplete) {
    // 中断了

    // 说明有更高优先级的任务
    if (root.callbackNode !== curCallbackNode) {
      return null;
    }
    return performConcurrentWorkOnRoot.bind(null, root);
  }

  if (exitStatus === RootCompleted) {
    const finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    root.finishedLane = lane;
    wipRootRenderLane = NoLane;

    // 提交
    commitRoot(root);
  } else if (__DEV__) {
    console.error('还未实现的并发更新结束状态');
  }
}

/**
 * renders the root fiber node.
 * @param fiber 
 */
function performSyncWorkOnRoot(root: FiberRootNode) {
  const nextLane = getHighestPriorityLane(root.pendingLanes);

  if (nextLane !== SyncLane) {
    // 其他比SyncLane低的优先级
    // NoLane
    ensureRootIsScheduled(root);
    return;
  }

  const exitStatus = renderRoot(root, nextLane, false);

  if (exitStatus === RootCompleted) {
    const finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    root.finishedLane = nextLane;
    wipRootRenderLane = NoLane;

    // 提交
    commitRoot(root);
  } else if (__DEV__) {
    console.error('还未实现同步更新结束状态');
  }
}

function renderRoot(root: FiberRootNode, lane: Lane, shouldTimeSlice: boolean) {
  if (__DEV__) {
    console.log(`开始${shouldTimeSlice ? '并发' : '同步'}更新`, root);
  }

  // init fiber node
  if (wipRootRenderLane !== lane) {
    // 初始化
    prepareFreshState(root, lane);
  }

  do {
    try {
      if (shouldTimeSlice) {
        workLoopConcurrent()
      } else {
        workLoopSync();
      }

      break;
    } catch (e: any) {
      if (__DEV__) {
        console.log('workLoop error', e);
      }
      workInProgress = null;
    }
    // eslint-disable-next-line no-constant-condition
  } while (true)

  // 中断执行 || render 执行完

  if (shouldTimeSlice && workInProgress !== null) {
    return RootIncomplete;
  }

  if (!shouldTimeSlice && workInProgress !== null && __DEV__) {
    console.error('render阶段结束过程 wip 不应该为null');
  }

  // TODO: 报错
  return RootCompleted;

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

  if ((finishedWork.flags & PassiveEffect) !== NoFlags || (finishedWork.subtreeFlags & PassiveEffect) !== NoFlags) {
    // 存在副作用
    if (!rootDoesHasPassiveEffects) {
      rootDoesHasPassiveEffects = true;
      // 调度副作用
      scheduleCallback(NormalPriority, () => {
        // 执行副作用
        flushPassiveEffects(root.pendingPassiveEffects);
        return;
      });
    }
  }

  // 判断是否存在 3个子阶段需要执行
  const subtreeHasEffect = (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;

  if (subtreeHasEffect || rootHasEffect) {

    // 1. beforeMutation

    // 2. mutation Placement
    commitMutationEffects(finishedWork, root);
    root.current = finishedWork;

    // 3. layout
  } else {
    root.current = finishedWork;
  }

  rootDoesHasPassiveEffects = false;
  ensureRootIsScheduled(root);
}


// 要先执行 unmount, 在执行 update
function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
  let didFlushPassiveEffects = false;

  // 遍历待卸载的效果列表，对每个效果调用 commitHookEffectListUnmount 函数进行卸载操作
  pendingPassiveEffects.unmount.forEach((effect) => {
    didFlushPassiveEffects = true;
    commitHookEffectListUnmount(Passive, effect);
  });
  // 清空待卸载的效果列表
  pendingPassiveEffects.unmount = [];

  // 遍历待更新的效果列表，对每个效果调用 commitHookEffectListDestroy 函数进行销毁操作
  pendingPassiveEffects.update.forEach((effect) => {
    didFlushPassiveEffects = true;
    commitHookEffectListDestroy(Passive | HookHasEffect, effect);
  });
  // 再次遍历待更新的效果列表，对每个效果调用 commitHookEffectListCreate 函数进行创建操作
  pendingPassiveEffects.update.forEach((effect) => {
    didFlushPassiveEffects = true;
    commitHookEffectListCreate(Passive | HookHasEffect, effect);
  });
  // 清空待更新的效果列表
  pendingPassiveEffects.update = [];

  flushSyncCallbacks();

  return didFlushPassiveEffects;
}

function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

function workLoopConcurrent() {
  while (workInProgress !== null && !unstable_shouldYield()) {
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