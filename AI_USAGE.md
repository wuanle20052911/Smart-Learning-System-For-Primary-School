# AI Usage Log

Project: MathJoy / Smart Learning System for Primary School  
Last updated: 27 October 2026

## 1. Scope and attribution

This file records the main AI-assisted implementation and documentation work for this project, including the checks and corrections applied to generated code. It consolidates the development notes in `submission-docs/AI_USAGE.md` and updates technical details against the current implementation.

Earlier development notes identify **Copilot SDK in VS Code** as the coding tool. Later quiz-generation work and the report/documentation work used **OpenAI Codex desktop**. The exact coding-model identifiers were not recorded and are not inferred. Historical tool attribution below follows the existing development log; it is not independently established by Git history.

The project author also used **Claude** to draft the `AI_USAGE.md` Markdown file and adjust its formatting. The exact Claude model and original prompt were not recorded. The current disclosure was reviewed and updated against the repository and the author's clarifications.

The project author also used **Canva AI to create interface backgrounds** and **OpenAI assistant image generation to create interface assets such as frames/panels and icons**, as confirmed by the author. These visual contributions are disclosed separately from AI-generated application code. The exact image-model identifiers and original visual prompts were not recorded.

Key prompts below are **reconstructed summaries**, not verbatim transcripts, unless explicitly identified otherwise. The checks describe recorded development verification or the local verification performed on 27 October 2026. They do not imply that every team member independently reviewed every generated line. Contributions or AI sessions not covered by these records should be added by the member who performed them.

## 2. Tools used

| Tool | Purpose | Boundary |
| --- | --- | --- |
| Copilot SDK in VS Code | Assisted with UI changes, study-plan logic, intent routing, RAG checks, evaluation scripts and telemetry. | Historical attribution from the development log; exact model not recorded. |
| OpenAI Codex desktop | Assisted with teacher quiz generation, prompts, validation, regression tests, repository inspection and project documentation. | Generated changes and explanations require review; passing local tests does not establish production correctness. |
| Claude | Used by the project author to draft `AI_USAGE.md` and adjust Markdown formatting. | Exact model and original prompt were not recorded. The author reviewed the file and later clarified its contents. |
| Canva AI | Used by the project author to create visual backgrounds for the learning interface. | Generated visual material, rather than the complete React application. Original Canva prompts and a per-file export history were not supplied. |
| OpenAI assistant image generation | Assisted with creating interface frames/panels and decorative icons for the project. | Attribution confirmed by the project author; exact image-generation model and per-file generation history are not recorded. |
| Ollama | Application inference for embeddings, student chat, intent classification and quiz generation/review. | A runtime AI component, distinct from the coding assistants that helped implement the application. Model-generated questions still require teacher review. |

## 3. Main AI-assisted parts and review

