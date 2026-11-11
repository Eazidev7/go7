import fs from "fs";
const s = fs.readFileSync("go7 figma/FigmaApp.tsx", "utf8");
const shell = s.indexOf('go7-app-shell');
const end = s.indexOf("export default FigmaApp");
console.log("shell to end length", end - shell);
console.log(s.slice(shell, end));