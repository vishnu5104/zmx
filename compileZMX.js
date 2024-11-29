const fs = require('fs');
const path = require('path');

// Main compileZMX function
function compileZMX(zmxCode, outputFileName) {
  const ast = parseZMX(zmxCode); // Parse the ZMX code
  const transformedCode = transformAST(ast); // Transform to web components
  const jsCode = generateCode(transformedCode); // Generate JS code
  const htmlCode = generateHTML(transformedCode, outputFileName); // Generate HTML code

  // Write JavaScript file
  const jsFileName = `${outputFileName}.js`;
  fs.writeFileSync(jsFileName, jsCode, 'utf8');
  console.log(`Generated: ${jsFileName}`);

  // Write HTML file
  const htmlFileName = `${outputFileName}.html`;
  fs.writeFileSync(htmlFileName, htmlCode, 'utf8');
  console.log(`Generated: ${htmlFileName}`);
}

// Helper to parse ZMX code
function parseZMX(code) {
  return {
    template: code.match(/<([^>]+)>[\s\S]*<\/\1>/)?.[0] || '', // Extract top-level content
    script: code.match(/<script>([\s\S]*?)<\/script>/)?.[1] || '',
  };
}

// Transform AST to handle custom tags
function transformAST(ast) {
  const customTagsMap = {
    card: `<div class="card">`,
  };

  const transformedTemplate = ast.template.replace(
    /<(\w+)([^>]*)>([\s\S]*?)<\/\1>/g,
    (match, tag, attributes, content) => {
      const htmlTag = customTagsMap[tag] || `<${tag}>`;
      return `${htmlTag}${content}</div>`;
    }
  );

  return {
    template: transformedTemplate,
    script: ast.script,
  };
}

// Generate JavaScript
function generateCode(ast) {
  return `
    class GeneratedComponent extends HTMLElement {
      constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.innerHTML = \`${ast.template}\`;
        ${ast.script}
      }
    }
    customElements.define('generated-component', GeneratedComponent);
  `;
}

// Generate HTML
function generateHTML(ast, outputFileName) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Generated Component</title>
    </head>
    <body>
      <generated-component></generated-component>
      <script src="./${path.basename(outputFileName)}.js"></script>
    </body>
    </html>
  `;
}

// CLI logic
function compileZMXFiles(inputDir, outputDir) {
  const files = fs
    .readdirSync(inputDir)
    .filter((file) => file.endsWith('.zmx'));

  files.forEach((file) => {
    const inputPath = path.join(inputDir, file);
    const outputFileName = path.join(outputDir, path.basename(file, '.zmx'));
    const zmxCode = fs.readFileSync(inputPath, 'utf8');
    compileZMX(zmxCode, outputFileName);
  });
}

// Execute with Bun
if (require.main === module) {
  const inputDir = './src';
  const outputDir = './dist';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  compileZMXFiles(inputDir, outputDir);
}