| Main part and source | Tool used | Key prompt summary | Generated or modified work | What was checked or changed |
| --- | --- | --- | --- | --- |
| Interface backgrounds in the project's image assets | Canva AI | Create a playful background for a primary-school learning application, with space for readable lesson content and controls. | Background artwork selected by the project author for use in the interface. | The author confirms using Canva AI for backgrounds. Asset existence and source references were inspected; the production frontend build passed. Exact per-file Canva provenance and visual usability testing are not claimed. |
| Interface frames/panels and icons in `src/assets/` and `public/img/` | OpenAI assistant image generation; Codex for code integration where documented | Create matching game-style frames and icons, such as a panel, trophy, star or stopwatch, for the primary-school interface. | Visual assets supporting panels, rewards and game/result displays, alongside application code that loads and places image assets. | Inspected asset files and references in the current source. The frontend build verifies that imported assets resolve. Transparency, cropping, contrast and responsive placement require visual review; no unrecorded editing operation is claimed. |
| Lesson reading and attempt-history UI in `src/` | Copilot SDK in VS Code | Make lessons easier to read in focus mode and present attempt history like the completed-result view. | Reading-width/layout changes and expanded result history showing scores, answers, explanations and elapsed time. | Recorded development review compared the result/history presentations, adjusted reading width after feedback and ran the frontend build. No automated visual or usability result is claimed. |
| Study recommendations: `services/studyPlan.js` | Copilot SDK in VS Code | Recommend what to study using actual pending assignments, deadlines and practice results; prioritize urgent work, then weak lessons, then the next lesson. | Deterministic recommendation priorities and navigation data for assignments and lessons. | Checked near-deadline ordering, weak-lesson evidence, pending/overdue work and the all-lessons-completed fallback in `tests/study-plan.test.js`. Recommendations remain rules, not a trained predictive model. |
| Intent routing: `services/studyIntent.js` | Copilot SDK in VS Code | Classify Vietnamese requests into assignments, recommendation or other, with local Ollama JSON output and a deterministic fallback. | Keyword normalization, intent parsing, local model lookup, timeout and fallback behavior. | Changed precedence so content questions containing “bài tập” are not treated as homework-status requests. Tested clear homework intent, model failure and Vietnamese phrasings. See Cases 1 and 2 below. |
| Grounded student answers: `services/knowledgeBase.js`, `services/aiPolicy.js`, `server.js` | Copilot SDK in VS Code | Answer from course materials with source IDs; reject unrelated evidence, refuse unsafe requests and abstain when unsupported. | Evidence filtering, direct definition extraction, versioned chat policy and structured answer validation. | Checked chunking, ranking, topical matches, complete sentences, input limits, refusal and source-ID filtering in knowledge-base and policy tests. A valid source ID does not itself prove semantic support for every answer sentence. |
| Evaluation scripts: `tests/ai-evaluation.js`, `tests/study-intent-evaluation.js` | Copilot SDK in VS Code | Create at least 20 normal, edge and refusal cases; compare baseline rules with improved behavior. | Fixed expected-outcome cases, baseline replay and pass-rate reporting. | Corrected the harness to distinguish intent `other` from actual refusal or abstention. Kept offline fixture results separate from live model results. See Case 2 below. |
| AI usage monitoring: `services/aiUsage.js`, `controllers/aiUsageController.js` | Copilot SDK in VS Code | Log AI usage metadata and provide an administrator dashboard with live summary updates. | Usage logging, summary access and SSE updates. | Checked the logging/summary interface and rejection of non-admin SSE subscriptions in `tests/ai-usage.test.js`. Verified that the usage record excludes question, prompt and answer text. The logger does not calculate monetary cost; missing token counts can appear as zero. |
| Teacher quiz generation: `services/quizGeneration.js`, `prompts/quiz.js`, `prompts/quiz/multiple-choice.js` | OpenAI Codex desktop | Improve unreliable teacher quiz drafts: use server-owned prompts, the intended quiz model, strict JSON, answer checking, review, bounded retries and explicit partial results. | Model selection, generator/reviewer prompts, schemas, validation, batching, timeout handling and answer-preserving option shuffling. | Checked model preference, missing answer indices, duplicate options, unsupported types, review completeness, partial output, truncated JSON and timeout behavior. Current creation supports four-option multiple-choice questions only. See Cases 3 and 4 below. |
| Arithmetic validation: `services/quizArithmetic.js`, `services/quizGeneration.js` | OpenAI Codex desktop | Check supported numeric answers exactly and prevent equivalent fractional options from creating multiple correct choices. | Rational arithmetic checks and numeric-option normalization used by the quiz gate. | Tests reject incorrect numeric keys and equivalent options such as `1/2` and `2/4`; verify `1/2 + 1/3 = 5/6`; reject division by zero and unsupported executable-looking input. Unsupported expressions are not treated as verified. |
| AI usage disclosure: `AI_USAGE.md` | Claude | Draft a Markdown log of the AI tools used in the project and format it clearly for submission. | Initial Markdown content and document formatting. | The project author reviewed the draft and clarified tool attribution. The current technical descriptions and verification figures were cross-checked against repository code and recorded command output; the exact original Claude prompt was not retained. |
| Project report and this log: `output/pdf/MathJoy_Project_Report.pdf`, `AI_USAGE.md` | OpenAI Codex desktop | Revise the report to include user stories, traceability, architecture, ADRs, AI design, evaluation, cost/latency and limitations; document AI contributions and mistakes. | Revised 14-page report and repository-root disclosure file. | Cross-checked active code and test output; replaced older test counts and outdated five-type quiz descriptions; distinguished measured results from configured timeouts and unmeasured operating cost. Rendered and visually inspected the PDF. |

### Visual design workflow and review boundary

The author used Canva AI to develop background artwork and asked the OpenAI assistant to help create complementary frames and icons. These assets support the interface's visual style; React components and CSS still implement layout, interactions, authorization states and learning workflows.

