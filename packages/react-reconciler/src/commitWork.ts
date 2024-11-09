import { appendChildToContainer, Container } from "hostConfig";
import { FiberNode, FiberRootNode } from "./fiber";
import { MutationMask, NoFlags, Placement } from "./fiberFlags";
import { HostComponent, HostRoot, HostText } from "./workTags";

let nextEffect: FiberNode | null = null;

export const commitMutationEffects = (finishedWork: FiberNode) => {
  nextEffect = finishedWork;

  while (nextEffect !== null) {
    const child: FiberNode | null = nextEffect.child;

    if (((nextEffect.subtreeFlags & MutationMask) !== NoFlags) && child !== null) {
      nextEffect = child;
    } else {
      // 向上遍历
      up: while (nextEffect !== null) {
        commitMutationEffectsOnFiber(nextEffect);
        const sibling: FiberNode | null = nextEffect.sibling;

        // 有兄弟节点, 则看兄弟节点是否是 MutationMask
        if (sibling !== null) {
          nextEffect = sibling;
          break up;
        }

        // 没有兄弟节点, 则看父节点是否是 MutationMask
        nextEffect = nextEffect.return;
      }
    }
  }
}

const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
  const flags = finishedWork.flags;

  if ((flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork);
    finishedWork.flags &= ~Placement;
  }
}

// 将 finishedWork 的 dom 节点 插入到 DOM 树中
const commitPlacement = (finishedWork: FiberNode) => {
  if (__DEV__) {
    console.warn('执行 Placement 操作');
  }

  // parent DOM
  const hostParent = getHostParent(finishedWork);

  if (hostParent !== null) {
    appendPlacementNodeIntoContainer(finishedWork, hostParent);
  }
}

function getHostParent(fiber: FiberNode) {
  let parent = fiber.return;

  while (parent !== null) {
    const parentTag = parent.tag;
    if (parentTag === HostComponent) {
      return parent.stateNode;
    }

    if (parentTag === HostRoot) {
      return (parent.stateNode as FiberRootNode).container;
    }

    parent = parent.return;
  }

  if (__DEV__) {
    console.warn('未找到 HostParent');
  }

  return null;
}

function appendPlacementNodeIntoContainer(finishedWork: FiberNode, hostParent: Container) {
  // fiber host 节点
  if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
    appendChildToContainer(hostParent, finishedWork.stateNode);
    return;
  }

  const child = finishedWork.child;

  if (child !== null) {
    appendPlacementNodeIntoContainer(child, hostParent);

    let sibling = child.sibling;

    while (sibling !== null) {
      appendPlacementNodeIntoContainer(sibling, hostParent);
      sibling = sibling.sibling;
    }
  }
}