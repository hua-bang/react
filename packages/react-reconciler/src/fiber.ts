import { Key } from "shared/ReactTypes";
import { Props } from "shared/ReactTypes";
import { WorkTag } from "./workTags";
import { FiberFlags, NoFlags } from "./fiberFlags";
import { Container } from "hostConfig";

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
  // 用于双缓冲
  alternate: FiberNode | null;
  // 副作用
  flags: FiberFlags;

  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    // 实例
    this.tag = tag;
    this.key = key;
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
    this.alternate = null;
    this.flags = NoFlags;
  }
}

export class FiberRootNode {
  container: Container;

  current: FiberNode;

  finishedWork: FiberNode | null;

  constructor(container: Container, hostRootFiber: FiberNode) {
    this.container = container;
    this.current = hostRootFiber;
    hostRootFiber.stateNode = this;
    this.finishedWork = null;
  }
}

export const createWorkInProgress = (current: FiberNode, pendingProps: Props): FiberNode => {
  let wip = current.alternate;

  if (wip === null) {
    // mount
    wip = new FiberNode(current.tag, current.pendingProps, current.key);
    wip.stateNode = current.stateNode;

    wip.alternate = current;
    current.alternate = wip;
  } else {
    // update
    wip.pendingProps = pendingProps;
    wip.flags = NoFlags;
  }
  wip.type = current.type;
  wip.updateQueue = current.updateQueue;
  wip.child = current.child;
  wip.memoizedProps = current.memoizedProps;
  wip.memoizedState = current.memoizedState;

  return wip;
}