Examples of visual files present in the repository include `src/assets/Snowy Candy Game UI Panel.png`, `src/assets/Glossy Cartoon Stopwatch Icon.png`, `src/assets/Glossy Golden Star with Sparkles.png`, trophy graphics in `src/assets/leaderboard/`, and image/button assets in `public/img/`. These paths identify project assets; they do not establish which tool generated each individual file. The tool split above is based on the author's account.

The prompt descriptions in the table are representative summaries, not the original Canva or image-generation requests. Review should distinguish a successful asset import/build from visual quality: a passing build does not establish suitable contrast, correct transparent edges, readable text over a background or good placement on smaller screens. These visual assets also do not count as the code-error cases required below.

## 4. Cases where AI-generated code was wrong or insufficient

These cases are documented in the earlier development notes and linked here to the current fixes and regression evidence. They describe development defects or shortcomings, not observed production incidents. Test fixtures are examples used to verify a fix, not transcripts of live model output.

### Case 1 — Homework keywords intercepted lesson-content questions

**Tool:** Copilot SDK in VS Code, according to the development log.

**Problem:** The AI-assisted intent fallback matched homework phrases too broadly. A question such as “Cách giải bài tập này thế nào?” asks how to solve an exercise, but matching `bài tập` alone could send it to the pending-assignment list.

**How it was found:** Review of Vietnamese edge cases exposed the difference between a content question and a homework-status question. The example was added as regression case E07 in `tests/study-intent-evaluation.js`.

**What was changed:** `fallbackStudyIntent` in `services/studyIntent.js` recognizes content signals such as `cách giải`, `giải thích` and `định nghĩa`. The homework branch excludes recognized content questions, which return `other` rather than `assignments`.

**Verification:** `tests/study-plan.test.js` checks the distinction between assignment, recommendation and content questions. The current deterministic routing/refusal evaluation passes 34/34 cases, including E07. This verifies the selected phrasings, not every Vietnamese paraphrase.

### Case 2 — The evaluation harness could count an unsafe request as a pass without testing refusal

**Tool:** Copilot SDK in VS Code, according to the development log.

**Problem:** An initial AI-assisted evaluation draft used `other` as the expected result for dangerous or unrelated requests. `other` only means that a request is neither an assignment-status query nor a study recommendation; it does not prove that the request was refused.

**How it was found:** Reviewing the expected labels against the policy behavior showed that the harness measured routing while claiming to cover refusal. A dangerous request could receive the expected intent and pass without exercising the refusal outcome.

**What was changed:** `evaluateOutcome` in `tests/study-intent-evaluation.js` calls `getRefusalReason`. Safety/instruction-override matches produce `refuse`; out-of-scope matches produce `abstain`; ordinary requests retain their classified intent. The dataset includes five refusal/abstention cases.

**Verification:** The 34-case evaluation now checks these distinct outcomes and passes locally. The separate 26-case policy evaluation checks input rejection, answer acceptance and abstention using fixed response fixtures. Neither evaluation is a general live-model safety benchmark.

### Case 3 — Quiz-generation defaults could select an unsuitable model, and answer coercion could invent a key

**Tool:** OpenAI Codex desktop, as recorded in the quiz-generation revision notes.

**Problem:** The earlier generator preferred a small chat model before the intended quiz model. Earlier answer normalization could also turn a missing/null answer into index zero, creating a plausible-looking answer key without evidence that the model supplied one.

**How it was found:** Investigation of poor teacher quiz drafts included inspection of model selection and question normalization. Development review identified the model-order and answer-coercion problems; regression tests were added for these boundaries.

**What was changed:** `chooseModel` now honors an explicitly configured installed `OLLAMA_QUIZ_MODEL`, excludes embedding models and otherwise prefers quiz-capable installed models. `normalizeQuestion` requires an integer `correctIndex` from 0 to 3, four non-empty distinct options and an explanation; missing keys are rejected rather than guessed.

**Verification:** `tests/quiz-generation.test.js` includes “quiz model selection prefers quiz-capable model and never embedding” and “question gate rejects duplicate/empty options, fabricated index and wrong requested type”. Explicitly configured missing models fail rather than silently replacing the choice.

### Case 4 — Model review alone was insufficient to establish correct quiz answers

**Tool:** OpenAI Codex desktop assisted with the correction; Ollama produced the application quiz drafts/reviews described in the historical development notes.

