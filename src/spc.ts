import moment, { type MomentInput } from "moment-timezone";
import { JSDOM } from "jsdom";
import env from "./env";

export async function listConvOutlooks(date: MomentInput) {
  const url = new URL("/cgi-bin-spc/getacrange.pl", env.spcUrl);

  date = moment(date).format("YYYYMMDD");
  url.search = new URLSearchParams({
    date0: date,
    date1: date,
  }).toString();

  const res = await fetch(url);

  if (res.status === 200) {
    const dom = new JSDOM(await res.text());

    const links = dom.window.document
      .querySelectorAll("table")[3]
      .querySelector("tbody")
      ?.querySelector("tr")
      ?.children[2].querySelector("table")
      ?.querySelector("tbody")
      ?.querySelectorAll("a");

    if (links) {
      return [...links]
        .map((link) => link.href.trim())
        .filter((href) => href.endsWith(".html"));
    }
  }
}

export type ConvOutlook = {
  categoricalOutlookUrl: string;
  text: string;
};

export async function getConvOutlook(
  href: string,
): Promise<ConvOutlook | undefined> {
  const url = new URL(href, env.spcUrl);

  const res = await fetch(url);

  if (res.status === 200) {
    const dom = new JSDOM(await res.text());

    const tbody = dom.window.document
      .querySelectorAll("table")[1]
      .querySelector("tbody");

    const text = tbody?.querySelector("pre")?.textContent ?? "";
    let categoricalOutlookUrl = tbody?.querySelector("img")?.src;
    categoricalOutlookUrl = categoricalOutlookUrl
      ? `${env.spcUrl}${href.split("/").slice(0, -1).join("/")}/${categoricalOutlookUrl}`
      : "";

    return {
      categoricalOutlookUrl,
      text,
    };
  }
}
