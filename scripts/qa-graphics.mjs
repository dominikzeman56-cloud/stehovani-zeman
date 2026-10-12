import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080/";
const OUT = new URL("../screenshots/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
mkdirSync(OUT, { recursive: true });

function findChromium() {
  const root = join(homedir(), "AppData", "Local", "ms-playwright");
  const candidates = [
    join(root, "chromium_headless_shell-1234", "chrome-headless-shell-win64", "chrome-headless-shell.exe"),
    join(root, "chromium-1234", "chrome-win64", "chrome.exe"),
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  return candidates.find((p) => existsSync(p));
}

const executablePath = findChromium();

const consoleErrors = [];
const pageErrors = [];

const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => pageErrors.push(String(err)));

await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1200);

// walk the page like a user so every scroll-reveal fires before the fullPage shot
const traverse = async (p) => {
  await p.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.7);
    const max = document.body.scrollHeight;
    for (let y = 0; y <= max; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 140));
    }
  });
  await p.waitForTimeout(1600);
};
await traverse(page);
const hiddenAfterTraversal = await page.evaluate(
  () => [...document.querySelectorAll(".reveal")].filter((el) => getComputedStyle(el).opacity === "0").length,
);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);
await page.screenshot({ path: OUT + "qa-home-desktop.png", fullPage: true });

// scroll to the calculator and let the 3D van settle
await page.locator("#kalkulacka").scrollIntoViewIfNeeded();
await page.waitForTimeout(3500);
const canvasCount = await page.locator("#souhrn canvas, canvas").count();
const aside = page.locator("#souhrn");
if ((await aside.count()) > 0) {
  await aside.screenshot({ path: OUT + "qa-van.png" });
}

// interactive check: drag the van
const host = page.locator('[role="img"][aria-label*="Trojrozm"]' );
if ((await host.count()) > 0) {
  const box = await host.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(900);
    await aside.screenshot({ path: OUT + "qa-van-dragged.png" });
  }
}

// contact map: give the lazy iframe time, then capture it
await page.locator("#kontakt").scrollIntoViewIfNeeded();
await page.waitForTimeout(5000);
const mapFrame = page.locator("#kontakt iframe");
const mapPresent = (await mapFrame.count()) > 0;
if (mapPresent) {
  await mapFrame.screenshot({ path: OUT + "qa-map.png" }).catch(() => {});
}

// mobile pass
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
mobile.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push("[mobile] " + msg.text());
});
mobile.on("pageerror", (err) => pageErrors.push("[mobile] " + String(err)));
await mobile.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
await mobile.waitForTimeout(1200);
await traverse(mobile);
await mobile.evaluate(() => window.scrollTo(0, 0));
await mobile.waitForTimeout(600);
await mobile.screenshot({ path: OUT + "qa-home-mobile.png", fullPage: true });
const mobileOverflow = await mobile.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);

const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 400));

await browser.close();

console.log(
  JSON.stringify(
    {
      canvasCount,
      mobileOverflowPx: mobileOverflow,
      hiddenRevealsAfterTraversal: hiddenAfterTraversal,
      consoleErrors,
      pageErrors,
      bodyTextPrefix: bodyText.replace(/\s+/g, " ").slice(0, 200),
    },
    null,
    2,
  ),
);
