import { injectFarmonMetadata } from "../execute/helpers/injector.js";
import { parse } from "@babel/parser";
import { generate } from "@babel/generator";

export function farmonVitePlugin() {
  return {
    name: "farmon-vite-plugin",
    enforce: "pre",
    transform(code: string, id: string) {
      if (!id.endsWith(".jsx") && !id.endsWith(".tsx")) {
        return code;
      }
      //   console.log(`farmon-vite-plugin: ${id}`);
      const ast = parse(code, {
        sourceType: "module",
        plugins: ["jsx", "typescript"],
      });

      injectFarmonMetadata({
        ast,
        filePath: id,
      });
      const output = generate(ast).code;
      //   console.log(`Transformed code for ${id}`);
      return output;
    },
  };
}
