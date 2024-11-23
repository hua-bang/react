import { FiberRootNode } from "./fiber";

export type Lane = number;
// lanes 是有 Lane 做或运算得到的
export type Lanes = number;

export const SyncLane = 0b00001;
export const NoLane = 0b00000;
export const NoLanes = 0b00000;

export const mergeLanes = (laneA: number, laneB: number) => {
  return laneA | laneB;
}

// 函数 requestUpdateLane 用于请求更新的通道
// 目前仅返回同步通道 SyncLane，后续需要实现其他更新的优先级
export function requestUpdateLane() {
  // TODO: 后续需要实现其他更新的优先级
  return SyncLane;
}

export function getHighestPriorityLane(lanes: Lanes) {
  return lanes & -lanes;
}

export function markRootFinished(root: FiberRootNode, lane: Lane) {
  root.pendingLanes &= ~lane;
}