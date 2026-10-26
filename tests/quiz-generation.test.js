const test=require('node:test');const assert=require('node:assert/strict');
const {validateInput,chooseModel,normalizeQuestion,generateQuiz}=require('../services/quizGeneration');
const material='Cộng hai phân số cùng mẫu số: cộng tử số, giữ nguyên mẫu số; ví dụ 1/5 + 2/5 = 3/5. Rút gọn khi cần.';
const q=(name='Tính kết quả của phép cộng 1/5 + 3/5.')=>({type:'multiple-choice',question:name,options:['1/5','2/5','3/5','4/5'],correctIndex:3,explanation:'Cộng tử số 1 + 3 = 4, giữ mẫu số 5 nên kết quả là 4/5.'});
test('quiz model selection prefers quiz-capable model and never embedding',()=>{
 assert.equal(chooseModel(['nomic-embed-text:latest','llama3.2:3b','qwen2.5:7b']),'qwen2.5:7b');
 assert.throws(()=>chooseModel(['nomic-embed-text:latest']));
 assert.throws(()=>chooseModel(['llama3.2:3b'],'missing'));
 assert.equal(chooseModel(['qwen2.5:7b','llama3.2:3b'],'llama3.2:3b'),'llama3.2:3b');
});
test('quiz input requires source, validates bounds and supports legacy source extraction',()=>{
 assert.throws(()=>validateInput({material:'ngắn'}));assert.throws(()=>validateInput({material,questionCount:11}));
 assert.throws(()=>validateInput({material,questionType:'essay'}));assert.throws(()=>validateInput({material,grade:9}));
 assert.equal(validateInput({userPrompt:`Nguồn """${material}"""`}).material,material);
});
test('question gate rejects duplicate/empty options, fabricated index and wrong requested type',()=>{
 assert.ok(normalizeQuestion(q(),'multiple-choice'));
 assert.equal(normalizeQuestion({...q(),options:['1/5',' 1/5 ','3/5','4/5']},'multiple-choice'),null);
 assert.equal(normalizeQuestion({...q(),options:['','2','3','4']},'multiple-choice'),null);
 assert.equal(normalizeQuestion({...q(),correctIndex:undefined,answer:null},'multiple-choice'),null);
 assert.equal(normalizeQuestion(q(),'true-false'),null);
 assert.equal(normalizeQuestion({...q(),explanation:''},'multiple-choice'),null);
});
test('matching must be a bijection and blanks must contain exactly one blank',()=>{
 const matching={type:'matching',question:'Nối các phép tính với kết quả tương ứng.',pairs:[{left:'1+1',right:'3'},{left:'1+2',right:'4'},{left:'2+2',right:'2'}],correctMatches:[2,0,1],explanation:'1+1=2; 1+2=3; 2+2=4.'};
 assert.ok(normalizeQuestion(matching,'matching'));assert.equal(normalizeQuestion({...matching,correctMatches:[0,0,1]},'matching'),null);
 const blank={type:'fill-blank',question:'Điền kết quả vào chỗ trống: 2 + 3 = ___.',answer:'5',explanation:'Cộng hai số 2 và 3 được tổng bằng 5.'};
 assert.ok(normalizeQuestion(blank,'fill-blank'));assert.equal(normalizeQuestion({...blank,question:'Tính tổng của hai số 2 và 3.'},'fill-blank'),null);
});
function mock(responses){let calls=0;return {fetch:async(url,opts)=>{
 if(url.endsWith('/api/tags'))return {ok:true,json:async()=>({models:[{name:'qwen2.5:7b'}]})};
 const body=JSON.parse(opts.body);assert.equal(body.stream,false);assert.equal(body.format.type,'object');
 const value=responses[calls++];if(value===undefined)throw new Error('Unexpected extra model call');
 return {ok:true,json:async()=>({message:{content:typeof value==='string'?value:JSON.stringify(value)},prompt_eval_count:10,eval_count:5})};
 },count:()=>calls};}
