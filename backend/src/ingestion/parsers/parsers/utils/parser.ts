export type StreamedParseHandler<T> =
    ((value: T, timestamp: number) => void)
    | ((value: T, timestamp: number) => Promise<void>);

export abstract class Parser<I, O> {

    private _startTime?: number;

    constructor(startTime?: number) {
        this._startTime = startTime;
    }

    abstract parse(input: I, handler: StreamedParseHandler<O>): Promise<O[]>;

    protected markStart(): number {
        this._startTime = Date.now();
        return this._startTime;
    }

    protected startTime(): number | undefined {
        return this._startTime;
    }

    protected timeSinceStart(): number {
        return Date.now() - (this._startTime ?? Date.now());
    }

    protected resetTime() {
        return this.markStart();
    }
}
