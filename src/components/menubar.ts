import chalk, { type ChalkInstance } from "chalk";
import stringLength from "string-length";
import { cursorTo, mutex } from "../util";

export type MenubarConfig = {
  top: number;
  left: number;
  right: number;
  items: string[];
  spacing?: number;
  style?: {
    bg?: string;
    selected?: ChalkInstance;
    actionKeyStyle?: ChalkInstance;
  };
  actionKeys?: string[];
  selectable?: boolean;
};

export default function menubar(config: MenubarConfig) {
  const width = config.right - config.left + 1;

  const style = {
    bg: " ",
    selected: chalk.bgWhite.black,
    actionKeyStyle: chalk.red,
    ...config.style,
  };

  let drewBackground = false;
  let selectedIndex = 0;

  return {
    async draw() {
      await mutex.runExclusive(async () => {
        const content = config.items
          .map((item, i) => {
            if (config.selectable && i === selectedIndex) {
              return style.selected(item);
            }
            for (const actionKey of config.actionKeys ?? []) {
              if (item.includes(actionKey)) {
                item = item.replace(actionKey, style.actionKeyStyle(actionKey));
                break;
              }
            }
            return item;
          })
          .join(style.bg.repeat(config.spacing ?? 1));
        const padding = Math.floor((width - stringLength(content)) / 2);
        await cursorTo(config.left + padding, config.top);
        console.write(content);
        if (!drewBackground) {
          await cursorTo(config.left, config.top);
          console.write(style.bg.repeat(padding));
          await cursorTo(
            config.left + padding + stringLength(content),
            config.top,
          );
          console.write(
            style.bg.repeat(width - padding - stringLength(content)),
          );
        }
      });
    },
    setSelectedIndex(i: number) {
      selectedIndex = i;
    },
    moveSelectedIndex(d: number) {
      const newIndex = selectedIndex + d;
      if (0 <= newIndex && newIndex < config.items.length) {
        selectedIndex = newIndex;
      }
    },
    getSelectedIndex() {
      return selectedIndex;
    },
  };
}
