import { Key } from "shared/ReactTypes";
import { Props } from "shared/ReactTypes";
import { WorkTag } from "./workTags";
import { FiberFlags, NoFlags } from "./fiberFlags";

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
    this.alternate = null;
    this.flags = NoFlags;
  }
}