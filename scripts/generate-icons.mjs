import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { Resvg } from "@resvg/resvg-js";

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const PUBLIC_DIR = path.resolve("public");
const ICON_SVG = path.join(PUBLIC_DIR, "icon.svg");

async function generateIcons() {
  const svgContent = fs.readFileSync(ICON_SVG, "utf-8");
  
  // Generate PNG icons for each size
  for (const size of ICON_SIZES) {
    const resvg = new Resvg(svgContent, {
      fitTo: { mode: "width", value: size },
      background: "#c85a78",
    });
    const png = resvg.render().asPng();
    fs.writeFileSync(path.join(PUBLIC_DIR, `icon-${size}.png`), png);
    console.log(`Generated icon-${size}.png`);
  }
  
  // Generate maskable icons (with padding for safe zone)
  for (const size of ICON_SIZES) {
    const maskableSvg = svgContent.replace(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"',
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">`
    );
    // Add safe zone padding (40% of size)
    const paddedSvg = maskableSvg.replace(
      '<path d="M256 365.5',
      '<rect width="512" height="512" fill="none"/><path d="M256 365.5'
    );
    
    const resvg = new Resvg(paddedSvg, {
      fitTo: { mode: "width", value: size },
      background: "#c85a78",
    });
    const png = resvg.render().asPng();
    fs.writeFileSync(path.join(PUBLIC_DIR, `icon-${size}-maskable.png`), png);
    console.log(`Generated icon-${size}-maskable.png`);
  }
  
  // Generate apple touch icon (180x180)
  const appleResvg = new Resvg(svgContent, {
    fitTo: { mode: "width", value: 180 },
    background: "#c85a78",
  });
  fs.writeFileSync(path.join(PUBLIC_DIR, "apple-touch-icon.png"), appleResvg.render().asPng());
  console.log("Generated apple-touch-icon.png");
}

generateIcons().catch(console.error);