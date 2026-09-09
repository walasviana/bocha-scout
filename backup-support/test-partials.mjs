import { createRequire } from 'node:module';
import { drawScorePartials } from './recovered-exact/bocha-scout-8a6161a691dec9d6dc288505f61405dcf9670036/src/lib/pdfPartials.ts';
const require=createRequire(import.meta.url);
const {jsPDF}=require('./recovered-exact/bocha-scout-8a6161a691dec9d6dc288505f61405dcf9670036/node_modules/jspdf/dist/jspdf.node.min.js');
const doc=new jsPDF({unit:'pt',format:'a4',orientation:'landscape'});
for(let n of [4,6,7]){
 if(n!==4)doc.addPage();
 doc.setFontSize(16);doc.text(`Conferencia de parciais: ${n===7?'6 Ends + TB':n+' Ends'}`,26,40);
 doc.setFillColor(244,247,250);doc.roundedRect(26,90,790,72,12,12,'F');
 doc.setTextColor(239,65,72);doc.setFontSize(10);doc.text('ATLETA VERMELHO',48,112);
 doc.setTextColor(22,128,244);doc.text('ATLETA AZUL',794,112,{align:'right'});
 doc.setFontSize(32);doc.text('12',391,128,{align:'right'});doc.text('10',451,128);
 const scores=Object.fromEntries(Array.from({length:n},(_,i)=>[i===6?'TB':`End ${i+1}`,{athlete:i===6?1:i%3,opponent:i===6?0:i%2}]));
 const capture=[];const text=doc.text.bind(doc);doc.text=(...args)=>{capture.push(args);return text(...args)};
 drawScorePartials(doc,scores,'Azul');doc.text=text;
 const results=capture.filter(x=>x[2]===158);
 if(results.length!==n*3)throw Error('Unexpected results row');
 if(capture.some(x=>x[2]!==145&&x[2]!==158))throw Error('Misaligned baseline');
 if(results[3][0]!=='1'||results[5][0]!=='1')throw Error('Unexpected color mapping');
 console.log(`${n} partials aligned`);
}
doc.save('work/partials-check.pdf');
