// node build-cache-manifest.cjs <pasta do jogo> [pasta de saída]
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(process.argv[2]||__dirname),out=path.resolve(process.argv[3]||root);
const files=['index.html',...fs.readdirSync(root).filter(f=>/\.(js|css)$/.test(f)&&!/^resource-(worker|manifest)\.js$/.test(f))];
for(const dir of ['vendor','models','musica']){function walk(rel){for(const item of fs.readdirSync(path.join(root,rel),{withFileTypes:true})){const name=rel+'/'+item.name;if(item.isDirectory())walk(name);else if(/\.(js|mp3|ogg|wav|m4a|webp|png|jpg|woff2?)$/i.test(name))files.push(name);}}walk(dir);}
files.sort();const hash=crypto.createHash('sha256');let bytes=0;
for(const file of files){const data=fs.readFileSync(path.join(root,file));bytes+=data.length;hash.update(file);hash.update(data);}
const version=hash.digest('hex').slice(0,20);
fs.writeFileSync(path.join(out,'resource-manifest.js'),'self.HorizonResourceManifest='+JSON.stringify({version,bytes,files})+';\n');
console.log(JSON.stringify({version,files:files.length,bytes}));
