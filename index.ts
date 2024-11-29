const fs = require("fs");
const path = require("path");


function compileZMX(zmxCode, outputFileName) {
  const ast = parseZMX(zmxCode); 
  const transformedCode = transformAST(ast); 
  const jsCode = generateCode(transformedCode); 
  const htmlCode = generateHTML(transformedCode, outputFileName); 


  const jsFileName = `${outputFileName}.js`;
  fs.writeFileSync(jsFileName, jsCode, "utf8");
  console.log(`Generated: ${jsFileName}`);


  const htmlFileName = `${outputFileName}.html`;
  fs.writeFileSync(htmlFileName, htmlCode, "utf8");
  console.log(`Generated: ${htmlFileName}`);
}


function parseZMX(code) {
  return {
    template: code.match(/<template>([\s\S]*?)<\/template>/)?.[1] || "", 
    style: code.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "", 
  };
}


function transformAST(ast) {
  const transformedTemplate = ast.template.replace(
    /<\w+([^>]*)>([\s\S]*?)<\/\w+>/g,
    (match, attributes, content) => {
      return `<div class="card"${attributes}>${content}</div>`;
    }
  );

  return {
    template: transformedTemplate,
    style: ast.style,
  };
}


function generateCode(ast) {
  return `
    function initializeGeneratedComponent(container, props = {}) {
      if (!container || !(container instanceof HTMLElement)) {
        throw new Error('A valid container element must be provided.');
      }

      // Add styles to the document
      const styleElement = document.createElement('style');
      styleElement.textContent = \`
        ${ast.style}
      \`;
      document.head.appendChild(styleElement);

      // Generate the component content
      const content = \`${ast.template}\`;
      container.innerHTML = content;
    }
  `;
}


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
      <div id="generated-component-container"></div>
      <script src="./${path.basename(outputFileName)}.js"></script>
      <script>
        const container = document.getElementById('generated-component-container');
        initializeGeneratedComponent(container, { title: "Hello, World!" });
      </script>
    </body>
    </html>
  `;
}


function compileZMXFiles(inputDir, outputDir) {
  const files = fs.readdirSync(inputDir).filter((file) => file.endsWith(".zmx"));

  files.forEach((file) => {
    const inputPath = path.join(inputDir, file);
    const outputFileName = path.join(outputDir, path.basename(file, ".zmx"));
    const zmxCode = fs.readFileSync(inputPath, "utf8");
    compileZMX(zmxCode, outputFileName);
  });
}


if (require.main === module) {
  const inputDir = "."; 
  const outputDir = "./dist";
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  compileZMXFiles(inputDir, outputDir);
}
