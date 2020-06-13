import { Observable } from 'rxjs';
declare type SocketOptions = SocketIOClient.ConnectOpts | (() => SocketIOClient.ConnectOpts);
declare type MessageWithAck<T, P> = {
    ack: (_: P) => void;
    data: T;
};
export declare enum Status {
    NOT_CONNECTED = 0,
    CONNECTING = 1,
    CONNECTED = 2,
    RECONNECTING = 3,
    RECONNECTED = 4,
    DISCONNECTED = 5,
    CLOSED = 6
}
export declare class RxSocketClient {
    #private;
    readonly serverUrl: string;
    readonly socketOptions: SocketOptions;
    readonly errorPredicationCallback: (response: unknown) => boolean;
    constructor(serverUrl: string, socketOptions?: SocketOptions, errorPredicationCallback?: (response: unknown) => boolean);
    get id(): string;
    get status(): Status;
    get status$(): Observable<Status>;
    init(): Observable<boolean>;
    close(): void;
    emit<T>(action: string, payload?: unknown): Observable<T>;
    listen<T>(action: string): Observable<T>;
    listenWithAck<T, P>(action: string): Observable<MessageWithAck<T, P>>;
}
export {};
