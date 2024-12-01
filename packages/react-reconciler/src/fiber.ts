import { Key, ReactElementType } from "shared/ReactTypes";
import { Props } from "shared/ReactTypes";
import { Fragment, FunctionComponent, HostComponent, WorkTag } from "./workTags";
import { FiberFlags, NoFlags } from "./fiberFlags";
import { Container } from "hostConfig";
import { Lane, Lanes, NoLane, NoLanes } from "./fiberLanes";
import { Effect } from "./fiberHooks";
import { CallbackNode } from "scheduler";


export class FiberNode {
  // 实例
  type: any;
  tag: WorkTag;
  key: Key;
  stateNode: any;

  // 构成树状结构
  return: FiberNode | null;
  sibling: FiberNode | null;
  child: FiberNode | null;
  index: number;

  ref: any;

  // 工作单元
  pendingProps: Props | null;
  memoizedProps: Props | null;
  memoizedState: any;
  updateQueue: unknown;
  deletions: FiberNode[] | null;
  // 用于双缓冲
  alternate: FiberNode | null;
  // 副作用
  flags: FiberFlags;
  subtreeFlags: FiberFlags;

  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    // 实例
    this.tag = tag;
    this.key = key || null;
    // HostComponent div DOM
    this.stateNode = null;
    // FunctionComponent () => {}
    this.type = null;

    // 构成树状结构
    this.return = null;
    this.sibling = null;
    this.child = null;
    this.index = 0;

    this.ref = null;

    this.pendingProps = pendingProps;
    this.memoizedProps = null;
    this.memoizedState = null;
    this.updateQueue = null;
    this.deletions = null;
    this.alternate = null;
    this.flags = NoFlags;
    this.subtreeFlags = NoFlags;
  }
}

export interface PendingPassiveEffects {
  unmount: Effect[];
  update: Effect[];
}

export class FiberRootNode {
  container: Container;

  current: FiberNode;

  finishedWork: FiberNode | null;
  pendingLanes: Lanes;
  finishedLane: Lane;
  pendingPassiveEffects: PendingPassiveEffects;

  callbackNode: CallbackNode | null;
  callbackPriority: Lane;

  constructor(container: Container, hostRootFiber: FiberNode) {
    this.container = container;
    this.current = hostRootFiber;
    hostRootFiber.stateNode = this;
    this.finishedWork = null;
    this.pendingLanes = NoLanes;
    this.finishedLane = NoLane;
    this.pendingPassiveEffects = {
      unmount: [],
      update: [],
    }

    this.callbackNode = null;
    this.callbackPriority = NoLane;
  }
}

export const createWorkInProgress = (current: FiberNode, pendingProps: Props): FiberNode => {
  let wip = current.alternate;

  if (wip === null) {
    // mount
    wip = new FiberNode(current.tag, pendingProps, current.key);
    wip.stateNode = current.stateNode;

    wip.alternate = current;
    current.alternate = wip;
  } else {
    // update
    wip.pendingProps = pendingProps;
    wip.flags = NoFlags;
    wip.subtreeFlags = NoFlags;
    wip.deletions = null;
  }
  wip.type = current.type;
  wip.updateQueue = current.updateQueue;
  wip.child = current.child;
  wip.memoizedProps = current.memoizedProps;
  wip.memoizedState = current.memoizedState;

  return wip;
}

export const createFiberFromElement = (element: ReactElementType): FiberNode => {
  const { type, key, props } = element;

  let fiberTag: WorkTag = FunctionComponent;

  if (typeof type === 'string') {
    fiberTag = HostComponent;
  } else if (typeof type === 'object' && __DEV__) {
    console.warn('未实现的type类型', element);
  }

  const fiber = new FiberNode(fiberTag, props, key);
  fiber.type = type;

  return fiber;
}

export function createFiberFromFragment(element: any[], key: Key): FiberNode {
  return new FiberNode(Fragment, element, key);
}