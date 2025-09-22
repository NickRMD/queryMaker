import Query from "./queryMaker.js";
import Statement from "./statementMaker.js";
import CteMaker from "./cteMaker.js";

let showedAlready = false;

if (!showedAlready) {
  console.log([
    "Help us with some questions.",
    "Access our repo and open an issue!",
    "https://github.com/NickRMD/queryMaker/issues",
    "We need your feedback on the following questions:",
    "\t1. Escaping should be done in this library or in the database driver?",
    "\t2. Should we support named parameters?",
    "Thank you for your help!"
  ].join("\n"));
  showedAlready = true;
}

export {
  Query,
  Statement,
  CteMaker
}
