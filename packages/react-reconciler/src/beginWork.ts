import { ContextProvider, Fragment, FunctionComponent, HostComponent, HostRoot, HostText } from './workTags';
import { FiberNode } from "./fiber";
import { processUpdateQueue, UpdateQueue } from './updateQueue';
import { ReactElementType } from 'shared/ReactTypes';
import { cloneChildFibers, mountChildFibers, reconcileChildFibers } from './childFiber';
import { bailoutHook, renderWithHooks } from './fiberHooks';
import { includeSomeLanes, Lane, NoLanes } from './fiberLanes';
import { Ref } from './fiberFlags';
import { pushProvider } from './fiberContext';

// 是否能命中 bailout 策略
let didReceiveUpdate = false;

export function markWipeReceivedUpdate() {
  didReceiveUpdate = true;
}

function checkScheduleUpdateOrContext(
  current: FiberNode,
  renderLane: Lane
) {
  const updateLane = current.lanes;

  if (includeSomeLanes(updateLane, renderLane)) {
    return true;
  }

  return false;
}

export const beginWork = (wip: FiberNode, renderLane: Lane): FiberNode | null => {
  didReceiveUpdate = false;
  const current = wip.alternate;

  if (current !== null) {
    const oldProps = current.memoizedProps;
    const newProps = wip.pendingProps;
    if (oldProps !== newProps || current.type !== wip.type) {
      markWipeReceivedUpdate();
    } else {
      // state context
      const hasScheduleUpdateOrContext = checkScheduleUpdateOrContext(current, renderLane);
      if (!hasScheduleUpdateOrContext) {
        // 则说明 state 和 context 不变
        didReceiveUpdate = false;

        if (wip.tag === ContextProvider) {
          const newValue = wip.memoizedProps.value;
          const context = current.type._context;
          pushProvider(context, newValue);
        }

        return bailoutOnAlreadyFinishedWork(wip, renderLane);
      }
    }
  }

  wip.lanes = NoLanes;

  switch (wip.tag) {
    case HostRoot:
      return updateHostRoot(wip, renderLane);
    case HostComponent:
      return updateHostComponent(wip);
    case HostText:
      return null;
    case ContextProvider:
      return updateContextProvider(wip);
    case FunctionComponent:
      return updateFunctionComponent(wip, renderLane);
    case Fragment:
      return updateFragment(wip);
    default:
      if (__DEV__) {
        console.warn('beginWork未实现的类型');
      }
      break;
  }

  // 比较，返回子fiber
  return wip.child;
}


function bailoutOnAlreadyFinishedWork(wip: FiberNode, renderLane: Lane) {
  if (!includeSomeLanes(wip.childLanes, renderLane)) {
    if (__DEV__) {
      console.log('bailoutOn 整一颗子树', wip);
    }

    return null;
  }

  if (__DEV__) {
    console.log('bailoutOn 单个子节点', wip);
  }

  cloneChildFibers(wip);
  return wip.child;
}

function updateHostRoot(wip: FiberNode, renderLane: Lane) {
  const baseState = wip.memoizedState;
  const updateQueue = wip.updateQueue as UpdateQueue<ReactElementType | null>;
  const pending = updateQueue.shared.pending;
  updateQueue.shared.pending = null;

  const prevChildren = wip.memoizedState;

  const { memoizedState } = processUpdateQueue(baseState, pending, renderLane);
  wip.memoizedState = memoizedState;

  const current = wip.alternate;
  if (current !== null) {
    if (!current.memoizedState) {
      current.memoizedState = memoizedState;
    }
  }

  const nextChildren = wip.memoizedState;
  if (prevChildren === nextChildren) {
    return bailoutOnAlreadyFinishedWork(wip, renderLane);
  }
  reconcileChildren(wip, nextChildren);
  return wip.child;
}

function updateHostComponent(wip: FiberNode) {
  const nextProps = wip.pendingProps;
  const nextChildren = nextProps.children;

  markRef(wip.alternate, wip);
  reconcileChildren(wip, nextChildren);
  return wip.child;
}

function updateFunctionComponent(wip: FiberNode, renderLane: Lane) {
  const children = renderWithHooks(wip, renderLane);
  const current = wip.alternate;
  if (current !== null && !didReceiveUpdate) {
    bailoutHook(wip, renderLane);
    return bailoutOnAlreadyFinishedWork(wip, renderLane);
  }
  reconcileChildren(wip, children);
  return wip.child;
}

function updateFragment(wip: FiberNode) {
  const nextChildren = wip.pendingProps;
  reconcileChildren(wip, nextChildren);
  return wip.child;
}

function reconcileChildren(wip: FiberNode, children?: ReactElementType) {
  const current = wip.alternate;

  if (current !== null) {
    // update
    wip.child = reconcileChildFibers(wip, current?.child, children);
  } else {
    // mount
    wip.child = mountChildFibers(wip, null, children);
  }

  return wip.child;
}

function updateContextProvider(wip: FiberNode) {
  const providerType = wip.type;
  const context = providerType._context;
  const newProps = wip.pendingProps;

  pushProvider(context, newProps.value);

  const nextChildren = newProps.children;
  reconcileChildren(wip, nextChildren);
  return wip.child;
}

function markRef(current: FiberNode | null, workInProgress: FiberNode) {
  const ref = workInProgress.ref;

  if (
    (current === null && ref !== null) ||
    (current !== null && current.ref !== ref)
  ) {
    workInProgress.flags |= Ref;
  }
}