
import internals from 'shared/internals';
import { FiberNode } from "./fiber";
import { Dispatch } from 'shared/dispatch';
import { createUpdate, createUpdateQueue, enqueueUpdate, UpdateQueue } from './updateQueue';
import { Action } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';

interface Hook {
  memoizedState: any;
  updateQueue: unknown;
  next: Hook | null;
}

// 当前正在渲染的 fiber
let currentlyRenderingFiber: FiberNode | null = null;
// 正在工作的 hook
let workInProgressHook: Hook | null = null;

const {
  currentDispatcher,
} = internals;

export function renderWithHooks(wip: FiberNode) {

  // 赋值操作
  currentlyRenderingFiber = wip;
  wip.memoizedState = null;

  const current = wip.alternate;

  if (current !== null) {
    // update
  } else {
    // mount
    currentDispatcher.current = HooksDispatcherOnMount;
  }

  const { type: Component, pendingProps: props } = wip;
  const children = Component(props);

  // 重置操作
  currentlyRenderingFiber = null;
  return children;
}

const HooksDispatcherOnMount = {
  useState: mountState,
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
  const update = createUpdate<State>(action);
  enqueueUpdate(queue, update);
  scheduleUpdateOnFiber(fiber);
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