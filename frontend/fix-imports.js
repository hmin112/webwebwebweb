const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

function replaceImports(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // For anything inside src/pages/ (except home/Home.tsx is handled ok because it needs ../../ components anyway)
    // Depth change: src/pages/About.tsx (depth 2) -> src/pages/home/components/About.tsx (depth 4)
    // Depth change: src/pages/Login.tsx (depth 2) -> src/pages/auth/Login.tsx (depth 3)

    // Determine relative depth from src
    const srcDir = path.join(__dirname, 'src');
    const relativeFromSrc = path.relative(srcDir, filePath);
    const depth = relativeFromSrc.split(path.sep).length - 1;

    if (depth === 2 && filePath.includes(path.join('pages', 'home'))) {
        // skip Home.tsx here or handle manually
    }

    // Use a regex replacer function to avoid immediate string evaluation
    content = content.replace(/from\s+['"](\.\.\/)[^'"]+['"]/g, (match, p1) => {
        // If inside a depth 2 folder (like pages/auth), we need `../../` instead of `../` for components, utils, etc.
        let newMatch = match;
        if (depth === 2) {
            // It used to be `../components`, now it needs `../../components`
            newMatch = match.replace('../', '../../');
        } else if (depth === 3) { // pages/home/components/About.tsx
            // it used to be `../components` (from sections), now it needs `../../../components`
            newMatch = match.replace('../', '../../../');
        }

        // Fix `lib` to `utils`
        newMatch = newMatch.replace('/lib/', '/utils/');
        newMatch = newMatch.replace('/lib"', '/utils"');
        newMatch = newMatch.replace('/lib\'', '/utils\'');

        return newMatch;
    });

    // Custom manual fixes:
    content = content.replace(/from ['"]\.\.\/sections(.*)['"]/g, (match, p1) => {
        if (depth === 2) return `from "../../pages/home/components${p1}"`;
        return match;
    });

    // Home.tsx manual fixes since it was created at depth 2
    if (filePath.endsWith('Home.tsx')) {
        content = content.replace(/from "\.\/components/g, 'from "./components');
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated: ${filePath}`);
    }
}

const pagesDir = path.join(__dirname, 'src', 'pages');
walkDir(pagesDir, replaceImports);

console.log('Import paths updated by depth calculation.');
