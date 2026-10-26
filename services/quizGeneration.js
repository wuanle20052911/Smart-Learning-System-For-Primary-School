const { VERSION, getQuizPrompts } = require('../prompts/quiz');
const { randomInt } = require('node:crypto');
const { verifyArithmetic } = require('./quizArithmetic');
const TYPES = new Set(['multiple-choice']);
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
  if (question.type !== 'multiple-choice') return question;
  const order = question.options.map((_, index) => index);
  for (let i=order.length-1;i>0;i--) {const j=pick(i+1);[order[i],order[j]]=[order[j],order[i]];}
  const correctIndex=order.indexOf(question.correctIndex);
  return {...question, options:order.map(i=>question.options[i]),correctIndex,answer:correctIndex};
}
function questionSchema(type, count) {
  if (type !== 'multiple-choice') throw new Error('Dạng câu hỏi không được hỗ trợ.');
  const properties = { type: { type: 'string', enum: [type] }, question: stringSchema, explanation: stringSchema };
  Object.assign(properties, {
    options: { type: 'array', items: stringSchema, minItems: 4, maxItems: 4 },
    correctIndex: { type: 'integer', minimum: 0, maximum: 3 }
  });
  return { type: 'object', properties: { questions: { type: 'array', minItems: count, maxItems: count, items: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false } } }, required: ['questions'], additionalProperties: false };
}
function normalizeQuestion(q, type) {
  if (type !== 'multiple-choice' || !q || Array.isArray(q) || typeof q !== 'object' || (q.type && q.type !== type)) return null;
  const result = { type, question: text(q.question), explanation: text(q.explanation) };
  if (result.question.length < 10 || result.question.length > 1800 || result.explanation.length < 12) return null;
  if (/\b(?:hình bên|hình dưới|hình trên|bảng bên|bảng dưới|biểu đồ sau)\b/iu.test(result.question)) return null;
  if (!Array.isArray(q.options) || q.options.length !== 4 || !q.options.every(x => typeof x === 'string' && x.trim())) return null;
  result.options = q.options.map(text);
  if (new Set(result.options.map(optionKey)).size !== 4 || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= 4) return null;
  result.correctIndex = q.correctIndex;
  result.answer = result.correctIndex;
  return verifyArithmetic(result);
}
function chooseModel(installed, configured = process.env.OLLAMA_QUIZ_MODEL) {
  const available = installed.filter(x => typeof x === 'string' && !/embed|nomic|bge|all-minilm/i.test(x));
  if (configured) {
    const match = available.find(x => x === configured || x === configured + ':latest');
    if (!match) throw new Error(`Model tạo bài tập ${configured} chưa được tải. Kiểm tra OLLAMA_QUIZ_MODEL.`);
    return match;
  }
  const order = ['qwen3:8b', 'qwen2.5:7b', process.env.OLLAMA_MODEL, 'deepseek-r1:8b', 'qwen2.5:3b', 'llama3.2:3b'].filter(Boolean);
  const model = order.find(x => available.includes(x)) || available[0];
  if (!model) throw new Error('Chưa có model sinh văn bản. Hãy tải qwen3:8b hoặc cấu hình OLLAMA_QUIZ_MODEL.');
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
async function generateQuiz(input, { fetchImpl = fetch, baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434', timeoutMs = Number(process.env.OLLAMA_QUIZ_TIMEOUT_MS) || 300000, configuredModel, onUsage = () => {} } = {}) {
  const { generator, reviewer } = getQuizPrompts(input.type);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Thời gian chờ AI phải là số dương.');
  const url = baseUrl.replace(/\/$/, '');
  let model;
  const questions=[];let attempts=0;
  const completed = () => ({questions,model,attempts,requestedCount:input.count,partial:questions.length<input.count,promptVersion:VERSION});
  async function requestJson(path, options, stage, limit = timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), limit);
    try {
      const response = await fetchImpl(url+path, {...options,signal:controller.signal});
      if (!response.ok) throw new Error(`Ollama trả lỗi ${response.status} ở bước ${stage}. Kiểm tra model rồi thử lại.`);
      return await response.json();
    } catch (error) {
      if (controller.signal.aborted) {
        const failure = new Error(`AI quá thời gian chờ ở bước ${stage}${model ? ` (model ${model})` : ''} sau ${limit/1000} giây. Hãy giảm số câu hoặc tăng OLLAMA_QUIZ_TIMEOUT_MS.`);
        failure.code = 'QUIZ_TIMEOUT';
        throw failure;
      }
      throw error;
    } finally {clearTimeout(timeout);}
  }
  try {
    const data = await requestJson('/api/tags', {}, 'đọc danh sách model', Math.min(timeoutMs, 10000));
    model = chooseModel((data.models || []).map(x=>x.name||x.model), configuredModel);
    onUsage({model,promptTokens:0,completionTokens:0});
    async function ask(system, prompt, schema, stage, count) {
      const result = await requestJson('/api/chat', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model, messages:[{role:'system',content:system},{role:'user',content:prompt}],format:schema,stream:false,keep_alive:'10m',...(/^qwen3:/.test(model) ? {think:false} : {}),options:{temperature:0.15,num_ctx:16384,num_predict:stage==='tạo câu hỏi' ? 600+count*700 : 300+count*300}})}, stage);
      onUsage({model,promptTokens:result.prompt_eval_count||0,completionTokens:result.eval_count||0});
      if (result.done_reason === 'length') throw new SyntaxError('Model hết giới hạn đầu ra trước khi hoàn thành JSON.');
      const content = result.message?.content;
      if (typeof content !== 'string' || !content.trim()) throw new Error('Model không trả nội dung câu hỏi.');
      return JSON.parse(content.replace(/<think>[\s\S]*?<\/think>/gi,'').replace(/^```(?:json)?\s*|\s*```$/g,'').trim());
    }
    const rejected=[];const seen=new Set();
    const level={basic:'Nhận biết và vận dụng trực tiếp một bước.',balanced:'Kết hợp hiểu kiến thức và vận dụng, độ khó tăng nhẹ.',application:'Vận dụng vào tình huống mới cùng kiến thức, không vượt chương trình.'}[input.difficulty];
    const context=JSON.stringify({lesson:input.lessonTitle,grade:input.grade||'Tiểu học, theo độ khó của học liệu',difficulty:level,teacherRequest:input.instructions,material:input.material});
    while (questions.length < input.count && attempts < Math.ceil(input.count/3)*3) {
      attempts++;const remaining=Math.min(3,input.count-questions.length);let candidates;
      try {
        const result=await ask(generator,`NGỮ CẢNH (JSON dữ liệu):\n${context}\nTạo đúng ${remaining} câu dạng ${input.type}. Không lặp: ${JSON.stringify(questions.map(x=>x.question))}.\nLỗi lượt trước cần tránh: ${JSON.stringify(rejected.slice(-8))}`,questionSchema(input.type,remaining),'tạo câu hỏi',remaining);
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
        review=await ask(reviewer,`NGỮ CẢNH:\n${context}\nCó đúng ${candidates.length} CÂU HỎI. Trả đúng ${candidates.length} review, một review cho mỗi questionIndex.\n${JSON.stringify(candidates.map((question,questionIndex)=>({questionIndex,question})))}`,schema,'kiểm tra đáp án',candidates.length);
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
    return completed();
  } catch(error) {
    if (error.code === 'QUIZ_TIMEOUT' && questions.length) return completed();
    throw error;
  }
}
module.exports={VERSION,validateInput,chooseModel,questionSchema,normalizeQuestion,generateQuiz,shuffleChoices};
