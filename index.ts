import fs from "fs";
import path from "path";

class ZMXCompiler {
  private inputDir: string;
  private outputDir: string;
  private components: Record<string, any> = {};

  constructor(inputDir: string, outputDir: string) {
    this.inputDir = inputDir;
    this.outputDir = outputDir;
  }

  compileZMXFiles() {
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  
    // Collect all .zmx files
    let files = fs.readdirSync(this.inputDir).filter(file => file.endsWith(".zmx"));
  
    // Check for main.zmx and move it to the front if it exists
    const mainFileIndex = files.indexOf("main.zmx");
    if (mainFileIndex !== -1) {
      const [mainFile] = files.splice(mainFileIndex, 1); // Remove main.zmx
      files = [mainFile, ...files.sort()]; // Place main.zmx at the beginning
    } else {
      files.sort(); // Sort alphabetically if no main.zmx
    }
  
    // First pass: Parse and collect all component definitions
    files.forEach(file => {
      const inputPath = path.join(this.inputDir, file);
      const zmxCode = fs.readFileSync(inputPath, "utf8");
      this.parseAndRegisterComponent(file, zmxCode);
    });
  
    // Generate consolidated JS
    this.generateConsolidatedJS();
  
    // Generate consolidated HTML
    this.generateConsolidatedHTML(files);
  }
  

  private parseAndRegisterComponent(fileName: string, zmxCode: string) {
    const componentName = path.basename(fileName, ".zmx");
    const ast = this.parseZMX(zmxCode);
    
    // Extract component metadata
    const componentProps = this.extractComponentProps(ast.template);
    
    this.components[componentName] = {
      name: componentName,
      ast: ast,
      props: componentProps
    };
  }

  private extractComponentProps(template: string): string[] {
    // Simple prop extraction using regex
    const propMatches = template.match(/\{([^}]+)\}/g) || [];
    return propMatches.map(match => 
      match.slice(1, -1).trim().split(':')[0].trim()
    );
  }

  private parseZMX(code: string) {
    return {
      template: code.match(/<template>([\s\S]*?)<\/template>/)?.[1] || "",
      style: code.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "",
      script: code.match(/<script>([\s\S]*?)<\/script>/)?.[1] || ""
    };
  }

  private generateConsolidatedJS() {
    const consolidatedJSContent = `
// Consolidated Components Initialization
const ComponentRegistry = {
  ${Object.entries(this.components).map(([name, component]) => 
    `${name}: ${this.generateComponentInitializer(name, component)}`
  ).join(',\n  ')}
};

// Global Styles
function injectGlobalStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = \`
    ${Object.values(this.components)
      .map(component => component.ast.style)
      .filter(Boolean)
      .join('\n')
    }
  \`;
  document.head.appendChild(styleElement);
}

// Component Initialization Function
function initializeComponents(container, props = {}) {
  if (!container || !(container instanceof HTMLElement)) {
    throw new Error('A valid container element must be provided.');
  }

  // Inject global styles
  injectGlobalStyles();

  // Initialize custom components
  Object.entries(ComponentRegistry).forEach(([name, initializer]) => {
    const elements = container.querySelectorAll(\`[data-component="\${name}"]\`);
    elements.forEach(el => initializer(el, props));
  });
}

// Export for potential module usage
export { ComponentRegistry, initializeComponents };

// Auto-initialize if used in browser
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('app-container');
    if (container) {
      initializeComponents(container);
    }
  });
}
`;

    // Write consolidated JS
    const consolidatedJSPath = path.join(this.outputDir, 'components.js');
    fs.writeFileSync(consolidatedJSPath, consolidatedJSContent, "utf8");
    console.log(`Generated: ${consolidatedJSPath}`);
  }

  private generateComponentInitializer(name: string, component: any) {
    return `function(container, props = {}) {
      const content = \`${component.ast.template}\`;
      
      // Simple prop interpolation
      const interpolatedContent = content.replace(/\\{([^}]+)\\}/g, (match, p) => {
        const [propName, defaultValue] = p.split(':').map(s => s.trim());
        return props[propName] || defaultValue || '';
      });

      container.innerHTML = interpolatedContent;
    }`;
  }

  private generateConsolidatedHTML(files: string[]) {
    const consolidatedHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Consolidated Components</title>
  <script type="module" src="./components.js"></script>
</head>
<body>
  <div id="app-container">
    ${files.map(file => {
      const componentName = path.basename(file, ".zmx");
      return `
    <div id="${componentName}-container" 
         class="component-container" 
         data-component="${componentName}">
      <!-- ${componentName} Component Placeholder -->
    </div>`;
    }).join('\n    ')}
  </div>
</body>
</html>
    `;

    // Write consolidated HTML
    const consolidatedHTMLPath = path.join(this.outputDir, 'index.html');
    fs.writeFileSync(consolidatedHTMLPath, consolidatedHTML, "utf8");
    console.log(`Generated: ${consolidatedHTMLPath}`);
  }
}

// Export for module usage
export default ZMXCompiler;

// Direct usage
if (import.meta.main) {
  const compiler = new ZMXCompiler(".", "./dist");
  compiler.compileZMXFiles();
}