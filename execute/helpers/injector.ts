import traverse from "@babel/traverse";
import * as t from "@babel/types";

export function injectFarmonMetadata({ ast, filePath }) {
  //   console.log(`Injecting Farmon metadata into ${filePath}`);
  traverse.default(ast, {
    FunctionDeclaration(path) {
      const componentName = path.node.id?.name;

      if (!componentName) return;

      injectIntoFunctionBody(path.node.body, componentName, filePath);
    },

    VariableDeclarator(path) {
      if (!t.isIdentifier(path.node.id)) return;

      const componentName = path.node.id.name;

      const init = path.node.init;

      if (t.isArrowFunctionExpression(init) || t.isFunctionExpression(init)) {
        if (t.isBlockStatement(init.body)) {
          injectIntoFunctionBody(init.body, componentName, filePath);
        }
      }
    },
  });
}

function injectIntoFunctionBody(body, componentName, filePath) {
  //   console.log(`Injecting into function body: ${componentName}`);
  //   console.log(body);
  for (const statement of body.body) {
    // console.log(statement);
    const root = getRootJSX(statement.argument);
    // console.log(root);

    if (root) injectIntoRootElement(root, componentName, filePath);

    // if (!t.isReturnStatement(statement)) continue;

    // if (!t.isJSXElement(statement.argument)) continue;

    // injectIntoRootElement(statement.argument, componentName, filePath);
  }
}
function getRootJSX(node) {
  if (t.isJSXElement(node)) return node;

  if (t.isJSXFragment(node)) {
    for (const child of node.children) {
      if (t.isJSXElement(child)) return child;

      if (t.isJSXFragment(child)) {
        const found = getRootJSX(child);
        if (found) return found;
      }
    }
  }

  return null;
}

function injectIntoRootElement(jsx, componentName, filePath) {
  //   console.log(`Injecting into root JSX element of ${componentName}`);
  const attrs = jsx.openingElement.attributes;

  addAttribute(attrs, "data-farmon-id", `${filePath}::${componentName}`);

  //   addAttribute(attrs, "data-farmon-file", filePath);
}

function addAttribute(attributes, name, value) {
  //   console.log("Adding attribute", name, value);
  const exists = attributes.some(
    (attr) =>
      t.isJSXAttribute(attr) &&
      t.isJSXIdentifier(attr.name) &&
      attr.name.name === name,
  );

  if (exists) return;

  attributes.push(
    t.jsxAttribute(t.jsxIdentifier(name), t.stringLiteral(value)),
  );
}

// const id = element.dataset.farmonId;

// const [file, component] = id.split("::");
