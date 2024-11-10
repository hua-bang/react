import { Dispatcher } from "shared/dispatch";

const currentDispatcher: { current: Dispatcher | null } = {
  current: null,
};

export const resolveDispatcher = () => {
  const dispatcher = currentDispatcher.current;

  if (dispatcher === null) {
    throw new Error('hooks只能在函数组件中使用');
  }

  return dispatcher;
}

export default currentDispatcher;