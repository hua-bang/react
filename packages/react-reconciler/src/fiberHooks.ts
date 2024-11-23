
import internals from 'shared/internals';
import { FiberNode } from "./fiber";
import { Dispatch } from 'shared/dispatch';
import { createUpdate, createUpdateQueue, enqueueUpdate, processUpdateQueue, UpdateQueue } from './updateQueue';
import { Action } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';
import { Lane, NoLane, requestUpdateLane } from './fiberLanes';

interface Hook {
  memoizedState: any;
  updateQueue: unknown;
  next: Hook | null;
}

// 当前正在渲染的 fiber
let currentlyRenderingFiber: FiberNode | null = null;
// 正在工作的 hook
let workInProgressHook: Hook | null = null;
// 更新阶段的 hook
let currentHook: Hook | null = null;

let renderLane: Lane = NoLane;

const {
  currentDispatcher,
} = internals;

export function renderWithHooks(wip: FiberNode, lane: Lane) {

  // 赋值操作
  currentlyRenderingFiber = wip;
  wip.memoizedState = null;
  renderLane = lane;

  const current = wip.alternate;

  if (current !== null) {
    // update
    currentDispatcher.current = HooksDispatcherOnUpdate;
  } else {
    // mount
    currentDispatcher.current = HooksDispatcherOnMount;
  }

  const { type: Component, pendingProps: props } = wip;
  const children = Component(props);

  // 重置操作
  currentlyRenderingFiber = null;
  renderLane = NoLane;
  return children;
}

const HooksDispatcherOnMount = {
  useState: mountState,
};

const HooksDispatcherOnUpdate = {
  useState: updateState,
};

function mountState<State>(initial: State | (() => State)): [State, Dispatch<State>] {
  const hook = mountWorkInProgressHook();

  let memoizedState;
  if (initial instanceof Function) {
    memoizedState = initial();
  } else {
    memoizedState = initial;
  }

  const queue = createUpdateQueue<State>();
  hook.updateQueue = queue;
  hook.memoizedState = memoizedState;

  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber!, queue as any);
  queue.dispatch = dispatch;

  return [memoizedState, dispatch];
}

function dispatchSetState<State>(
  fiber: FiberNode,
  queue: UpdateQueue<State>,
  action: Action<State>,
) {
  const lane = requestUpdateLane();
  const update = createUpdate<State>(action, lane);
  enqueueUpdate(queue, update);
  scheduleUpdateOnFiber(fiber, lane);
}


function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    updateQueue: null,
    next: null,
  };

  if (workInProgressHook === null) {
    // mount 时 第一个 hook
    if (currentlyRenderingFiber === null) {
      throw new Error('请在函数组件中调用hook');
    } else {
      workInProgressHook = hook;
      currentlyRenderingFiber.memoizedState = workInProgressHook;
    }
  } else {
    // mount 时，后续的 hook
    workInProgressHook.next = hook;
    workInProgressHook = hook;
  }

  return workInProgressHook;
}

function updateState<State>(): [State, Dispatch<State>] {
  const hook = updateWorkInProgressHook();
  const queue = hook.updateQueue as UpdateQueue<State>;
  const pending = queue.shared.pending;

  if (pending !== null) {
    const { memoizedState } = processUpdateQueue(hook.memoizedState, pending, renderLane);
    hook.memoizedState = memoizedState;
  }

  return [hook.memoizedState, queue.dispatch as Dispatch<State>];
}



function updateWorkInProgressHook(): Hook {
  // TODO: render 时候的更新处理
  let nextCurrentHook: Hook | null = null;

  if (currentHook === null) {
    // 第一个 Hook
    const current = currentlyRenderingFiber?.alternate;
    if (current !== null) {
      nextCurrentHook = current?.memoizedState;
    } else {
      nextCurrentHook = null;
    }
  } else {
    // 后续的 Hook
    nextCurrentHook = currentHook.next;
  }

  if (nextCurrentHook === null) {
    throw new Error('组件中Hook的数量不一致');
  }

  currentHook = nextCurrentHook as Hook;

  const newHook: Hook = {
    memoizedState: currentHook.memoizedState,
    updateQueue: currentHook.updateQueue,
    next: null,
  };

  if (workInProgressHook === null) {
    // mount 时 第一个 hook
    if (currentlyRenderingFiber === null) {
      throw new Error('请在函数组件中调用hook');
    } else {
      workInProgressHook = newHook;
      currentlyRenderingFiber.memoizedState = workInProgressHook;
    }
  } else {
    // mount 时，后续的 hook
    workInProgressHook.next = newHook;
    workInProgressHook = newHook;
  }

  return workInProgressHook;
}