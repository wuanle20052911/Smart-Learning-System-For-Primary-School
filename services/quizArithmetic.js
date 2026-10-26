// Exact rational arithmetic for simple generated exercises. No eval or model inference.
function gcd(a,b){a=a<0n?-a:a;while(b){[a,b]=[b,a%b];}return a;}
function rational(n,d=1n){if(!d)return null;if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return {n:n/g,d:d/g};}
function parseNumber(value){
 const match=String(value).trim().match(/^([+-]?\d{1,12})(?:\s*\/\s*(\d{1,12}))?$/);
 return match?rational(BigInt(match[1]),BigInt(match[2]||'1')):null;
}
function same(a,b){return Boolean(a&&b&&a.n===b.n&&a.d===b.d);}
function format(a){return a.d===1n?String(a.n):`${a.n}/${a.d}`;}
function calculate(source){
 let expression=String(source).trim();
 const natural=expression.match(/^(?:cộng|tổng(?: của)?)\s+([+-]?\d{1,12}(?:\s*\/\s*\d{1,12})?)\s+(?:và|với)\s+([+-]?\d{1,12}(?:\s*\/\s*\d{1,12})?)$/iu);
 if(natural)expression=natural[1]+' + '+natural[2];
 const m=expression.match(/^([+-]?\d{1,12}(?:\s*\/\s*\d{1,12})?)\s*([+−×x*:÷-])\s*([+-]?\d{1,12}(?:\s*\/\s*\d{1,12})?)$/);
 if(!m)return null;const a=parseNumber(m[1]),b=parseNumber(m[3]);if(!a||!b)return null;
 switch(m[2]){
 case '+':return rational(a.n*b.d+b.n*a.d,a.d*b.d);
 case '-':case '−':return rational(a.n*b.d-b.n*a.d,a.d*b.d);
 case '*':case '×':case 'x':return rational(a.n*b.n,a.d*b.d);
 case ':':case '÷':return rational(a.n*b.d,a.d*b.n);
 default:return null;
 }
}
function questionCalculation(question){
 // Only a single explicit operation with no other numeric data. Word problems stay with review.
 const regex=/[+-]?\d{1,12}(?:\s*\/\s*\d{1,12})?\s*[+−×*:÷-]\s*\d{1,12}(?:\s*\/\s*\d{1,12})?/g;
 const matches=[...question.matchAll(regex)];if(matches.length!==1)return null;
 const match=matches[0];const remainder=question.slice(0,match.index)+question.slice(match.index+match[0].length);
 if(/[\d=]/.test(remainder)||/[+×*:÷/]/.test(remainder))return null;
 return calculate(match[0]);
}
function verifyArithmetic(question){
 if(question.type==='matching'){
  const results=question.pairs.map(p=>calculate(p.left));const choices=question.pairs.map(p=>parseNumber(p.right));
  if(results.every(Boolean)&&choices.every(Boolean)){
   const mapping=results.map(value=>choices.findIndex(choice=>same(value,choice)));
   if(mapping.includes(-1)||new Set(mapping).size!==mapping.length)return null;
   return {...question,correctMatches:mapping,explanation:question.pairs.map((p,i)=>`${p.left} = ${format(results[i])}`).join('; ')+'.'};
  }
  return question;
 }
 const result=questionCalculation(question.question);if(!result)return question;
 if(question.type==='multiple-choice'){
  const options=question.options.map(parseNumber);
  // Refuse numeric answer sets with a wrong key or multiple equivalent right answers.
  if(options.every(Boolean)){
   const valid=options.map((x,i)=>same(x,result)?i:-1).filter(i=>i>=0);
   if(valid.length!==1||valid[0]!==question.correctIndex)return null;
  }
 }else if(question.type==='short-answer'||question.type==='fill-blank'){
  const answer=parseNumber(question.answer);if(answer&&!same(answer,result))return null;
 }
 return question;
}
module.exports={calculate,parseNumber,same,format,verifyArithmetic};
