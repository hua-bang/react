import { appendChildToContainer, commitTextUpdate, Container, removeChild } from "hostConfig";
import { FiberNode, FiberRootNode } from "./fiber";
import { ChildDeletion, MutationMask, NoFlags, Placement, Update } from "./fiberFlags";
import { FunctionComponent, HostComponent, HostRoot, HostText } from "./workTags";

let nextEffect: FiberNode | null = null;

export const commitMutationEffects = (finishedWork: FiberNode) => {
  if (__DEV__) {
    console.warn('执行 commitMutationEffects', finishedWork);
  }

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

  // Placement
  if ((flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork);
    finishedWork.flags &= ~Placement;
  }

  // Update
  if ((flags & Update) !== NoFlags) {
    commitUpdate(finishedWork);
    finishedWork.flags &= ~Update;
  }

  // ChildDeletion
  if ((flags & ChildDeletion) !== NoFlags) {
    const deletions = finishedWork.deletions;
    if (!deletions) {
      return;
    }

    deletions.forEach(childToDelete => {
      commitDeletion(childToDelete);
    })
    finishedWork.flags &= ~ChildDeletion;
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

const commitUpdate = (fiber: FiberNode) => {
  switch (fiber.tag) {
    case HostText:
      const text = fiber.memoizedProps.content;
      return commitTextUpdate(fiber.stateNode, text);
    default:
      if (__DEV__) {
        console.warn('未实现的类型', fiber);
      }
  }
}

const commitDeletion = (childToDelete: FiberNode) => {
  let rootHostNode: FiberNode | null = null;

  // 递归子树
  commitNestedChildren(childToDelete, unmountFiber => {
    switch (unmountFiber.tag) {
      case HostComponent:
        if (rootHostNode === null) {
          rootHostNode = unmountFiber;
        }
        // TODO: 解绑 ref
        return;
      case HostText:
        if (rootHostNode === null) {
          rootHostNode = unmountFiber;
        }
        return;
      case FunctionComponent:
        // TODO: useEffect
        return;
      default:
        if (__DEV__) {
          console.warn('未实现的类型', unmountFiber);
        }
    }
  });

  if (rootHostNode !== null) {
    const hostParent = getHostParent(rootHostNode);
    if (hostParent !== null) {
      removeChild((rootHostNode as FiberNode).stateNode, hostParent);
    }
  }

  childToDelete.return = null;
  childToDelete.child = null;
}

function commitNestedChildren(root: FiberNode, onCommitUnmount: (fiber: FiberNode) => void) {
  let node = root;

  while (true) {
    onCommitUnmount(node);

    if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }

    if (node === root) {
      return;
    }

    while (node.sibling === null) {
      if (node.return === null || node.return === root) {
        return;
      }
      // 向上遍历
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
}