import stringLength from "string-length";
import { cursorTo, mutex } from "../util";
import chalk, { type ChalkInstance } from "chalk";

export type BoxConfig = {
  top: number;
  left: number;
  bottom: number;
  right: number;
  title?: string;
  outline?: boolean;
  content?: string;
  paddingX?: number;
  paddingY?: number;
  showScrollBar?: boolean;
  style?: {
    outline?: ChalkInstance;
    scrollBar?: {
      bg: string;
      fg: string;
    };
  };
  isImage?: boolean;
  scrollable?: boolean;
};

export default function box(config: BoxConfig) {
  let prevContent: string | undefined;
  let lines: string[] = [];

  function getDisplayLine(i: number) {
    if (i < 0) return " ".repeat(contentWidth);
    // const line = (lines.at(i) ?? "").slice(0, contentWidth);
    const line = lines.at(i) ?? "";
    if (config.scrollable) {
      return `${line}${" ".repeat(Math.max(0, contentWidth - stringLength(line)))}`;
    }
    return line;
  }

  const width = config.right - config.left + 1;
  const height = config.bottom - config.top + 1;
  const paddingX = config.paddingX ?? 0;
  const paddingY = config.paddingY ?? 0;

  const contentLeft = config.left + paddingX + 1;
  const contentTop = config.top + paddingY + 1;
  const contentWidth =
    width - 2 * paddingX - 2 - (config.showScrollBar ? 1 : 0);
  const contentHeight = height - 2 * paddingY - 2;

  const style = {
    outline: chalk.gray,
    scrollBar: {
      bg: chalk.bgGray(" "),
      fg: chalk.bgWhite(" "),
    },
    ...config.style,
  };

  let prevContentBuffer: string[] = [];
  let contentBuffer: string[] = [];

  let prevScrollX = 0;
  let prevScrollY = 0;
  let scrollX = 0;
  let scrollY = 0;

  function getScrollBarYPos() {
    const binSize = lines.length / contentHeight;
    const scalar = (height - 2) / contentHeight;
    const top = Math.round((scrollY * scalar) / binSize);
    const length = (contentHeight * scalar) / binSize;
    return {
      top,
      bottom: top + length,
    };
  }

  let drewOutline = false;

  return {
    async draw() {
      await mutex.runExclusive(async () => {
        if (config.outline && !drewOutline) {
          await cursorTo(config.left, config.top);
          console.write(style.outline(`┌${"─".repeat(width - 2)}┐`));
          if (config.title) {
            const padding = Math.floor(
              (width - stringLength(config.title)) / 2 - 2,
            );
            await cursorTo(config.left + padding, config.top);
            console.write(` ${config.title} `);
          }
          for (let y = config.top + 1; y <= config.bottom - 1; y++) {
            await cursorTo(config.left, y);
            console.write(style.outline("│"));
            await cursorTo(config.right, y);
            console.write(style.outline("│"));
          }
          await cursorTo(config.left, config.bottom);
          console.write(style.outline(`└${"─".repeat(width - 2)}┘`));
          drewOutline = true;
        }
        let redraw = false;
        if (prevContent !== config.content) {
          prevScrollX = 0;
          prevScrollY = 0;
          scrollX = 0;
          scrollY = 0;
          lines = config.content?.split("\n") ?? [];
          contentBuffer = [];
          for (let i = 0; i < contentHeight; i++) {
            const line = getDisplayLine(i);
            contentBuffer.push(
              `${line}${" ".repeat(Math.max(0, contentWidth - stringLength(line)))}`,
            );
          }
          prevContent = config.content;
          prevContentBuffer = [...contentBuffer];
          redraw = true;
        } else {
          if (prevScrollY !== scrollY) {
            for (let i = 0; i < contentHeight; i++) {
              const prevIndex = i + scrollY - prevScrollY;
              if (0 < prevIndex && prevIndex < contentBuffer.length) {
                contentBuffer[i] = prevContentBuffer[prevIndex];
              } else {
                contentBuffer[i] = getDisplayLine(i + scrollY);
              }
            }
            prevScrollY = scrollY;
            redraw = true;
          }
        }
        if (redraw) {
          if (config.isImage) {
            await cursorTo(contentLeft, contentTop);
            console.write(config.content ?? "");
          } else {
            for (const [i, line] of contentBuffer.entries()) {
              await cursorTo(contentLeft, contentTop + i);
              console.write(line);
            }
          }
          if (config.showScrollBar) {
            const scrollBarYPos = getScrollBarYPos();
            for (let i = 0; i < contentHeight; i++) {
              const y = config.top + 1 + i;
              await cursorTo(config.right - 1, y);
              if (scrollBarYPos.top <= i && i <= scrollBarYPos.bottom) {
                console.write(style.scrollBar.fg);
              } else {
                console.write(style.scrollBar.bg);
              }
            }
          }
          prevContentBuffer = [...contentBuffer];
        }
      });
    },
    setContent(content: string) {
      config.content = content;
    },
    setScrollX(x: number) {
      scrollX = x;
    },
    moveScrollX(d: number) {
      scrollX += d;
    },
    setScrollY(y: number) {
      scrollY = y;
    },
    moveScrollY(d: number) {
      scrollY += d;
    },
    getContentWidth() {
      return contentWidth;
    },
    getContentHeight() {
      return contentHeight;
    },
  };
}
