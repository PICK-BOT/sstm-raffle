/**
 * 將專案內繁體中文轉為簡體（台灣用字 → 大陸規範字形）
 * 使用：node tools/convert-to-zhcn.cjs
 */
const fs = require("fs");
const path = require("path");
const OpenCC = require("opencc-js");

const root = path.join(__dirname, "..");
const converter = OpenCC.Converter({ from: "tw", to: "cn" });

const files = [
  "game.js",
  "style.css",
  "sstm-forum-scrape.js",
  "story.json",
  "gameplay.json",
  "index.html",
];

for (const rel of files) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    console.warn("skip missing:", rel);
    continue;
  }
  const raw = fs.readFileSync(fp, "utf8");
  const out = converter(raw);
  if (out !== raw) {
    fs.writeFileSync(fp, out, "utf8");
    console.log("updated:", rel);
  } else {
    console.log("unchanged:", rel);
  }
}
