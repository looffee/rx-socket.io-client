import {
  BehaviorSubject,
  Observable,
  Observer,
  TeardownLogic,
  throwError,
  merge,
} from 'rxjs';
import {
  filter,
  map,
  flatMap,
  distinctUntilChanged,
} from 'rxjs/operators';
import * as io from 'socket.io-client';

type SocketOptions = SocketIOClient.ConnectOpts | (() => SocketIOClient.ConnectOpts);
type MessageWithAck<T, P> = {ack: (_: P) => void; data: T};

export enum Status {
  NOT_CONNECTED,
  CONNECTING,
  CONNECTED,
  RECONNECTING,
  RECONNECTED,
  DISCONNECTED,
  CLOSED
}

export class RxSocketClient {
  #socket: SocketIOClient.Socket | null = null;
  readonly #status$: BehaviorSubject<Status> = new BehaviorSubject(Status.NOT_CONNECTED as Status);
  readonly #getSocket: () => SocketIOClient.Socket = () => {
    if (this.#socket === null) {
      throw new Error('Socket is not inited!');
    }

    return this.#socket;
  };
  readonly #onSocketDisconnect$: () => Observable<void> = () => this.#status$
    .pipe(distinctUntilChanged())
    .pipe(filter((status) => status === Status.DISCONNECTED))
    .pipe(map(() => undefined));
  readonly #mergeWithSocketCloseEvent = <T>(obs: Observable<T>): Observable<T> => merge(
    this.#onSocketDisconnect$()
      .pipe(flatMap(() => throwError('Socket connection lost!'))),
    obs,
  );

  constructor(
    public readonly serverUrl: string,
    public readonly socketOptions: SocketOptions = {},
    public readonly errorPredicationCallback: (response: unknown) => boolean = (): boolean => false,
  ) {
    if ((typeof serverUrl) !== 'string') {
      throw new Error('"serverUrl" isn\'t provided!');
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('RxSocketClient::constructor: ', { serverUrl, socketOptions });

      this.#status$
        .subscribe((status) => {
          console.log('RxSocketClient::#status$: ', status);
        });
    }
  }

  get id(): string {
    return this.#getSocket().id;
  }

  get status(): Status {
    return this.#status$.value;
  }

  get status$(): Observable<Status> {
    return this.#status$.asObservable();
  }

  init(): Observable<boolean> {
    if (process.env.NODE_ENV !== 'production') {
      console.log('RxSocketClient::init');
    }

    if (this.status === Status.CONNECTED) {
      throw new Error('Trying to connect already connected socket connection!');
    }

    if (this.status === Status.CONNECTING) {
      throw new Error('Previous connecting is pending!');
    }

    this.#status$.next(Status.CONNECTING);

    return new Observable((observer: Observer<boolean>) => {
      const socket = io.connect(
        this.serverUrl,
        typeof this.socketOptions === 'object' ?
          this.socketOptions : (this.socketOptions as (() => SocketIOClient.ConnectOpts))(),
      );

      const onInitializationError = (_: unknown): void => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('RxSocketClient::init::onInitializationError');
        }

        this.#status$.next(Status.NOT_CONNECTED);
        observer.error(_);
      };
      socket.once('connect_error', onInitializationError);
      socket.once('connect_timeout', onInitializationError);

      socket.once('connect', () => {
        socket.off('connect_error', onInitializationError);
        socket.off('connect_timeout', onInitializationError);

        this.#socket = socket;
        this.#status$.next(Status.CONNECTED);

        socket.on('connect_error', () => this.#status$.next(Status.DISCONNECTED));
        socket.on('connect_timeout', () => this.#status$.next(Status.DISCONNECTED));
        socket.on('reconnecting', () => this.#status$.next(Status.RECONNECTING));
        // socket.on('reconnect_error', () => this.#status$.next(Status.CLOSED));
        // socket.on('reconnect_failed', () => this.#status$.next(Status.CLOSED));
        socket.on('reconnect', () => {
          this.#status$.next(Status.RECONNECTED);
          this.#status$.next(Status.CONNECTED);
        });

        observer.next(true);
        observer.complete();
      });
    });
  }

  close(): void {
    this.#status$.next(Status.CLOSED);
    this.#status$.complete();
    this.#getSocket().removeAllListeners();
    this.#getSocket().close();
    this.#socket = null;

    if (process.env.NODE_ENV !== 'production') {
      console.log('RxSocketClient::close');
    }
  }

  emit<T>(
    action: string,
    payload: unknown = {},
  ): Observable<T> {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`RxSocketClient::emit: "${action}"`, payload);
    }

    const responseObs = new Observable((observer: Observer<T>) => {
      this.#getSocket()
        .emit(
          action,
          typeof payload === 'object' ? { ...payload } : {},
          (response: unknown) => {
            if (process.env.NODE_ENV !== 'production') {
              console.log(`RxSocketClient::emit: "${action}" response`, response);
            }

            // TODO: make error predication function
            // if (
            //   typeof response === 'object' &&
            //   !!response &&
            //   'errorId' in response
            // ) {
            //   observer.error(response);
            //   return;
            // }
            if (this.errorPredicationCallback(response)) {
              observer.error(response);
              return;
            }

            observer.next(response as T);
            observer.complete();
          },
        );
    });

    return this.#mergeWithSocketCloseEvent(responseObs);
  }

  listen<T>(action: string): Observable<T> {
    const msgsObs = new Observable((observer: Observer<T>) => {
      function callback(message: T): void {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`RxSocketClient::listen: "${action}" callback`, message);
        }

        observer.next(message);
      }

      this.#getSocket().on(action, callback);

      return {
        unsubscribe: (): void => {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`RxSocketClient::listen: "${action}" unsubscribe`);
          }

          this.#getSocket().off(action, callback);
        },
      } as TeardownLogic;
    });

    return this.#mergeWithSocketCloseEvent(msgsObs);
  }

  listenWithAck<T, P>(action: string): Observable<MessageWithAck<T, P>> {
    const msgsObs = new Observable((observer: Observer<MessageWithAck<T, P>>) => {
      function callback(message: T, ack: (_: P) => void): void {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`RxSocketClient::listenWithAck: "${action}" callback`, message);
        }

        observer.next({
          ack,
          data: message,
        });
      }

      this.#getSocket().on(action, callback);

      return {
        unsubscribe: (): void => {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`RxSocketClient::listenWithAck: "${action}" unsubscribe`);
          }

          this.#getSocket().off(action, callback);
        },
      } as TeardownLogic;
    });

    return this.#mergeWithSocketCloseEvent(msgsObs);
  }
}
