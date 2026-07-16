import { injectFarmonMetadata } from "../execute/helpers/injector.js";
import { parse } from "@babel/parser";
import { generate } from "@babel/generator";
import path from "path";

export function farmonVitePlugin() {
  return {
    name: "farmon-vite-plugin",
    enforce: "pre",
    transform(code: string, id: string) {
      if (!id.endsWith(".jsx") && !id.endsWith(".tsx")) {
        return code;
      }
      const ast = parse(code, {
        sourceType: "module",
        plugins: ["jsx", "typescript"],
      });

      injectFarmonMetadata({
        ast,
        filePath: path.relative(`${process.cwd()}`, id),
      });
      const output = generate(ast).code;
      return output;
    },
  };
}
