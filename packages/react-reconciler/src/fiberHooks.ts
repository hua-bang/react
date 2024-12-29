import currentBatchConfig from 'react/src/currentBatchConfig';

import internals from 'shared/internals';
import { FiberNode } from "./fiber";
import { Dispatch, Dispatcher } from 'shared/dispatch';
import { createUpdate, createUpdateQueue, enqueueUpdate, processUpdateQueue, Update, UpdateQueue } from './updateQueue';
import { Action } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';
import { Lane, mergeLanes, NoLane, removeLanes, requestUpdateLane } from './fiberLanes';
import { FiberFlags, PassiveEffect } from './fiberFlags';
import { HookHasEffect, Passive } from './hookEffectTags';
import { Context } from 'shared/context';
import { markWipeReceivedUpdate } from './beginWork';

interface Hook {
  memoizedState: any;
  updateQueue: unknown;
  next: Hook | null;
  baseState: any;
  baseQueue: Update<any> | null;
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
  wip.updateQueue = null;
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
  workInProgressHook = null;
  renderLane = NoLane;
  currentHook = null;
  return children;
}


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
  hook.baseState = memoizedState;

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
  enqueueUpdate(queue, update, fiber, lane);
  scheduleUpdateOnFiber(fiber, lane);
}


function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    updateQueue: null,
    next: null,
    baseState: null,
    baseQueue: null,
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
  const baseState = hook.baseState;
  const queue = hook.updateQueue as UpdateQueue<State>;
  const pending = queue.shared.pending;
  queue.shared.pending = null;
  const current = currentHook as Hook;
  let baseQueue = current.baseQueue;

  if (pending !== null) {
    // pending baseQueue update保存在current中
    if (baseQueue !== null) {
      // baseQueue b2 -> b0 -> b1 -> b2
      // pendingQueue p2 -> p0 -> p1 -> p2
      // b0
      const baseFirst = baseQueue.next;
      // p0
      const pendingFirst = pending.next;
      // b2 -> p0
      baseQueue.next = pendingFirst;
      // p2 -> b0
      pending.next = baseFirst;
      // p2 -> b0 -> b1 -> b2 -> p0 -> p1 -> p2
    }
    baseQueue = pending;
    // 保存在current中
    current.baseQueue = pending;
    queue.shared.pending = null;
  }

  if (baseQueue !== null) {
    const prevState = hook.memoizedState;
    const {
      memoizedState,
      baseQueue: newBaseQueue,
      baseState: newBaseState
    } = processUpdateQueue(baseState, baseQueue, renderLane, (update) => {
      const skippedLane = update.lane;
      const fiber = currentlyRenderingFiber as FiberNode;
      fiber.lanes = mergeLanes(fiber.lanes, skippedLane);
    });

    if (!Object.is(prevState, memoizedState)) {
      markWipeReceivedUpdate();
    }

    hook.memoizedState = memoizedState;
    hook.baseState = newBaseState;
    hook.baseQueue = newBaseQueue;
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
    baseState: currentHook.baseState,
    baseQueue: currentHook.baseQueue,
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

function updateEffect(create: EffectCallback | void, deps: Deps | void) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  let destroy: EffectCallback | void;
  if (currentHook !== null) {
    const prevEffect = currentHook.memoizedState as Effect;
    destroy = prevEffect.destroy;
    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        // 浅比较依赖， 如果相等
        hook.memoizedState = pushEffect(Passive, create, destroy, nextDeps);
        return;
      }

      // 不相等，执行
      (currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
      hook.memoizedState = pushEffect(
        Passive | HookHasEffect,
        create,
        destroy,
        nextDeps
      )
    }
  }
}

function areHookInputsEqual(nextDeps: Deps, prevDeps: Deps) {
  if (prevDeps === null || nextDeps === null) {
    return false;
  } else {
    for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
      if (Object.is(prevDeps[i], nextDeps[i])) {
        continue;
      }
      return false;
    }
    return true;

  }
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

const mountTransition: Dispatcher['useTransition'] = () => {
  const [isPending, setIsPending] = mountState(false);
  const hook = mountWorkInProgressHook();
  const start = startTransition.bind(null, setIsPending);
  hook.memoizedState = start;
  return [isPending, start];
}

const updateTransition: Dispatcher['useTransition'] = () => {
  const [isPending] = updateState();
  const hook = updateWorkInProgressHook();
  const start = hook.memoizedState;
  return [isPending as boolean, start];
}

function startTransition(setPending: Dispatch<boolean>, callback: () => void) {
  // exec task, should set pending
  setPending(true);

  // set currentBatchConfig to 1
  const prevTransition = currentBatchConfig.transition;
  currentBatchConfig.transition = 1;

  // exec callback
  callback();
  setPending(false);

  // set currentBatchConfig to 0
  currentBatchConfig.transition = prevTransition;
};

const mountRef = <T>(initialValue: T) => {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = { current: initialValue };
  return hook.memoizedState;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const updateRef = <T>(_: T) => {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;
}

const readContext = <T>(context: Context<T>): T => {
  const consumer = currentlyRenderingFiber;
  if (consumer === null) {
    throw new Error('只能在函数组件内调用useContext');
  }

  return context._currentValue;
}


const HooksDispatcherOnMount = {
  useState: mountState,
  useEffect: mountEffect,
  useTransition: mountTransition,
  useRef: mountRef,
  useContext: readContext
};

const HooksDispatcherOnUpdate = {
  useState: updateState,
  useEffect: updateEffect,
  useTransition: updateTransition,
  useRef: updateRef,
  useContext: readContext
};

export function bailoutHook(wip: FiberNode, renderLane: Lane) {
  const current = wip.alternate;
  wip.updateQueue = current?.updateQueue;
  wip.flags &= ~PassiveEffect;

  if (current) {
    current.lanes = removeLanes(current.lanes, renderLane);
  }
}