import { Mutex } from "async-mutex";

export const mutex = new Mutex();

export async function cursorTo(x: number, y: number) {
  await new Promise<void>((resolve) => process.stdout.cursorTo(x, y, resolve));
}
