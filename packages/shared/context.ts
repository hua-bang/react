export interface Context<T> {
  $$typeof: symbol | number;
  Provider: Provider<T> | null;
  _currentValue: T;
}

export interface Provider<T> {
  $$typeof: symbol | number;
  _context: Context<T>;
}
