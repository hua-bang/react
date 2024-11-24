
import internals from 'shared/internals';
import { FiberNode } from "./fiber";
import { Dispatch } from 'shared/dispatch';
import { createUpdate, createUpdateQueue, enqueueUpdate, processUpdateQueue, UpdateQueue } from './updateQueue';
import { Action } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';
import { Lane, NoLane, requestUpdateLane } from './fiberLanes';
import { FiberFlags, PassiveEffect } from './fiberFlags';
import { HookHasEffect, Passive } from './hookEffectTags';

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

export interface Effect {
  tag: FiberFlags;
  create: EffectCallback | void;
  destroy: EffectCallback | void;
  deps: Deps;
  next: Effect | null;
}

export interface FCUpdateQueue<State> extends UpdateQueue<State> {
  lastEffect: Effect | null;
}

type EffectCallback = () => void;
type Deps = Array<any> | null;

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
  useEffect: mountEffect,
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
  queue.shared.pending = null;

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

function mountEffect(create: EffectCallback, deps: Deps | null) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === null ? null : deps;

  if (currentlyRenderingFiber !== null) {
    currentlyRenderingFiber.flags |= PassiveEffect;
  }

  // 本次是需要更新的
  hook.memoizedState = pushEffect(Passive | HookHasEffect, create, undefined, nextDeps);

}

function pushEffect(
  hookFlags: FiberFlags,
  create: EffectCallback | void,
  destroy: EffectCallback | void,
  deps: Deps,
): Effect {
  const effect: Effect = {
    tag: hookFlags,
    create,
    destroy,
    deps,
    next: null,
  };

  const fiber = currentlyRenderingFiber;
  const updateQueue = fiber?.updateQueue as FCUpdateQueue<any>;

  if (updateQueue === null) {
    const updateQueue = createFCUpdateQueue();
    fiber!.updateQueue = updateQueue;
    // 首个的话，要构造环状链表，需要指向自己
    effect.next = effect;
    updateQueue.lastEffect = effect;
  } else {
    // 如果不是的话
    const lastEffect = updateQueue.lastEffect;
    if (lastEffect === null) {
      effect.next = effect;
      updateQueue.lastEffect = effect;
    } else {
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      updateQueue.lastEffect = effect;
    }
  }

  return effect;
};

function createFCUpdateQueue<State>(): FCUpdateQueue<State> {
  const updateQueue = createUpdateQueue<State>() as FCUpdateQueue<State>;
  updateQueue.lastEffect = null;
  return updateQueue;
}