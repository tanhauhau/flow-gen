const path = require('path');

const File = require('./utils/File');

const cwd = process.cwd();
const argv = process.argv;
const source = path.join(cwd, argv[2]);
const sourceDir = path.dirname(source);
const dest = path.join(cwd, argv[3]);

(async function () {
  const files = new Map();
  const toProcess = [new File(source)];

  while (toProcess.length) {
    const file = toProcess.pop();
    files.set(file.path, file);
    await file.generateFlowDefinition();
    toProcess.push(...file.dependencies);
  }
})();