import { appendChildToContainer, commitTextUpdate, Container, insertChildToContainer, Instance, removeChild } from "hostConfig";
import { FiberNode, FiberRootNode, PendingPassiveEffects } from "./fiber";
import { ChildDeletion, FiberFlags, MutationMask, NoFlags, PassiveEffect, PassiveMask, Placement, Update } from "./fiberFlags";
import { FunctionComponent, HostComponent, HostRoot, HostText } from "./workTags";
import { Effect, FCUpdateQueue } from "./fiberHooks";
import { HookHasEffect } from "./hookEffectTags";

let nextEffect: FiberNode | null = null;

export const commitMutationEffects = (finishedWork: FiberNode, root: FiberRootNode,) => {
  if (__DEV__) {
    console.warn('执行 commitMutationEffects', finishedWork);
  }

  nextEffect = finishedWork;

  while (nextEffect !== null) {
    const child: FiberNode | null = nextEffect.child;

    if (((nextEffect.subtreeFlags & (MutationMask | PassiveMask)) !== NoFlags) && child !== null) {
      nextEffect = child;
    } else {
      // 向上遍历
      up: while (nextEffect !== null) {
        commitMutationEffectsOnFiber(nextEffect, root);
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

const commitMutationEffectsOnFiber = (finishedWork: FiberNode, root: FiberRootNode,) => {
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
      commitDeletion(childToDelete, root);
    })
    finishedWork.flags &= ~ChildDeletion;
  }

  if ((flags & PassiveEffect) !== NoFlags) {
    commitPassiveEffect(finishedWork, root, 'update');
    finishedWork.flags &= ~PassiveEffect;
  }
}

function commitPassiveEffect(
  fiber: FiberNode,
  root: FiberRootNode,
  type: keyof PendingPassiveEffects,
) {
  // update unmount
  if (
    fiber.tag !== FunctionComponent ||  // 非函数组件
    (type === 'update' && (fiber.flags & PassiveEffect) === NoFlags)  // update 且 没有 PassiveEffect flag
  ) {
    return;
  }

  const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
  if (updateQueue !== null) {
    if (updateQueue.lastEffect === null && __DEV__) {
      console.error('当FC存在PassiveEffect flag时，不应该不存在effect');
    }
    if (updateQueue.lastEffect !== null) {
      root.pendingPassiveEffects[type].push(updateQueue.lastEffect);
    }
  }
}

function commitHookEffectList(flags: FiberFlags, lastEffect: Effect | null, callback: (effect: Effect) => void) {
  let effect = lastEffect?.next as Effect;
  do {
    if ((effect.tag & flags) === flags) {
      callback(effect);
    }

    effect = effect.next as Effect;
  } while (effect !== lastEffect?.next);  // 当遍历回到第一个 effect 时，结束循环
}

// 组件卸载
export function commitHookEffectListUnmount(flags: FiberFlags, lastEffect: Effect) {
  commitHookEffectList(flags, lastEffect, (effect) => {
    const destroy = effect.destroy;
    if (typeof destroy === 'function') {
      destroy();
    }
    effect.tag &= ~HookHasEffect;
  });
}

// 触发上一次的 destroy 函数
export function commitHookEffectListDestroy(flags: FiberFlags, lastEffect: Effect) {
  commitHookEffectList(flags, lastEffect, (effect) => {
    const destroy = effect.destroy;
    if (typeof destroy === 'function') {
      destroy();
    }
  });
}

export function commitHookEffectListCreate(flags: FiberFlags, lastEffect: Effect) {
  commitHookEffectList(flags, lastEffect, (effect) => {
    const create = effect.create;
    if (typeof create === 'function') {
      effect.destroy = create();
    }
  });
}

// 将 finishedWork 的 dom 节点 插入到 DOM 树中
const commitPlacement = (finishedWork: FiberNode) => {
  if (__DEV__) {
    console.warn('执行 Placement 操作');
  }

  // parent DOM
  const hostParent = getHostParent(finishedWork);

  // host sibling
  const sibling = getHostSibling(finishedWork);

  if (hostParent !== null) {
    insertOrAppendPlacementNodeIntoContainer(finishedWork, hostParent, sibling);
  }
}

function recordHostChildrenToDelete(
  childrenToDelete: FiberNode[],
  unmountFiber: FiberNode
) {
  // 1. 找到第一个root host节点
  const lastOne = childrenToDelete[childrenToDelete.length - 1];
  if (!lastOne) {
    childrenToDelete.push(unmountFiber);
  } else {
    let node = lastOne.sibling;
    while (node !== null) {
      if (unmountFiber === node) {
        childrenToDelete.push(unmountFiber);
      }
      node = node.sibling;
    }
  }
  // 2. 每找到一个 host节点，判断下这个节点是不是 1 找到那个节点的兄弟节点
}

function getHostSibling(fiber: FiberNode) {
  let node: FiberNode = fiber;
  findSibling: while (true) {
    while (node.sibling === null) {
      const parent = node.return;
      if (
        parent === null ||
        parent.tag === HostComponent ||
        parent.tag === HostRoot
      ) {
        return null;
      }
      node = parent;
    }
    node.sibling.return = node.return;
    node = node.sibling;
    while (node.tag !== HostText && node.tag !== HostComponent) {
      // 向下遍历
      if ((node.flags & Placement) !== NoFlags) {
        continue findSibling;
      }
      if (node.child === null) {
        continue findSibling;
      } else {
        node.child.return = node;
        node = node.child;
      }
    }
    if ((node.flags & Placement) === NoFlags) {
      return node.stateNode;
    }
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

function insertOrAppendPlacementNodeIntoContainer(finishedWork: FiberNode, hostParent: Container, before?: Instance) {
  // fiber host 节点
  if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
    if (before) {
      insertChildToContainer(hostParent, finishedWork.stateNode, before);
    } else {
      appendChildToContainer(hostParent, finishedWork.stateNode);
    }
    return;
  }

  const child = finishedWork.child;

  if (child !== null) {
    insertOrAppendPlacementNodeIntoContainer(child, hostParent);

    let sibling = child.sibling;

    while (sibling !== null) {
      insertOrAppendPlacementNodeIntoContainer(sibling, hostParent);
      sibling = sibling.sibling;
    }
  }
}

const commitUpdate = (fiber: FiberNode) => {
  switch (fiber.tag) {
    case HostText:
      {
        const text = fiber.memoizedProps.content;
        return commitTextUpdate(fiber.stateNode, text);
      }
    default:
      if (__DEV__) {
        console.warn('未实现的类型', fiber);
      }
  }
}

const commitDeletion = (childToDelete: FiberNode, root: FiberRootNode) => {
  const rootChildrenToDelete: FiberNode[] = [];

  // 递归子树
  commitNestedChildren(childToDelete, unmountFiber => {
    switch (unmountFiber.tag) {
      case HostComponent:
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber);
        // TODO: 解绑 ref
        return;
      case HostText:
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber);
        return;
      case FunctionComponent:
        // TODO: useEffect
        commitPassiveEffect(unmountFiber, root, 'unmount');
        return;
      default:
        if (__DEV__) {
          console.warn('未实现的类型', unmountFiber);
        }
    }
  });

  if (rootChildrenToDelete.length) {
    const hostParent = getHostParent(childToDelete);
    if (hostParent !== null) {
      rootChildrenToDelete.forEach((node) => {
        removeChild(node.stateNode, hostParent);
      });
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