import { unstable_getCurrentPriorityLevel, unstable_IdlePriority, unstable_ImmediatePriority, unstable_NormalPriority, unstable_UserBlockingPriority } from "scheduler";
import { FiberRootNode } from "./fiber";

export type Lane = number;
// lanes 是有 Lane 做或运算得到的
export type Lanes = number;

export const SyncLane = 0b00001;
export const NoLane = 0b00000;
export const NoLanes = 0b00000;
export const InputContinuousLane = 0b00010;
export const DefaultLane = 0b00100;
export const IdleLane = 0b01000;

export const mergeLanes = (laneA: number, laneB: number) => {
  return laneA | laneB;
}

// 函数 requestUpdateLane 用于请求更新的通道
// 目前仅返回同步通道 SyncLane，后续需要实现其他更新的优先级
export function requestUpdateLane() {
  // 从上下文获取优先级
  const currentSchedulerPriority = unstable_getCurrentPriorityLevel();
  // 需要将优先级转化为 lane
  return schedulerPriorityToLane(currentSchedulerPriority);
}

export function getHighestPriorityLane(lanes: Lanes) {
  return lanes & -lanes;
}

export function markRootFinished(root: FiberRootNode, lane: Lane) {
  root.pendingLanes &= ~lane;
}

export function lanesToSchedulerPriority(lanes: Lanes) {
  const lane = getHighestPriorityLane(lanes);

  if (lane === SyncLane) {
    return unstable_ImmediatePriority;
  }

  if (lane === InputContinuousLane) {
    return unstable_UserBlockingPriority;
  }

  if (lane === DefaultLane) {
    return unstable_NormalPriority;
  }

  return unstable_IdlePriority;
}

export function schedulerPriorityToLane(schedulerPriority: number) {
  if (schedulerPriority === unstable_ImmediatePriority) {
    return SyncLane;
  }
  if (schedulerPriority === unstable_UserBlockingPriority) {
    return InputContinuousLane;
  }
  if (schedulerPriority === unstable_NormalPriority) {
    return DefaultLane;
  }

  return IdleLane;
};

export function isSubsetOfLanes(set: Lanes, subset: Lane) {
  return (set & subset) === subset;
}