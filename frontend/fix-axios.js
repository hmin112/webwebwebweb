const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walk(filePath, fileList);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const files = walk(path.join(__dirname, 'src'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    let changed = false;

    // Ignore api/axios.ts itself
    if (file.includes('api\\axios.ts') || file.includes('api/axios.ts')) return;

    // 1. Replace all combinations of get/post/put/delete with 'http://localhost:8080/api'
    const regex = /axios\.(get|post|put|delete)\((["'`])http:\/\/localhost:8080\/api([^"'`]*)\2/g;

    // Loop because Javascript replace with regex matches globally but we need to inject the quotes back.
    if (regex.test(content)) {
        content = content.replace(regex, 'api.$1($2$3$2');
        changed = true;
    }

    if (changed) {
        // Find relative depth to src folder. 
        // e.g. path format: d:\...\frontend\src\pages\auth\Login.tsx
        // depth is number of dirs after src
        const srcIndex = file.indexOf('src');
        const relativePath = file.substring(srcIndex + 4); // pages\auth\Login.tsx
        const depth = relativePath.split(path.sep).length - 1;

        let apiImportPath = '';
        if (depth === 0) apiImportPath = './api/axios';
        else apiImportPath = '../'.repeat(depth) + 'api/axios';

        if (!content.includes('import { api } from')) {
            content = `import { api } from "${apiImportPath}";\n` + content;
        }

        if (!content.includes('axios.')) {
            content = content.replace(/import axios from "axios";\n?/g, '');
        }

        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});
