import { Context } from 'shared/context';

let prevContextValue: any = null;
const prevContextValueStack: any[] = [];
export function pushProvider<T>(context: Context<T>, newValue: T) {
  prevContextValueStack.push(prevContextValue);
  prevContextValue = context._currentValue;
  context._currentValue = newValue;
}

export function popProvider<T>(context: Context<T>) {
  context._currentValue = prevContextValue;
  prevContextValue = prevContextValueStack.pop();
}