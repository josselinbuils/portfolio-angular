import { Dayjs } from 'dayjs';

/* SystemJS module definition */
declare var module: NodeModule;
interface NodeModule {
  id: string;
}

// From: https://github.com/iamkun/dayjs/pull/418/files#diff-e5e546dd2eb0351f813d63d1b39dbc48
// TODO remove it when PR above merged
type DateType = string | number | Date | Dayjs;

declare module 'dayjs' {
  interface Dayjs {
    fromNow(withoutSuffix?: boolean): string;
    from(compared: DateType, withoutSuffix?: boolean): string;
    toNow(withoutSuffix?: boolean): string;
    to(compared: DateType, withoutSuffix?: boolean): string;
  }
}
