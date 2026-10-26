const { VERSION, GENERATOR, REVIEWER } = require('../prompts/quiz');
const { randomInt } = require('node:crypto');
const { verifyArithmetic } = require('./quizArithmetic');
const TYPES = new Set(['multiple-choice', 'true-false', 'fill-blank', 'short-answer', 'matching']);
const text = (s) => typeof s === 'string' ? s.trim() : '';
const key = (s) => text(s).normalize('NFKC').toLocaleLowerCase('vi').replace(/[\p{P}\p{Z}\s]+/gu, ' ').trim();
const stringSchema = { type: 'string', minLength: 1 };
function optionKey(value) {
  const normalized = key(value);
  const match = text(value).match(/^([+-]?\d{1,12})(?:\s*\/\s*(\d{1,12}))?\s*([^\d]*)$/u);
  if (!match) return normalized;
  let n = BigInt(match[1]); let denominator = BigInt(match[2] || '1');
  if (!denominator) return normalized;
  let a=n<0n?-n:n;let b=denominator;while(b){[a,b]=[b,a%b];}
  return `${n/a}/${denominator/a} ${key(match[3])}`;
}
function shuffleChoices(question, pick = randomInt) {
  if (question.type === 'matching') {
    const order=question.pairs.map((_,i)=>i);
    for(let i=order.length-1;i>0;i--){const j=pick(i+1);[order[i],order[j]]=[order[j],order[i]];}
    return {...question,pairs:question.pairs.map((pair,i)=>({...pair,right:question.pairs[order[i]].right})),correctMatches:question.correctMatches.map(i=>order.indexOf(i))};
  }
  if (question.type !== 'multiple-choice') return question;
  const order = question.options.map((_, index) => index);
  for (let i=order.length-1;i>0;i--) {const j=pick(i+1);[order[i],order[j]]=[order[j],order[i]];}
  const correctIndex=order.indexOf(question.correctIndex);
  return {...question, options:order.map(i=>question.options[i]),correctIndex,answer:correctIndex};
}
function questionSchema(type, count) {
  const properties = { type: { type: 'string', enum: [type] }, question: stringSchema, explanation: stringSchema };
  if (['multiple-choice', 'true-false'].includes(type)) Object.assign(properties, {
    options: { type: 'array', items: stringSchema, minItems: type === 'true-false' ? 2 : 4, maxItems: type === 'true-false' ? 2 : 4 },
    correctIndex: { type: 'integer', minimum: 0, maximum: type === 'true-false' ? 1 : 3 }
  });
  else if (type === 'matching') Object.assign(properties, {
    pairs: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'object', properties: { left: stringSchema, right: stringSchema }, required: ['left', 'right'], additionalProperties: false } },
    correctMatches: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'integer', minimum: 0, maximum: 4 } }
  });
  else properties.answer = stringSchema;
  return { type: 'object', properties: { questions: { type: 'array', minItems: count, maxItems: count, items: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false } } }, required: ['questions'], additionalProperties: false };
}
function normalizeQuestion(q, type) {
  if (!q || Array.isArray(q) || typeof q !== 'object' || (q.type && q.type !== type)) return null;
  const result = { type, question: text(q.question), explanation: text(q.explanation) };
  if (result.question.length < 10 || result.question.length > 1800 || result.explanation.length < 12) return null;
  if (/\b(?:hình bên|hình dưới|hình trên|bảng bên|bảng dưới|biểu đồ sau)\b/iu.test(result.question)) return null;
  if (type === 'multiple-choice' || type === 'true-false') {
    const n = type === 'true-false' ? 2 : 4;
    if (!Array.isArray(q.options) || q.options.length !== n || !q.options.every(x => typeof x === 'string' && x.trim())) return null;
    result.options = q.options.map(text);
    if (new Set(result.options.map(optionKey)).size !== n || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= n) return null;
    if (type === 'true-false') {
      if (!result.options.some(x=>key(x)==='đúng') || !result.options.some(x=>key(x)==='sai')) return null;
      result.correctIndex = key(result.options[q.correctIndex]) === 'đúng' ? 0 : 1;
      result.options = ['Đúng', 'Sai'];
    } else result.correctIndex = q.correctIndex;
    result.answer = result.correctIndex;
  } else if (type === 'matching') {
    if (!Array.isArray(q.pairs) || q.pairs.length < 3 || q.pairs.length > 5) return null;
    const n = q.pairs.length;
    if (!q.pairs.every(p => p && text(p.left) && text(p.right))) return null;
    if (new Set(q.pairs.map(p => key(p.left))).size !== n || new Set(q.pairs.map(p => optionKey(p.right))).size !== n) return null;
    if (!Array.isArray(q.correctMatches) || q.correctMatches.length !== n || new Set(q.correctMatches).size !== n
      || !q.correctMatches.every(x => Number.isInteger(x) && x >= 0 && x < n)) return null;
    result.pairs = q.pairs.map(p => ({ left: text(p.left), right: text(p.right) }));result.correctMatches = [...q.correctMatches];
  } else {
    result.answer = typeof q.answer === 'number' && Number.isFinite(q.answer) ? String(q.answer) : text(q.answer);
    if (!result.answer || result.answer.length > 160) return null;
    const fraction=result.answer.match(/^([+-]?\d{1,12})\s*\/\s*(\d{1,12})$/);
    if (fraction) {
      let n=BigInt(fraction[1]);let den=BigInt(fraction[2]);if(!den)return null;
      let a=n<0n?-n:n;let b=den;while(b){[a,b]=[b,a%b];}
      n/=a;den/=a;result.answer=den===1n?String(n):`${n}/${den}`;
    }
    if (type === 'fill-blank' && (result.question.match(/_{3,}/g) || []).length !== 1) return null;
  }
  return verifyArithmetic(result);
}
function chooseModel(installed, configured = process.env.OLLAMA_QUIZ_MODEL) {
  const available = installed.filter(x => typeof x === 'string' && !/embed|nomic|bge|all-minilm/i.test(x));
  if (configured) {
    const match = available.find(x => x === configured || x === configured + ':latest');
    if (!match) throw new Error(`Model tạo bài tập ${configured} chưa được tải. Kiểm tra OLLAMA_QUIZ_MODEL.`);
    return match;
  }
  const order = ['qwen2.5:7b', process.env.OLLAMA_MODEL, 'deepseek-r1:8b', 'qwen2.5:3b', 'llama3.2:3b'].filter(Boolean);
  const model = order.find(x => available.includes(x)) || available[0];
  if (!model) throw new Error('Chưa có model sinh văn bản. Hãy tải qwen2.5:7b hoặc cấu hình OLLAMA_QUIZ_MODEL.');
  return model;
}
function validateInput(body = {}) {
  if (!body || typeof body !== 'object') throw new Error('Dữ liệu tạo bài tập không hợp lệ.');
  let material = text(body.material);
  // Compatibility for the previous editor request, without trusting its system prompt.
  if (!material && typeof body.userPrompt === 'string') material = body.userPrompt.match(/"""([\s\S]*?)"""/)?.[1]?.trim() || '';
  const type = body.questionType || 'multiple-choice'; const count = body.questionCount ?? 5;
  if (!TYPES.has(type)) throw new Error('Dạng câu hỏi không được hỗ trợ.');
  if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error('Số câu hỏi phải từ 1 đến 10.');
  if (material.length < 50) throw new Error('Học liệu quá ngắn. Vui lòng cung cấp nội dung kiến thức và ví dụ của bài học.');
  if (material.length > 24000) throw new Error('Học liệu quá dài. Hãy chọn một bài hoặc rút gọn còn tối đa 24.000 ký tự.');
  const difficulty = body.difficulty || 'balanced';
  if (!['basic','balanced','application'].includes(difficulty)) throw new Error('Mức độ câu hỏi không hợp lệ.');
  const grade = body.grade == null ? '' : String(body.grade);
  if (grade && !/^(?:[1-5]|(?:Lớp|lớp)\s*[1-5])$/.test(grade)) throw new Error('Chọn lớp từ 1 đến 5.');
  if (text(body.instructions).length > 1000) throw new Error('Yêu cầu thêm tối đa 1.000 ký tự.');
  return { material, type, count, grade, difficulty, instructions: text(body.instructions), lessonTitle: text(body.lessonTitle).slice(0, 200) };
}
const reviewSchema = { type:'object', properties:{reviews:{type:'array',items:{type:'object',properties:{index:{type:'integer'},approved:{type:'boolean'},reason:stringSchema},required:['index','approved','reason'],additionalProperties:false}}},required:['reviews'],additionalProperties:false };
async function generateQuiz(input, { fetchImpl = fetch, baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434', timeoutMs = 180000, configuredModel, onUsage = () => {} } = {}) {
  const url = baseUrl.replace(/\/$/, '');const controller = new AbortController();const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const tags = await fetchImpl(url+'/api/tags', {signal:controller.signal});
    if (!tags.ok) throw new Error('Không đọc được danh sách model Ollama.');
    const data = await tags.json();const model = chooseModel((data.models || []).map(x=>x.name||x.model), configuredModel);
    onUsage({model,promptTokens:0,completionTokens:0});
    async function ask(system, prompt, schema) {
      const response = await fetchImpl(url+'/api/chat', {method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({model, messages:[{role:'system',content:system},{role:'user',content:prompt}],format:schema,stream:false,keep_alive:'10m',options:{temperature:0.15,num_ctx:16384,num_predict:6000}})});
      if (!response.ok) throw new Error(`Ollama trả lỗi ${response.status}. Kiểm tra model rồi thử lại.`);
      const result=await response.json();onUsage({model,promptTokens:result.prompt_eval_count||0,completionTokens:result.eval_count||0});
      const content = result.message?.content;
      if (typeof content !== 'string' || !content.trim()) throw new Error('Model không trả nội dung câu hỏi.');
      return JSON.parse(content.replace(/<think>[\s\S]*?<\/think>/gi,'').replace(/^```(?:json)?\s*|\s*```$/g,'').trim());
    }
    const questions=[];const rejected=[];const seen=new Set();let attempts=0;
    const level={basic:'Nhận biết và vận dụng trực tiếp một bước.',balanced:'Kết hợp hiểu kiến thức và vận dụng, độ khó tăng nhẹ.',application:'Vận dụng vào tình huống mới cùng kiến thức, không vượt chương trình.'}[input.difficulty];
    const context=JSON.stringify({lesson:input.lessonTitle,grade:input.grade||'Tiểu học, theo độ khó của học liệu',difficulty:level,teacherRequest:input.instructions,material:input.material});
    while (questions.length < input.count && attempts < 3) {
      attempts++;const remaining=input.count-questions.length;let candidates;
      try {
        const result=await ask(GENERATOR,`NGỮ CẢNH (JSON dữ liệu):\n${context}\nTạo đúng ${remaining} câu dạng ${input.type}. Không lặp: ${JSON.stringify(questions.map(x=>x.question))}.\nLỗi lượt trước cần tránh: ${JSON.stringify(rejected.slice(-8))}`,questionSchema(input.type,remaining));
        if (!Array.isArray(result.questions)) {rejected.push('Thiếu mảng questions');continue;}
        const batchSeen=new Set();
        candidates=result.questions.map(q=>normalizeQuestion(q,input.type)).filter(q=>{
          if (!q) {rejected.push('Sai cấu trúc hoặc thiếu giải thích, đáp án, chỗ trống hoặc phương án');return false;}
          const signature=key(q.question);if(seen.has(signature)||batchSeen.has(signature))return false;batchSeen.add(signature);return true;
        }).slice(0,remaining);
      } catch(error) {
        if (error instanceof SyntaxError) {rejected.push('JSON không hợp lệ');continue;}
        throw error;
      }
      if (!candidates.length) continue;
      let review;
      try {
        const schema=JSON.parse(JSON.stringify(reviewSchema));
        schema.properties.reviews.minItems=candidates.length;
        schema.properties.reviews.maxItems=candidates.length;
        schema.properties.reviews.items.properties.index={type:'integer',minimum:0,maximum:candidates.length-1};
        review=await ask(REVIEWER,`NGỮ CẢNH:\n${context}\nCó đúng ${candidates.length} CÂU HỎI. Trả đúng ${candidates.length} review, một review cho mỗi questionIndex. Một câu matching có nhiều pairs vẫn CHỈ LÀ MỘT CÂU HỎI, kiểm tra toàn bộ pairs trước khi quyết định approved.\n${JSON.stringify(candidates.map((question,questionIndex)=>({questionIndex,question})))}`,schema);
      }
      catch(error) {if(error instanceof SyntaxError){rejected.push('Phản biện trả JSON không hợp lệ');continue;}throw error;}
      const reviews=Array.isArray(review.reviews) && review.reviews.length===candidates.length
        && new Set(review.reviews.map(r=>r?.index)).size===candidates.length
        && review.reviews.every(r=>Number.isInteger(r?.index)&&r.index>=0&&r.index<candidates.length) ? review.reviews : [];
      candidates.forEach((q,index)=>{
        const matches=reviews.filter(r=>r?.index===index);
        if(matches.length===1 && matches[0].approved===true && text(matches[0].reason)) { questions.push(shuffleChoices(q));seen.add(key(q.question)); }
        else rejected.push(text(matches[0]?.reason)||'Không có kết quả kiểm tra độc lập hợp lệ');
      });
    }
    if (!questions.length) throw new Error('AI chưa tạo được câu hỏi vượt qua bước kiểm tra đáp án. Hãy chọn học liệu rõ hơn hoặc giảm số câu rồi thử lại.');
    return {questions,model,attempts,requestedCount:input.count,partial:questions.length<input.count,promptVersion:VERSION};
  } catch(error) {
    if (controller.signal.aborted) throw new Error('AI tạo và kiểm tra bài tập quá thời gian chờ. Hãy giảm số câu hoặc chọn bài ngắn hơn.');
    throw error;
  } finally {clearTimeout(timeout);}
}
module.exports={VERSION,validateInput,chooseModel,questionSchema,normalizeQuestion,generateQuiz,shuffleChoices};
