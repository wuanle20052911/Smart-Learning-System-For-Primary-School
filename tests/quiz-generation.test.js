const test=require('node:test');const assert=require('node:assert/strict');
const {validateInput,chooseModel,normalizeQuestion,generateQuiz}=require('../services/quizGeneration');
const material='Cộng hai phân số cùng mẫu số: cộng tử số, giữ nguyên mẫu số; ví dụ 1/5 + 2/5 = 3/5. Rút gọn khi cần.';
const q=(name='Tính kết quả của phép cộng 1/5 + 3/5.')=>({type:'multiple-choice',question:name,options:['1/5','2/5','3/5','4/5'],correctIndex:3,explanation:'Cộng tử số 1 + 3 = 4, giữ mẫu số 5 nên kết quả là 4/5.'});
test('quiz model selection prefers quiz-capable model and never embedding',()=>{
 assert.equal(chooseModel(['nomic-embed-text:latest','llama3.2:3b','qwen2.5:7b','qwen3:8b']),'qwen3:8b');
 assert.equal(chooseModel(['nomic-embed-text:latest','llama3.2:3b','qwen2.5:7b']),'qwen2.5:7b');
 assert.throws(()=>chooseModel(['nomic-embed-text:latest']));
 assert.throws(()=>chooseModel(['llama3.2:3b'],'missing'));
 assert.equal(chooseModel(['qwen2.5:7b','llama3.2:3b'],'llama3.2:3b'),'llama3.2:3b');
});
test('quiz input requires source, validates bounds and supports legacy source extraction',()=>{
 assert.throws(()=>validateInput({material:'ngắn'}));assert.throws(()=>validateInput({material,questionCount:11}));
 for(const questionType of ['essay','true-false','fill-blank','short-answer','matching']) assert.throws(()=>validateInput({material,questionType}));
 assert.throws(()=>validateInput({material,grade:9}));
 assert.equal(validateInput({userPrompt:`Nguồn """${material}"""`}).material,material);
});
test('question gate rejects duplicate/empty options, fabricated index and wrong requested type',()=>{
 assert.ok(normalizeQuestion(q(),'multiple-choice'));
 assert.equal(normalizeQuestion({...q(),options:['1/5',' 1/5 ','3/5','4/5']},'multiple-choice'),null);
 assert.equal(normalizeQuestion({...q(),options:['','2','3','4']},'multiple-choice'),null);
 assert.equal(normalizeQuestion({...q(),correctIndex:undefined,answer:null},'multiple-choice'),null);
 assert.equal(normalizeQuestion(q(),'true-false'),null);
 assert.equal(normalizeQuestion({type:'matching'},'matching'),null);
 assert.equal(normalizeQuestion({type:'fill-blank'},'fill-blank'),null);
 assert.equal(normalizeQuestion({type:'short-answer'},'short-answer'),null);
 assert.equal(normalizeQuestion({...q(),explanation:''},'multiple-choice'),null);
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

test('arithmetic validation rejects wrong numeric keys for generated multiple-choice',()=>{
 const wrong={...q(),correctIndex:0};assert.equal(normalizeQuestion(wrong,'multiple-choice'),null);
});

test('exact arithmetic handles fractions and skips unsupported formulas safely',()=>{
 const {calculate,format}=require('../services/quizArithmetic');
 assert.equal(format(calculate('1/2 + 1/3')),'5/6');
 assert.equal(format(calculate('-3 + 2')),'-1');
 assert.equal(calculate('1 : 0'),null);assert.equal(calculate('process.exit()'),null);
});

test('natural Vietnamese sums are checked by arithmetic helper',()=>{
 const {calculate,format}=require('../services/quizArithmetic');assert.equal(format(calculate('Cộng 2/9 và 4/9')),'2/3');
});

test('only multiple-choice prompts can generate and review questions', async () => {
 const {getQuizPrompts, VERSION}=require('../prompts/quiz');
 const systems=[];
 const fetchImpl=async(url,opts)=>{
  if(url.endsWith('/api/tags'))return {ok:true,json:async()=>({models:[{name:'qwen2.5:7b'}]})};
  const body=JSON.parse(opts.body);systems.push(body.messages[0].content);
  const content=systems.length===1?{questions:[q()]}:{reviews:[{index:0,approved:true,reason:'Đã kiểm tra đáp án và giải thích.'}]};
  return {ok:true,json:async()=>({message:{content:JSON.stringify(content)}})};
 };
 const result=await generateQuiz(validateInput({material,questionType:'multiple-choice',questionCount:1}),{fetchImpl});
 const expected=getQuizPrompts('multiple-choice');
 assert.deepEqual(systems,[expected.generator,expected.reviewer]);
 assert.ok(systems.every(prompt=>prompt.includes('DẠNG: multiple-choice')));
 assert.equal(result.questions[0].type,'multiple-choice');assert.equal(result.promptVersion,VERSION);
 for(const type of ['true-false','fill-blank','short-answer','matching','essay']) assert.throws(()=>getQuizPrompts(type),/không được hỗ trợ/);
 assert.throws(()=>getQuizPrompts('constructor'),/không được hỗ trợ/);
});

test('large quizzes use batches of at most three and retain reviewer checks', async()=>{
 const sizes=[];let batch=[];let serial=0;
 const fetchImpl=async(url,opts)=>{
  if(url.endsWith('/api/tags'))return {ok:true,json:async()=>({models:[{name:'qwen3:8b'}]})};
  const body=JSON.parse(opts.body);assert.equal(body.think,false);
  let value;
  if(body.format.properties.questions){
   const count=body.format.properties.questions.maxItems;sizes.push(count);
   batch=Array.from({length:count},()=>q(`Tính kết quả của phép cộng 1/5 + 3/5. Bài số ${++serial}.`));
   value={questions:batch};
  }else value={reviews:batch.map((_,index)=>({index,approved:true,reason:'Đáp án đúng theo phép tính.'}))};
  return {ok:true,json:async()=>({message:{content:JSON.stringify(value)}})};
 };
 const result=await generateQuiz(validateInput({material,questionCount:7}),{fetchImpl});
 assert.deepEqual(sizes,[3,3,1]);assert.equal(result.questions.length,7);assert.equal(result.partial,false);
});
function waitForAbort(signal){return new Promise((resolve,reject)=>{
 const abort=()=>reject(new Error('aborted'));
 if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
});}
test('timeout identifies review stage and actual model without approving unchecked questions', async()=>{
 let calls=0;
 const fetchImpl=async(url,opts)=>{
  if(url.endsWith('/api/tags'))return {ok:true,json:async()=>({models:[{name:'qwen2.5:7b'}]})};
  if(++calls===1)return {ok:true,json:async()=>({message:{content:JSON.stringify({questions:[q()]})}})};
  return waitForAbort(opts.signal);
 };
 await assert.rejects(generateQuiz(validateInput({material,questionCount:1}),{fetchImpl,timeoutMs:20}),/kiểm tra đáp án.*qwen2.5:7b/);
 assert.equal(calls,2);
});
test('later timeout returns only previously reviewed questions as partial result', async()=>{
 let calls=0;
 const fetchImpl=async(url,opts)=>{
  if(url.endsWith('/api/tags'))return {ok:true,json:async()=>({models:[{name:'qwen2.5:7b'}]})};
  calls++;
  if(calls>2)return waitForAbort(opts.signal);
  const value=calls===1?{questions:[q()]}:{reviews:[{index:0,approved:true,reason:'Đáp án đúng theo phép tính.'}]};
  return {ok:true,json:async()=>({message:{content:JSON.stringify(value)}})};
 };
 const result=await generateQuiz(validateInput({material,questionCount:2}),{fetchImpl,timeoutMs:20});
 assert.equal(result.partial,true);assert.equal(result.questions.length,1);assert.equal(calls,3);
});
test('generation and review have separate timeout signals',async()=>{
 const signals=[];
 const fetchImpl=async(url,opts)=>{
  signals.push(opts.signal);
  const value=url.endsWith('/api/tags')?{models:[{name:'qwen2.5:7b'}]}:signals.length===2?{message:{content:JSON.stringify({questions:[q()]})}}:{message:{content:JSON.stringify({reviews:[{index:0,approved:true,reason:'Đáp án đúng theo phép tính.'}]})}};
  return {ok:true,json:async()=>value};
 };
 await generateQuiz(validateInput({material,questionCount:1}),{fetchImpl});
 assert.equal(new Set(signals).size,3);
});

test('truncated model output is retried and never reviewed as a complete batch',async()=>{
 let calls=0;
 const fetchImpl=async(url)=>{
  if(url.endsWith('/api/tags'))return {ok:true,json:async()=>({models:[{name:'qwen2.5:7b'}]})};
  calls++;
  return {ok:true,json:async()=>({done_reason:'length',message:{content:JSON.stringify({questions:[q()]})}})};
 };
 await assert.rejects(generateQuiz(validateInput({material,questionCount:1}),{fetchImpl}),/chưa tạo được/);
 assert.equal(calls,3);
});
