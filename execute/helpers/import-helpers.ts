import traverse from "@babel/traverse";
import t from "@babel/types";

/**
 * Creates a Babel ImportDeclaration node.
 *
 * Params:
 * {
 *   source: string,
 *   defaultImport?: string | null,
 *   namedImports?: string[],
 *   namespaceImport?: string | null
 * }
 *
 * Example:
 *
 * {
 *   source: "react",
 *   defaultImport: "React",
 *   namedImports: ["useState", "useEffect"]
 * }
 *
 * Produces:
 *
 * import React, { useState, useEffect } from "react";
 *
 * Returns:
 * ImportDeclaration
 */
function buildImportDeclaration({
  source,
  defaultImport = null,
  namedImports = [],
  namespaceImport = null,
}) {
  const specifiers = [];

  // import React from "react"
  if (defaultImport) {
    specifiers.push(t.importDefaultSpecifier(t.identifier(defaultImport)));
  }

  // import * as React from "react"
  if (namespaceImport) {
    specifiers.push(t.importNamespaceSpecifier(t.identifier(namespaceImport)));
  }

  // import { useState, useEffect } from "react"
  for (const name of namedImports) {
    specifiers.push(t.importSpecifier(t.identifier(name), t.identifier(name)));
  }

  return t.importDeclaration(specifiers, t.stringLiteral(source));
}

/**
 * Extracts imported identifiers from an ImportDeclaration.
 *
 * Params:
 * {
 *   importDeclaration: ImportDeclaration // output of buildImportDeclaration
 * }
 *
 * Returns:
 * {
 *   defaultImport: string | null,
 *   namespaceImport: string | null,
 *   namedImports: string[]
 * }
 */
function getImportSpecifiers({ importDeclaration }) {
  let defaultImport = null;
  let namespaceImport = null;
  const namedImports = [];

  for (const specifier of importDeclaration.specifiers) {
    switch (specifier.type) {
      case "ImportDefaultSpecifier":
        defaultImport = specifier.local.name;
        break;

      case "ImportNamespaceSpecifier":
        namespaceImport = specifier.local.name;
        break;

      case "ImportSpecifier":
        namedImports.push(specifier.imported.name);
        break;
    }
  }

  return {
    defaultImport,
    namespaceImport,
    namedImports,
  };
}

/**
 * Removes a named import from an ImportDeclaration.
 *
 * Params:
 * {
 *   importDeclaration: ImportDeclaration,
 *   name: string
 * }
 *
 * Example:
 *
 * import { useState, useEffect } from "react"
 *
 * remove "useEffect"
 *
 * becomes:
 *
 * import { useState } from "react"
 *
 * Returns:
 * importDeclaration
 */
function removeImportSpecifier({ importDeclaration, name }) {
  importDeclaration.specifiers = importDeclaration.specifiers.filter(
    (specifier) =>
      !(
        specifier.type === "ImportSpecifier" && specifier.imported.name === name
      ),
  );
  return importDeclaration;
}

/**
 * Merges two ImportDeclarations having the same source.
 *
 * Params:
 * {
 *   targetImport: ImportDeclaration,
 *   sourceImport: ImportDeclaration
 * }
 *
 * Example:
 *
 * target:
 * import React from "react"
 *
 * source:
 * import { useState } from "react"
 *
 * result:
 * import React, { useState } from "react"
 *
 * Returns:
 * void
 */
function mergeImportDeclarations({ targetImport, sourceImport }) {
  const existingNames = new Set(
    targetImport.specifiers.map((specifier) => specifier.local.name),
  );

  for (const specifier of sourceImport.specifiers) {
    if (!existingNames.has(specifier.local.name)) {
      targetImport.specifiers.push(specifier);
    }
  }
}

/**
 * Determines whether an imported identifier is used
 * somewhere in the program.
 *
 * Params:
 * {
 *   ast: File,
 *   name: string
 * }
 *
 * Example:
 *
 * import Button from "./Button"
 *
 * <Button />
 *
 * isImportUsed("Button")
 * => true
 *
 * Returns:
 * boolean
 */
function isImportUsed({ ast, name }) {
  let used = false;

  traverse.default(ast, {
    Identifier(path) {
      if (
        path.node.name === name &&
        !path.findParent((parent) => parent.isImportDeclaration())
      ) {
        used = true;

        // stop traversal early
        path.stop();
      }
    },
  });

  return used;
}

export default {
  buildImportDeclaration,
  getImportSpecifiers,
  removeImportSpecifier,
  mergeImportDeclarations,
  isImportUsed,
};
