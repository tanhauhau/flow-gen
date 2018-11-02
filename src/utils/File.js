// @flow

const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generator = require("@babel/generator").default;
const t = require("@babel/types");
const fs = require("fs-extra");
const path = require("path");
const parserOptions = {
  sourceType: "module",
  plugins: [
    "jsx",
    "flow",
    "dynamicImport",
    "classProperties",
    "objectRestSpread"
  ]
};

class File {
  path: string;
  dependencies: File[] = [];
  ast: Object;

  constructor(path: string) {
    this.path = path;
  }

  async generateFlowDefinition() {
    const content = await fs.readFile(this.path, "utf-8");
    this.ast = parser.parse(content, parserOptions);
    traverse(this.ast, {
      ExportNamedDeclaration: path => {
        const { source, declaration, specifiers } = path.node;
        if (source) {
          this.dependencies.push(new File(resolve(source.value, this.path)));
        }
        if (declaration) {
          switch (declaration.type) {
            case "FunctionDeclaration":
              if (isAnnotatedFunction(declaration)) {
                path.replaceWith(
                  createFunctionDeclaration(
                    declaration.id.name,
                    declaration.params,
                    declaration.returnType
                  )
                );
              }
              break;
            case "VariableDeclaration":
              break;
          }
        }
        path.skip();
      },
      ImportDeclaration: path => {
        const { source } = path.node;
        if (source) {
          this.dependencies.push(new File(resolve(source.value, this.path)));
        }
      }
    });
    this.output = generator(this.ast);
    console.log(this.output.code);
    console.log();
  }
}

const extensions = ["", ".js", ".json"];
function resolve(request, requestor) {
  const options = {
    paths: [path.dirname(requestor)]
  };
  for (const extension of extensions) {
    try {
      return require.resolve(request + extension, options);
    } catch (e) {}
  }
  throw new Error(`Could not resolve ${request} from ${requestor}`);
}

function isAnnotatedFunction(node) {
  return (
    !!node.returnType && node.params.every(param => !!param.typeAnnotation)
  );
}

function createFunctionDeclaration(name, params, returnType) {
  return t.declareExportDeclaration(
    t.declareFunction({
      type: "Identifier",
      name,
      optional: false,
      typeAnnotation: t.typeAnnotation(
        t.functionTypeAnnotation(
          null,
          params.map(param => {
            return t.functionTypeParam(
              t.identifier(param.name),
              param.typeAnnotation.typeAnnotation
            );
          }),
          null,
          returnType.typeAnnotation
        )
      )
    })
  );
}

module.exports = File;
