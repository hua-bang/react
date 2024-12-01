import { Container, elementPropsKey } from "hostConfig";
import { unstable_ImmediatePriority, unstable_NormalPriority, unstable_runWithPriority, unstable_UserBlockingPriority } from "scheduler";
const validEventTypeList = ['click'];

type EventCallback = (e: Event) => void;

interface SyntheticEvent extends Event {
  __stopPropagation: boolean;
}

interface Paths {
  capture: EventCallback[];
  bubble: EventCallback[];
}

export const createSyntheticEvent = (e: Event) => {
  const syntheticEvent = e as SyntheticEvent;
  syntheticEvent.__stopPropagation = false;
  const originStopPropagation = e.stopPropagation;

  syntheticEvent.stopPropagation = () => {
    syntheticEvent.__stopPropagation = true;
    if (originStopPropagation) {
      originStopPropagation();
    }
  };

  return syntheticEvent;
}

export const initEvent = (container: Element, eventType: string) => {
  if (!validEventTypeList.includes(eventType)) {
    throw new Error('不支持的事件类型');
  }

  if (__DEV__) {
    console.warn('初始化事件');
  }

  document.addEventListener(eventType, (e) => {
    dispatchEvent(container, eventType, e);
  }, true);
}

const dispatchEvent = (container: Container, eventType: string, e: Event) => {
  const targetElement = e.target;

  if (targetElement === null) {
    return;
  }
  // 1. 收集沿途事件
  const { capture, bubble } = collectPaths(targetElement as Element, container, eventType);

  // 2. 生成事件对象
  const se = createSyntheticEvent(e);
  // 3. 执行捕获事件
  triggerEventFlow(capture, se);
  // 4. 执行冒泡事件
  triggerEventFlow(bubble, se);
}

/**
 * 触发事件流
 * @param paths - 事件回调函数数组
 * @param se - 合成事件对象
 */
function triggerEventFlow(paths: EventCallback[], se: SyntheticEvent) {
  paths.forEach((callback) => {
    unstable_runWithPriority(eventTypeToSchedulerPriority(se.type), () => {
      callback.call(null, se);
    });
  })
}

/**
 * 根据事件类型获取事件回调函数名称
 * @param eventType - 事件类型
 * @returns 事件回调函数名称数组，如果事件类型不支持，则返回 undefined
 */
function getEventCallbackNameFromEventType(
  eventType: string
): string[] | undefined {
  return {
    click: ['onClickCapture', 'onClick']
  }[eventType];
}

const collectPaths = (targetElement: Element, Container: Container, eventType: string) => {
  const paths: Paths = {
    capture: [],
    bubble: []
  };

  while (targetElement && targetElement !== Container) {
    const elementProps = targetElement[elementPropsKey];
    targetElement = targetElement.parentNode as Element;
    if (!elementProps) {
      continue;
    }

    const callbackNameList = getEventCallbackNameFromEventType(eventType);
    if (callbackNameList) {
      callbackNameList.forEach((callbackName, i) => {
        const eventCallBack = elementProps[callbackName];
        if (!eventCallBack) {
          return;
        }
        if (i === 0) {
          // 捕获需要倒序插入
          paths.capture.unshift(eventCallBack);
        } else {
          // 冒泡需要正序插入
          paths.bubble.push(eventCallBack);
        }
      })
    }
  }

  return paths;
}

function eventTypeToSchedulerPriority(eventType: string) {
  switch (eventType) {
    case 'click':
    case 'keydown':
    case 'keyup':
      return unstable_ImmediatePriority;
    case 'scroll':
      return unstable_UserBlockingPriority;
    default:
      return unstable_NormalPriority;
  }
}