test('independent reviewer filters wrong answers and retry carries feedback, with accurate usage',async()=>{
 const bad=q('Phân số nào trong các đáp án lớn hơn một?');bad.correctIndex=0;
 const good=q();const m=mock([{questions:[bad]},{reviews:[{index:0,approved:false,reason:'Không có phương án nào lớn hơn một.'}]},{questions:[good]},{reviews:[{index:0,approved:true,reason:'Tự cộng 1+3=4, mẫu 5; chỉ đáp án 4/5 đúng.'}]}]);
 let tokens=0;const r=await generateQuiz(validateInput({material,questionCount:1}),{fetchImpl:m.fetch,onUsage:x=>tokens+=x.promptTokens});
 assert.equal(r.questions.length,1);assert.equal(r.questions[0].question,good.question);assert.equal(r.attempts,2);assert.equal(tokens,40);
});
test('missing or duplicate review cannot approve a question; malformed JSON has bounded retries',async()=>{
 const m=mock([{questions:[q()]},{reviews:[]},{questions:[q()]},{reviews:[{index:0,approved:true,reason:'Đúng'},{index:0,approved:true,reason:'Đúng'}]},{questions:[q()]},{reviews:[]}]);
 await assert.rejects(generateQuiz(validateInput({material,questionCount:1}),{fetchImpl:m.fetch}),/chưa tạo được/);
 assert.equal(m.count(),6);
 const bad=mock(['invalid','invalid','invalid']);await assert.rejects(generateQuiz(validateInput({material,questionCount:1}),{fetchImpl:bad.fetch}),/chưa tạo được/);assert.equal(bad.count(),3);
});
test('partial result is explicit and never filled with made-up sample questions',async()=>{
 const m=mock([{questions:[q()]},{reviews:[{index:0,approved:true,reason:'Phép tính và đáp án đều đúng.'}]},{questions:[]},{questions:[]}]);
 const r=await generateQuiz(validateInput({material,questionCount:2}),{fetchImpl:m.fetch});assert.equal(r.partial,true);assert.equal(r.questions.length,1);assert.equal(r.requestedCount,2);
});

test('equivalent fractional distractors cannot create two correct answers',()=>{
 const item={...q(),options:['1/2','2/4','3/4','1/4']};
 assert.equal(normalizeQuestion(item,'multiple-choice'),null);
});
test('shuffling preserves the correct answer and its editor index',()=>{
 const {shuffleChoices}=require('../services/quizGeneration');
 const item=q();const shuffled=shuffleChoices(item,()=>0);
 assert.equal(shuffled.options[shuffled.correctIndex],item.options[item.correctIndex]);
 assert.equal(shuffled.answer,shuffled.correctIndex);assert.notDeepEqual(shuffled.options,item.options);
});

test('reversed true-false labels preserve their meaning when normalized',()=>{
 const result=normalizeQuestion({type:'true-false',question:'Phép cộng hai với ba bằng sáu.',options:['Sai','Đúng'],correctIndex:0,explanation:'Hai cộng ba bằng năm, không phải sáu nên mệnh đề sai.'},'true-false');
 assert.deepEqual(result.options,['Đúng','Sai']);assert.equal(result.correctIndex,1);assert.equal(result.answer,1);
});

test('short numerical fraction answers use canonical simplest form',()=>{
 const item={type:'short-answer',question:'Tính tổng của hai phân số 4/7 và 3/7.',answer:'7/7',explanation:'Cộng tử số 4+3=7, giữ mẫu 7, được 7/7=1.'};
 assert.equal(normalizeQuestion(item,'short-answer').answer,'1');
 assert.equal(normalizeQuestion({...item,answer:'5/0'},'short-answer'),null);
});

test('arithmetic validation rejects wrong numeric keys and recalculates matching keys exactly',()=>{
 const wrong={...q(),correctIndex:0};assert.equal(normalizeQuestion(wrong,'multiple-choice'),null);
 const matching={type:'matching',question:'Nối phép tính với kết quả đúng.',pairs:[{left:'2/9 + 5/9',right:'7/9'},{left:'3/11 + 4/11',right:'7/11'},{left:'6/13 + 2/13',right:'8/13'}],correctMatches:[1,2,0],explanation:'Kết quả được tính theo quy tắc cộng phân số.'};
 const result=normalizeQuestion(matching,'matching');assert.deepEqual(result.correctMatches,[0,1,2]);
 const {shuffleChoices}=require('../services/quizGeneration');const shuffled=shuffleChoices(result,()=>0);
 shuffled.pairs.forEach((pair,i)=>assert.equal(shuffled.pairs[shuffled.correctMatches[i]].right,result.pairs[i].right));
});

test('exact arithmetic handles fractions and skips unsupported formulas safely',()=>{
 const {calculate,format}=require('../services/quizArithmetic');
 assert.equal(format(calculate('1/2 + 1/3')),'5/6');
 assert.equal(format(calculate('-3 + 2')),'-1');
 assert.equal(calculate('1 : 0'),null);assert.equal(calculate('process.exit()'),null);
});

test('natural Vietnamese sums and equivalent matching results are checked',()=>{
 const {calculate,format}=require('../services/quizArithmetic');assert.equal(format(calculate('Cộng 2/9 và 4/9')),'2/3');
 const item={type:'matching',question:'Nối các tổng với kết quả đúng.',pairs:[{left:'Cộng 2/9 và 4/9',right:'2/3'},{left:'Cộng 1/2 và 1/2',right:'1'},{left:'Cộng 3/4 và 1/4',right:'4/4'}],correctMatches:[0,1,2],explanation:'Cộng các tử số và giữ nguyên mẫu số.'};
 assert.equal(normalizeQuestion(item,'matching'),null);
});
