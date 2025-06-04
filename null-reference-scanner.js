// file: null-reference-scanner.js
// This script scans JavaScript files in the project for potential null reference issues

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

// Patterns that might cause null reference errors
const riskPatterns = [
  { pattern: /\.[a-zA-Z]+\(/g, description: 'Method call without null check' },
  { pattern: /\.charAt\(/g, description: 'charAt() call - common null reference error' },
  { pattern: /\.toUpperCase\(/g, description: 'toUpperCase() call without null check' },
  { pattern: /\.toLowerCase\(/g, description: 'toLowerCase() call without null check' },
  { pattern: /\.slice\(/g, description: 'slice() call without null check' },
  { pattern: /\.split\(/g, description: 'split() call without null check' },
  { pattern: /\.\w+\.\w+/g, description: 'Nested property access without null check' },
];

// Safe patterns that likely already handle null references
const safePatterns = [
  { pattern: /&&\s*\w+\./g, description: 'Logical AND null check' },
  { pattern: /\?\./g, description: 'Optional chaining' },
  { pattern: /\w+\s*===\s*null|\w+\s*!==\s*null|\w+\s*===\s*undefined|\w+\s*!==\s*undefined/g, description: 'Explicit null/undefined check' },
  { pattern: /\w+\s*==\s*null|\w+\s*!=\s*null/g, description: 'Loose null/undefined check' },
  { pattern: /if\s*\(\s*\w+\s*\)/g, description: 'If statement with truthy check' },
  { pattern: /if\s*\(\s*!\s*\w+\s*\)/g, description: 'If statement with falsy check' },
  { pattern: /\?\s*\w+\./g, description: 'Ternary with null check' },
  { pattern: /SafeUtils/g, description: 'Using SafeUtils' },
];

// File extensions to scan
const targetExtensions = ['.js', '.jsx', '.ts', '.tsx'];

// Directories to ignore
const ignoreDirs = ['node_modules', 'build', 'dist', '.git'];

async function scanDirectory(dir) {
  const allResults = [];
  
  const files = await readdir(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await stat(filePath);
    
    // Skip ignored directories
    if (stats.isDirectory()) {
      if (!ignoreDirs.includes(file)) {
        const subdirResults = await scanDirectory(filePath);
        allResults.push(...subdirResults);
      }
      continue;
    }
    
    // Only process target file extensions
    const ext = path.extname(file).toLowerCase();
    if (!targetExtensions.includes(ext)) continue;
    
    const fileResults = await scanFile(filePath);
    allResults.push(...fileResults);
  }
  
  return allResults;
}

async function scanFile(filePath) {
  const results = [];
  
  try {
    const content = await readFile(filePath, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('/*')) continue;
      
      // Check for risk patterns
      for (const { pattern, description } of riskPatterns) {
        if (pattern.test(line)) {
          // Check if line also contains safe patterns
          let hasSafePattern = false;
          for (const { pattern: safePattern } of safePatterns) {
            if (safePattern.test(line)) {
              hasSafePattern = true;
              break;
            }
          }
          
          if (!hasSafePattern) {
            results.push({
              file: filePath,
              line: i + 1,
              code: line.trim(),
              risk: description
            });
          }
        }
        
        // Reset regex lastIndex
        pattern.lastIndex = 0;
      }
    }
  } catch (error) {
    console.error(`Error scanning file ${filePath}:`, error);
  }
  
  return results;
}

async function main() {
  console.log('Scanning for potential null reference issues...');
  
  // Scan frontend src directory
  const frontendResults = await scanDirectory(path.resolve(__dirname, 'frontend/src'));
  
  // Process and display results
  console.log(`\nFound ${frontendResults.length} potential issues:`);
  
  // Group by file
  const groupedByFile = {};
  frontendResults.forEach(result => {
    const fileKey = result.file;
    if (!groupedByFile[fileKey]) {
      groupedByFile[fileKey] = [];
    }
    groupedByFile[fileKey].push(result);
  });
  
  // Display results
  Object.keys(groupedByFile).forEach(file => {
    console.log(`\n${file} (${groupedByFile[file].length} issues):`);
    groupedByFile[file].forEach(result => {
      console.log(`  Line ${result.line}: ${result.risk}`);
      console.log(`    ${result.code}`);
    });
  });
  
  // Write results to file
  const outputFile = path.resolve(__dirname, 'null-reference-issues.json');
  fs.writeFileSync(outputFile, JSON.stringify(frontendResults, null, 2));
  console.log(`\nDetailed results written to: ${outputFile}`);
}

main().catch(error => {
  console.error('Error scanning for null references:', error);
});
