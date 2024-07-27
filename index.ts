import moment from "moment-timezone";
import { getConvOutlook, listConvOutlooks, type ConvOutlook } from "./src/spc";
import readline from "node:readline";
import box from "./src/components/box";
import menubar from "./src/components/menubar";
import chalk from "chalk";
import terminalImage from "terminal-image";
import got from "got";

moment.tz.setDefault("UTC");

let screenRight = process.stdout.columns - 1;
let screenBottom = process.stdout.rows - 1;

let showForecast = true;
let showOutlook = true;

console.log("Loading SPC Outlooks...");

const date = moment(new Date());
const outlooks = await listConvOutlooks(date);

if (!outlooks) {
  console.error("Failed to load");
  process.exit(1);
}

const latestOutlooks = [];
{
  let prevOutlook;
  let prev;
  for (const outlook of outlooks) {
    const curr = outlook.split("_").at(0);
    if (curr && prev && prevOutlook && prev !== curr) {
      latestOutlooks.push(prevOutlook);
    }
    prevOutlook = outlook;
    prev = curr;
  }
  const lastOutlook = outlooks.at(-1);
  if (lastOutlook) {
    latestOutlooks.push(lastOutlook);
  }
}

const outlookMenuItems = latestOutlooks
  .map((outlook) => ({
    href: outlook,
    name:
      outlook
        .split("/")
        .at(-1)
        ?.split("_")
        .at(0)
        ?.replace("day", "day ")
        .replace("otlk", "") ?? "",
  }))
  .filter((outlook) => outlook.name !== "");

let dayMenubar: any;
let forecastTextarea: any;
let outlookBox: any;

let outlook: ConvOutlook;
async function updateOutlook() {
  outlook = (await getConvOutlook(
    outlookMenuItems[dayMenubar.getSelectedIndex()].href,
  )) ?? {
    categoricalOutlookUrl: "",
    text: "Not found",
  };

  const body = await got(outlook.categoricalOutlookUrl).buffer();
  const img = await terminalImage.buffer(body, {
    width: outlookBox.getContentWidth(),
    height: outlookBox.getContentHeight(),
  });
  outlookBox.setContent(img);
  await outlookBox.draw();

  forecastTextarea.setContent(outlook.text);
  await forecastTextarea.draw();
}

async function init() {
  console.clear();
  console.write("\u001B[?25l"); // hides cursor
  for (let i = 0; i < process.stdout.rows; i++) {
    console.log(" ".repeat(process.stdout.columns));
  }

  screenRight = process.stdout.columns - 1;
  screenBottom = process.stdout.rows - 1;

  dayMenubar = menubar({
    top: 0,
    left: 0,
    right: screenRight,
    items: outlookMenuItems.map((o) => o.name),
    spacing: 2,
    style: {
      bg: chalk.gray("─"),
      selected: chalk.bold.inverse,
    },
    actionKeys: ["1", "2", "3", "4"],
    selectable: true,
  });
  await dayMenubar.draw();

  forecastTextarea = box({
    top: 1,
    left: 0,
    bottom: screenBottom - 1,
    right: showOutlook ? 75 : screenRight,
    title: chalk.bold.blue(`${chalk.red("f")}orecast`),
    outline: true,
    showScrollBar: true,
    style: {
      outline: chalk.blue,
      scrollBar: {
        bg: " ",
        fg: chalk.bgGray(" "),
      },
    },
    scrollable: true,
    hidden: !showForecast,
  });
  updateOutlook();
  await forecastTextarea.draw();

  outlookBox = box({
    top: 1,
    left: showForecast ? 76 : 0,
    bottom: screenBottom - 1,
    right: screenRight,
    title: chalk.bold.green(`${chalk.red("o")}utlook`),
    outline: true,
    isImage: (process.env.TERM_PROGRAM ?? "").includes("iTerm"),
    style: {
      outline: chalk.green,
    },
    hidden: !showOutlook,
  });
  await outlookBox.draw();

  const mainMenuBar = menubar({
    top: screenBottom,
    left: 0,
    right: screenRight,
    items: [
      `${chalk.red("q")}uit`,
      ...(!showForecast ? [`${chalk.red("f")}orecast`] : []),
      ...(!showOutlook ? [`${chalk.red("o")}utlook`] : []),
    ],
    style: {
      bg: chalk.gray("─"),
    },
    spacing: 2,
  });
  await mainMenuBar.draw();
}

init();

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.on("keypress", async (_chunk, key) => {
  if (!key) return;
  const { ctrl, name } = key;
  if (ctrl) {
    if (name === "d") {
      forecastTextarea.moveScrollY(
        Math.floor(forecastTextarea.getContentHeight() / 2),
      );
      await forecastTextarea.draw();
    } else if (name === "u") {
      forecastTextarea.moveScrollY(
        Math.ceil(-forecastTextarea.getContentHeight() / 2),
      );
      await forecastTextarea.draw();
    }
  } else {
    if (name === "q") {
      console.clear();
      process.stdout.write("\u001B[?25h"); // show cursor
      process.exit();
    } else if (name === "j") {
      forecastTextarea.moveScrollY(1);
      await forecastTextarea.draw();
    } else if (name === "k") {
      forecastTextarea.moveScrollY(-1);
      await forecastTextarea.draw();
    } else if (name === "1" || name === "2" || name === "3" || name === "4") {
      dayMenubar.setSelectedIndex(parseInt(name) - 1);
      updateOutlook();
      await dayMenubar.draw();
    } else if (name === "f") {
      showForecast = !showForecast;
      await init();
    } else if (name === "o") {
      showOutlook = !showOutlook;
      await init();
    }
  }
});

process.on("SIGWINCH", async () => await init());
