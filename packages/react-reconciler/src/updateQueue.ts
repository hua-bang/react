import { Dispatch } from "shared/dispatch";
import { Action } from "shared/ReactTypes";
import { Lane } from "./fiberLanes";

export interface Update<State> {
  action: Action<State>;
  lane: Lane;
  next: Update<any> | null;
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null;
  };
  dispatch: Dispatch<State> | null;
}

export const createUpdate = <State>(action: Action<State>, lane: Lane): Update<State> => {
  return {
    action,
    lane,
    next: null,
  };
}

export const createUpdateQueue = <State>(): UpdateQueue<State> => {
  return {
    shared: {
      pending: null,
    }
  } as UpdateQueue<State>;
}

export const enqueueUpdate = <State>(
  updateQueue: UpdateQueue<State>,
  update: Update<State>
) => {
  const pending = updateQueue.shared.pending;
  if (pending === null) {
    // pending = a -> a
    update.next = update;
  } else {
    // pending = b -> a -> b
    // pending = c -> a -> b -> c
    update.next = pending.next;
    pending.next = update;
  }
  updateQueue.shared.pending = update;
}

export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State> | null,
  renderLane: Lane,
): { memoizedState: State } => {



  if (pendingUpdate !== null) {
    const first = pendingUpdate.next as Update<any>;
    let pending = pendingUpdate.next as Update<any>;

    do {
      const updateLane = pending.lane;
      if (updateLane === renderLane) {
        const action = pending.action;
        if (action instanceof Function) {
          baseState = action(baseState);
        } else {
          baseState = action;
        }
      } else {
        if (__DEV__) {
          console.warn('还未实现优先级');
        }
      }
      pending = pending.next as Update<any>;
    } while (pending !== first);
  }

  const result: ReturnType<typeof processUpdateQueue<State>> = {
    memoizedState: baseState,
  };

  return result;
}