**Problem:** Historical trials found that model-generated answer mappings and model review could be unreliable. A reviewer could misunderstand an item or return incomplete review coverage. Structurally valid JSON was therefore insufficient to justify accepting a question.

**How it was found:** Development notes record inspection of generated questions, answer mappings and reviewer reasoning during local trials. Current regression fixtures reproduce incorrect numeric keys, incomplete or duplicate reviews, and equivalent fractional distractors.

**What was changed:** Supported arithmetic is checked deterministically before acceptance. Equivalent numeric options are rejected. Every accepted candidate requires exactly one indexed approving review with a reason. Current generation is restricted to four-option multiple-choice items; historical matching/true-false trials do not describe currently supported creation types. Option shuffling preserves the answer key.

**Verification:** Regression tests check wrong arithmetic keys, equivalent fractions, missing/duplicate reviews, answer-preserving shuffling and explicit partial results. These gates reduce known failure modes; teachers must still review content because the same model can repeat mistakes and arithmetic checks have limited scope.

## 5. Verification record

The following commands were run successfully on **27 October 2026**, from the Windows project workspace using the bundled Node runtime. They were run during the report revision in this session; this documentation-only addition does not change application code.

| Command | Recorded result | What it establishes |
| --- | --- | --- |
| `node --test tests/*.test.js` | **76 passed, 0 failed** | Local unit/regression checks, including selected interfaces and mocked dependencies. Does not establish all deployed API or RLS behavior. |
| `node tests/ai-evaluation.js` | Baseline **16/26 (61.5%)**; improved **26/26 (100%)**; **+38.5 percentage points** | Offline policy replay: 8 normal, 8 edge and 10 refusal cases using fixed response objects. |
| `node tests/study-intent-evaluation.js` | Baseline **24/34 (70.6%)**; improved **34/34 (100%)**; **+29.4 percentage points** | Deterministic routing plus policy outcomes: 22 normal, 7 edge and 5 refusal/abstention cases. |
| `node node_modules/vite/bin/vite.js build` | **Passed**; warning about chunks larger than 500 kB | Production bundle compilation, not browser usability, load testing or live backend acceptance. |

The policy evaluation prints the historical label `ai-chat-v2 refusal guard`; the active student-chat prompt constant is `ai-chat-v3`. The script evaluates policy functions and fixtures, rather than making a live prompt-version comparison.

Earlier notes record live Ollama trials, but **no live Ollama benchmark was rerun on 27 October 2026** for the report/log revision. Historical live results are not presented as current validation. The optional command `node tests/study-intent-evaluation.js --local-ai` requires a running, configured Ollama service.

## 6. Current runtime AI configuration

- Student chat prompt: `ai-chat-v3`, defined in `services/aiPolicy.js`.
- Quiz generator/reviewer prompt: `quiz-generator-v3`, defined in `prompts/quiz.js`.
- Current quiz creation: multiple-choice only, exactly four options per accepted question; requested count 1–10; generation batches of at most three.
- Quiz model: explicit `OLLAMA_QUIZ_MODEL` when configured and installed; otherwise installed-model preference begins with `qwen3:8b`, then `qwen2.5:7b`.
- Student chat model preference: `OLLAMA_CHAT_MODEL`, default `llama3.2:3b`, with installed-model fallback resolution.
- Embedding default: `nomic-embed-text`, 768 dimensions.
- RAG defaults: 900-character chunks, 120-character overlap, top K 4 and similarity threshold 0.35. These are implementation settings, not empirically optimal values. The direct-definition path precedes the later generative-evidence similarity filter.
- Model calls are orchestrated by the backend. Local Ollama inference is distinct from Supabase, which remains an external authentication/data service.

## 7. Remaining review boundaries

- The hand-authored evaluation sets are small and reused for regression checks. Their pass rates do not establish general model accuracy, classroom benefit or comprehensive safety.
- Full live OAuth, cross-user/class authorization, database RLS and Storage-policy verification remain separate acceptance work.
- The model reviewer is a separate call, not necessarily a different model or an independent human expert. Schema checks and source IDs cannot prove factual correctness.
- Live AI latency distributions, hardware/energy use and total operating cost were not measured in this revision. Configured timeouts are not measured response times.
- This file is placed at the repository root for submission. Individual contribution ownership and any additional unrecorded AI sessions must be confirmed by the team. Creating this file does not itself commit or push it.
