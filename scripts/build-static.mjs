import {mkdir,copyFile,readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'dist');await mkdir(output,{recursive:true});
// Allowlist only. No Python, portfolio contact page, caches, archives or tests.
async function copyTree(source,target,vendor=false){await mkdir(target,{recursive:true});for(const entry of await readdir(source,{withFileTypes:true})){const s=path.join(source,entry.name),d=path.join(target,entry.name);if(entry.isDirectory())await copyTree(s,d,vendor||entry.name==='vendor');else if(/\.(js|css|svg|png|webp|woff2|wasm)$/.test(entry.name)||(vendor&&/^(LICENSE|AUTHORS|MANIFEST\.json)$/.test(entry.name)))await copyFile(s,d);}}
await copyFile(path.join(root,'templates/myelin_web_sample.html'),path.join(output,'index.html'));
await copyFile(path.join(root,'templates/myelin_web_sample.html'),path.join(output,'myelin_web_sample.html'));
await copyTree(path.join(root,'templates/assets/myelin'),path.join(output,'assets/myelin'));
await copyFile(path.join(root,'templates/_headers'),path.join(output,'_headers'));
const files=[];async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else files.push(path.relative(output,p).replaceAll('\\','/'));}}await walk(output);
for(const f of files)if(!/^(index\.html|myelin_web_sample\.html|_headers|assets\/myelin\/[\w/.-]+\.(js|css|svg|png|webp|woff2|wasm)|assets\/myelin\/vendor\/[\w/.-]+\/(LICENSE|AUTHORS)|assets\/myelin\/vendor\/sqlite\/MANIFEST\.json)$/.test(f))throw new Error(`Unexpected publish file: ${f}`);
console.log(`Static output: ${output}\nApproved files: ${files.length}\nNo server database, Python source, account, API or telemetry included.`);
