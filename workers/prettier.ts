import { runAsWorker } from "synckit";
import prettier from "prettier";

runAsWorker(async (code) => {
  return await prettier.format(code, {
    parser: "babel-ts",
    semi: true,
    singleQuote: false,
    trailingComma: "es5",
  });
});
