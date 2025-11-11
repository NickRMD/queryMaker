/**
 * Callback function type for subscribers.
 * It can return void or a Promise<void>.
 */
export type callbackFn<T> = (value: T) => any | Promise<any>;

/**
 * Signal class to manage a value and notify subscribers on changes.
 * It supports subscribing, subscribing once, and clearing subscribers.
 */
export default class Signal<T = null> {
  /**
   * If true, subscribers are notified immediately upon subscription.
   * Useful for late subscribers to get the current value right away.
   */
  public immediate: boolean;

  /**
   * List of subscriber callback functions.
   */
  private subscribers: callbackFn<T>[] = [];

  /**
   * The current value of the signal.
   */
  private _value: T | null = null;

  /**
   * Creates a new Signal instance with an initial value.
   * @param initialValue - The initial value of the signal.
   * @param immediate - If true, subscribers are notified immediately upon subscription.
   */
  constructor(initialValue: T | null = null, immediate: boolean = false) {
    this._value = initialValue;
    this.immediate = immediate;
  }

  /**
   * Creates a new Signal instance with an initial value.
   * @param initialValue - The initial value of the signal.
   * @param immediate - If true, subscribers are notified immediately upon subscription.
   * @returns A new Signal instance.
   */
  public static create<U>(
    initialValue: U | null = null,
    immediate: boolean = false,
  ): Signal<U> {
    return new Signal<U>(initialValue, immediate);
  }

  /**
   * Destroys the signal by clearing subscribers and setting the value to null.
   */
  public destroy() {
    this.clearSubscribers();
    this._value = null;
  }

  /**
   * The current value of the signal.
   */
  public get value(): T {
    return this._value as T;
  }

  public set value(newValue: T) {
    this._value = newValue;
    this.notifySubscribers(newValue);
  }

  /**
   * Sets the value of the signal using a callback function.
   * The callback receives the current value and should return the new value.
   * @param callback - The callback function to compute the new value.
   */
  public setValue(callback: (currentValue: T) => any) {
    callback(this._value!);
    this.notifySubscribers(this._value as T);
  }

  /**
   * Subscribes to changes in the signal's value.
   * @param callback - The callback function(s) to be called when the value changes.
   * @returns A function to unsubscribe the provided callbacks.
   */
  public subscribe(...callback: callbackFn<T>[]) {
    this.subscribers.push(...callback);

    if (this.immediate && this._value !== null) {
      for (const cb of callback) {
        void cb(this._value);
      }
    }

    // Return an unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(
        (sub) => !callback.includes(sub),
      );
    };
  }

  /**
   * Subscribes to the signal's value changes only once.
   * The callback will be called the next time the value changes and then unsubscribed.
   * @param callback - The callback function(s) to be called when the value changes.
   * @returns A function to unsubscribe the provided callbacks if they haven't been called yet.
   */
  public subscribeOnce(...callback: callbackFn<T>[]) {
    const onceCallbacks = callback.map((cb) => {
      const wrapper: callbackFn<T> = (value: T) => {
        cb(value);
        this.subscribers = this.subscribers.filter((sub) => sub !== wrapper);
      };
      return wrapper;
    });
    this.subscribers.push(...onceCallbacks);

    if (this.immediate && this._value !== null) {
      for (const cb of onceCallbacks) {
        void cb(this._value);
      }
    }

    // Return an unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(
        (sub) => !onceCallbacks.includes(sub),
      );
    };
  }

  /**
   * Notifies all subscribers with the new value.
   * @param value - The new value to be passed to subscribers.
   */
  private notifySubscribers(value: T) {
    for (const subscriber of this.subscribers) {
      subscriber(value);
    }
  }

  /**
   * Clears all subscribers from the signal.
   */
  public clearSubscribers() {
    this.subscribers = [];
  }
}
