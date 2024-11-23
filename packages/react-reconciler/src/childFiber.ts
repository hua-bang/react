import { Key, Props, ReactElementType } from "shared/ReactTypes";
import { createFiberFromElement, createFiberFromFragment, createWorkInProgress, FiberNode } from "./fiber";
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from "shared/ReactSymbols";
import { Fragment, HostText } from "./workTags";
import { ChildDeletion, Placement } from "./fiberFlags";

type ExistingChildren = Map<string | number, FiberNode>;

function ChildReconciler(shouldTrackEffects: boolean) {

  function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
    if (!shouldTrackEffects) {
      return;
    }
    const deletions = returnFiber.deletions;
    if (!deletions) {
      returnFiber.deletions = [childToDelete];
      returnFiber.flags |= ChildDeletion;
    } else {
      returnFiber.deletions?.push(childToDelete);
    }
  }

  function deleteRemainingChildren(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
  ) {
    if (!shouldTrackEffects) {
      return;
    }
    let childToDelete = currentFirstChild;
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete);
      childToDelete = childToDelete.sibling;
    }
  }

  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    element: ReactElementType,
  ) {

    const key = element.key;

    while (currentFiber !== null) {
      // 注意：这块是 ReactElement 和 fiber 类型进行比较
      // key 相同
      if (key === currentFiber.key) {

        if (element.$$typeof === REACT_ELEMENT_TYPE) {
          if (element.type === currentFiber.type) {
            let props = element.props;
            if (element.type === REACT_FRAGMENT_TYPE) {
              props = element.props.children;
            }
            // 可以复用
            const exist = useFiber(currentFiber, props);
            exist.return = returnFiber;
            // 需要删除其他的兄弟节点
            deleteRemainingChildren(returnFiber, currentFiber.sibling);
            return exist;
          }
          // key 相同, type 不同 不能复用，走删除
          deleteRemainingChildren(returnFiber, currentFiber);
          break;
        } else {
          if (__DEV__) {
            console.warn('未实现的类型', element);
            break;
          }
        }
      } else {
        // 删除
        // 看看是不是下个兄弟能够复用
        deleteChild(returnFiber, currentFiber);
        currentFiber = currentFiber.sibling;
      }

    }

    // 根据 element 生成 fiberNode
    let fiber;

    if (element.type === REACT_FRAGMENT_TYPE) {
      fiber = createFiberFromFragment(element.props.children, element.key);
    } else {
      fiber = createFiberFromElement(element);
    }
    fiber.return = returnFiber;
    return fiber;
  }

  function reconcileSingleTextNode(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    content: string | number,
  ) {
    while (currentFiber !== null) {
      if (currentFiber.tag === HostText) {
        const existing = useFiber(currentFiber, { content });
        existing.return = returnFiber;
        deleteRemainingChildren(returnFiber, currentFiber.sibling);
        return existing;
      } else {
        // 删除
        deleteChild(returnFiber, currentFiber);
        currentFiber = currentFiber.sibling;
      }
    }
    const fiber = new FiberNode(HostText, { content }, null);
    fiber.return = returnFiber;
    return fiber;
  }

  function placeSingleChild(
    fiber: FiberNode,
  ) {
    if (shouldTrackEffects && fiber.alternate === null) {
      fiber.flags |= Placement;
    }

    return fiber;
  };

  function reconcileChildArray(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    newChild: any[],
  ) {
    let lastPlacedIndex = 0;
    let lastNewFiber: FiberNode | null = null;

    // 创建的第一个fiber
    let firstNewFiber: FiberNode | null = null;

    // 1. 保存在 map 中
    const existingChildren: ExistingChildren = new Map();
    let current = currentFirstChild;
    while (current !== null) {
      const keyToUse = current.key !== null ? current.key : current.index;
      existingChildren.set(keyToUse, current);
      current = current.sibling;
    }

    for (let i = 0; i < newChild.length; i++) {
      // 2. 遍历 newChild， 寻找是否可复用
      const after = newChild[i];
      const newFiber = updateFromMap(returnFiber, existingChildren, i, after);
      if (newFiber === null) {
        continue;
      }

      // 3. 标记移动还是插入
      newFiber.index = i;
      newFiber.return = returnFiber;

      // 构成链表
      if (lastNewFiber === null) {
        lastNewFiber = newFiber;
        firstNewFiber = newFiber;
      } else {
        lastNewFiber.sibling = newFiber;
        lastNewFiber = lastNewFiber.sibling;
      }

      if (!shouldTrackEffects) {
        continue;
      }

      const current = newFiber.alternate;

      if (current !== null) {
        // 如果有 current，需要比较 index
        const oldIndex = current.index;
        // 每次更新 lastPlacedIndex
        // 如果当前的 index 小于 lastPlacedIndex， 说明移动
        // 而当前的 index 大于 lastPlacedIndex， 说明没有移动
        if (oldIndex < lastPlacedIndex) {
          // 说明有移动
          newFiber.flags |= Placement;
          continue;
        } else {
          // 说明没有移动
          lastPlacedIndex = oldIndex;
        }
      } else {
        // mount 如果没有 current， 说明是新增的 fiber
        newFiber.flags |= Placement;
      }
    }

    // 4. 删除其他的节点
    existingChildren.forEach(fiber => {
      deleteChild(returnFiber, fiber);
    });


    return firstNewFiber;
  }

  function updateFromMap(
    returnFiber: FiberNode,
    existingChildren: ExistingChildren,
    index: number,
    element: any
  ): FiberNode | null {
    const keyToUse = element.key !== null ? element.key : index;
    const before = existingChildren.get(keyToUse);

    if (typeof element === 'string' || typeof element === 'number') {
      // HostText
      if (before) {
        // 如果可以复用
        if (before.tag === HostText) {
          existingChildren.delete(keyToUse);
          return useFiber(before, { content: element });
        }

        // 如果不能复用, 则返回一个新的 fiber
        return new FiberNode(HostText, { content: element }, null);
      }
    }

    // ReactElement
    if (typeof element === 'object' && element !== null) {
      switch (element.$$typeof) {
        case REACT_ELEMENT_TYPE:
          if (element.type === REACT_FRAGMENT_TYPE) {
            return updateFragment(
              returnFiber,
              before,
              element,
              keyToUse,
              existingChildren
            )
          }
          if (before) {
            if (before.type === element.type) {
              // 可以复用
              existingChildren.delete(keyToUse);  // 删除
              return useFiber(before, element.props);
            }
          };
          return createFiberFromElement(element);
        default:
          if (__DEV__) {
            console.warn('未实现的类型', element);
          }
          break;
      }
    }

    // TODO 数组类型
    if (Array.isArray(element)) {
      return updateFragment(
        returnFiber,
        before,
        element,
        keyToUse,
        existingChildren
      )
    }
    return null;
  }

  return function reconcileChildFibers(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild?: ReactElementType,
  ) {

    const isUnkeyedTopLevelFragment =
      typeof newChild === 'object' &&
      newChild !== null &&
      newChild.type === REACT_FRAGMENT_TYPE &&
      newChild.key === null;

    // 处理 Fragment 类型，如 <div><>123123</></div>
    if (isUnkeyedTopLevelFragment) {
      newChild = newChild?.props.children;
    }

    if (typeof newChild === 'object' && newChild !== null) {
      // 多节点的情况 ul > li * 3
      if (Array.isArray(newChild)) {
        return reconcileChildArray(returnFiber, currentFiber, newChild);
      }

      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(reconcileSingleElement(returnFiber, currentFiber, newChild));
        default:
          if (__DEV__) {
            console.warn('未实现的类型', newChild);
          }
          break;
      }
    }

    // HostText
    if (typeof newChild === 'string' || typeof newChild === 'number') {
      return placeSingleChild(reconcileSingleTextNode(
        returnFiber,
        currentFiber,
        newChild,
      ));
    }

    if (currentFiber) {
      // 兜底删除
      deleteRemainingChildren(returnFiber, currentFiber);
    }

    if (__DEV__) {
      console.warn('未实现的类型', newChild);
    }

    return null;
  }
}

function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
  const clone = createWorkInProgress(fiber, pendingProps);
  clone.index = 0;
  clone.sibling = null;
  return clone;
}

function updateFragment(
  returnFiber: FiberNode,
  current: FiberNode | undefined,
  elements: any[],
  key: Key,
  existingChildren: ExistingChildren
) {
  let fiber;
  if (!current || current.tag !== Fragment) {
    fiber = createFiberFromFragment(elements, key);
  } else {
    existingChildren.delete(key);
    fiber = useFiber(current, elements);
  }
  fiber.return = returnFiber;
  return fiber;
}

export const reconcileChildFibers = ChildReconciler(true);
export const mountChildFibers = ChildReconciler(false);