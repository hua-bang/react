import { Props, ReactElementType } from "shared/ReactTypes";
import { createFiberFromElement, createWorkInProgress, FiberNode } from "./fiber";
import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import { HostText } from "./workTags";
import { ChildDeletion, Placement } from "./fiberFlags";

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

  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    element: ReactElementType,
  ) {

    const key = element.key;

    if (currentFiber !== null) {
      // 注意：这块是 ReactElement 和 fiber 类型进行比较
      // key 相同
      if (key === currentFiber.key) {

        if (element.$$typeof === REACT_ELEMENT_TYPE) {
          if (element.type === currentFiber.type) {
            // 可以复用
            const exist = useFiber(currentFiber, element.props);
            exist.return = returnFiber;
            return exist;
          }
          // 不能复用，走删除
          deleteChild(returnFiber, currentFiber);
        } else {
          if (__DEV__) {
            console.warn('未实现的类型', element);
          }
        }
      } else {
        // 删除
        deleteChild(returnFiber, currentFiber);
      }

    }

    // 根据 element 生成 fiberNode
    const fiber = createFiberFromElement(element);
    fiber.return = returnFiber;
    return fiber;
  }

  function reconcileSingleTextNode(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    content: string | number,
  ) {
    if (currentFiber !== null) {
      if (currentFiber.tag === HostText) {
        const existing = useFiber(currentFiber, { content });
        existing.return = returnFiber;
        return existing;
      } else {
        // 删除
        deleteChild(returnFiber, currentFiber);
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

  return function reconcileChildFibers(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild?: ReactElementType,
  ) {

    if (typeof newChild === 'object' && newChild !== null) {
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
    // TODO: 多节点的情况

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
      deleteChild(returnFiber, currentFiber);
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

export const reconcileChildFibers = ChildReconciler(true);
export const mountChildFibers = ChildReconciler(false);