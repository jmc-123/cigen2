const DATA_PATH = "./data/roots_affixes.json";
const STORAGE_KEY = "cigen-root-progress-v1";

const state = {
  roots: [],
  entries: [],
  rootMap: new Map(),
  rootToEntries: new Map(),
  filteredRoots: [],
  selectedRoot: null,
  selectedWord: null,
  wordMatches: [],
  flash: {
    pool: [],
    index: 0,
    revealed: false,
  },
  quiz: {
    question: null,
  },
  progress: loadProgress(),
};

const els = {
  tabs: [...document.querySelectorAll(".tab")],
  panels: {
    home: document.getElementById("panel-home"),
    learn: document.getElementById("panel-learn"),
    k12: document.getElementById("panel-k12"),
    about: document.getElementById("panel-about"),
  },
  metaStats: document.getElementById("metaStats"),
  rootSearch: document.getElementById("rootSearch"),
  randomRoot: document.getElementById("randomRoot"),
  rootList: document.getElementById("rootList"),
  rootDetail: document.getElementById("rootDetail"),
  wordSearchResults: document.getElementById("wordSearchResults"),
  flashMeta: document.getElementById("flashMeta"),
  flashCard: document.getElementById("flashCard"),
  flashReveal: document.getElementById("flashReveal"),
  flashAgain: document.getElementById("flashAgain"),
  flashKnow: document.getElementById("flashKnow"),
  flashNext: document.getElementById("flashNext"),
  quizScore: document.getElementById("quizScore"),
  quizQuestion: document.getElementById("quizQuestion"),
  quizOptions: document.getElementById("quizOptions"),
  quizFeedback: document.getElementById("quizFeedback"),
  nextQuiz: document.getElementById("nextQuiz"),
  k12Semester: document.getElementById("k12Semester"),
  k12Units: document.getElementById("k12Units"),
  k12Progress: document.getElementById("k12Progress"),
  k12Flashcard: document.getElementById("k12Flashcard"),
  k12CardContainer: document.getElementById("k12CardContainer"),
  k12Chinese: document.getElementById("k12Chinese"),
  k12Exp: document.getElementById("k12Exp"),
  k12Word: document.getElementById("k12Word"),
  k12Example: document.getElementById("k12Example"),
  k12Prev: document.getElementById("k12Prev"),
  k12Next: document.getElementById("k12Next"),
  k12Shuffle: document.getElementById("k12Shuffle"),
  k12Sequential: document.getElementById("k12Sequential"),
};

bindEvents();
loadData();

function bindEvents() {
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  });

  els.rootSearch.addEventListener("input", () => {
    handleSearchInput();
  });

  els.randomRoot.addEventListener("click", () => {
    if (!state.filteredRoots.length) {
      return;
    }
    const chosen = sample(state.filteredRoots);
    selectRoot(chosen.root);
  });

  els.flashReveal.addEventListener("click", () => {
    state.flash.revealed = true;
    renderFlashCard();
  });

  els.flashAgain.addEventListener("click", () => {
    advanceFlash();
  });

  els.flashKnow.addEventListener("click", () => {
    const root = state.flash.pool[state.flash.index];
    if (root) {
      state.progress.mastered[root] = true;
      saveProgress();
      renderMeta();
    }
    advanceFlash();
  });

  els.flashNext.addEventListener("click", () => {
    advanceFlash(true);
  });

  els.quizOptions.addEventListener("click", (event) => {
    const target = event.target.closest("button[data-root]");
    if (!target || !state.quiz.question) {
      return;
    }
    answerQuiz(target.dataset.root);
  });

  els.nextQuiz.addEventListener("click", () => {
    newQuizQuestion();
  });
}

function handleSearchInput() {
  const query = els.rootSearch.value.trim();
  renderRootList(query);
  if (state.filteredRoots.length) {
    selectRoot(state.filteredRoots[0].root);
  }
}

async function loadData() {
  try {
    const response = await fetch(DATA_PATH);
    if (!response.ok) {
      throw new Error(`无法加载数据: ${response.status}`);
    }
    const data = await response.json();
    state.roots = data.roots || [];
    state.entries = data.entries || [];
    state.rootMap = new Map(state.roots.map((item) => [item.root, item]));
    state.rootToEntries = buildRootToEntries(state.entries);

    renderMeta(data.meta || {});
    renderRootList("");
    if (state.roots.length) {
      selectRoot(state.roots[0].root);
    }
    initFlash();
    newQuizQuestion();
  } catch (error) {
    els.metaStats.textContent = `加载失败: ${error.message}`;
    els.rootDetail.textContent = "请确认 data/roots_affixes.json 文件存在。";
  }
}

function buildRootToEntries(entries) {
  const map = new Map();
  entries.forEach((entry) => {
    (entry.components || []).forEach((component) => {
      const root = component.morpheme;
      if (!root) {
        return;
      }
      if (!map.has(root)) {
        map.set(root, []);
      }
      map.get(root).push(entry);
    });
  });
  return map;
}

function renderMeta(meta = {}) {
  clearNode(els.metaStats);
  const masteredCount = Object.values(state.progress.mastered).filter(Boolean).length;
  const chips = [
    `词条 ${meta.entryCount || state.entries.length}`,
    `词根/词缀 ${meta.rootCount || state.roots.length}`,
    `已掌握 ${masteredCount}`,
    `测验 ${state.progress.quizCorrect}/${state.progress.quizTotal}`,
  ];
  chips.forEach((text) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = text;
    els.metaStats.appendChild(chip);
  });
}

function activateTab(tabName) {
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  Object.entries(els.panels).forEach(([key, panel]) => {
    panel.classList.toggle("active", key === tabName);
  });
}

function renderRootList(query) {
  const q = query.toLowerCase();
  state.filteredRoots = state.roots.filter((rootData) => {
    if (!q) {
      return true;
    }
    if (rootData.root.includes(q)) {
      return true;
    }
    if ((rootData.gloss || "").includes(q)) {
      return true;
    }
    return false;
  });

  clearNode(els.rootList);
  if (!state.filteredRoots.length) {
    const empty = document.createElement("div");
    empty.textContent = "没有找到匹配项，试试更短关键词。";
    els.rootList.appendChild(empty);
    return;
  }

  state.filteredRoots.forEach((rootData) => {
    const item = document.createElement("div");
    item.className = "root-item";
    if (rootData.root === state.selectedRoot) {
      item.classList.add("active");
    }

    const head = document.createElement("div");
    head.className = "root-head";

    const root = document.createElement("span");
    root.className = "root-key";
    root.textContent = rootData.root;

    const count = document.createElement("span");
    count.textContent = `${rootData.wordCount}词`;

    head.appendChild(root);
    head.appendChild(count);

    const gloss = document.createElement("div");
    gloss.className = "root-gloss";
    gloss.textContent = rootData.gloss || "点击查看例词联想";

    item.appendChild(head);
    item.appendChild(gloss);
    item.addEventListener("click", () => selectRoot(rootData.root));
    els.rootList.appendChild(item);
  });
}

function selectRoot(root) {
  state.selectedRoot = root;
  state.selectedWord = null;
  renderRootList(els.rootSearch.value.trim());
  renderRootDetail();
}

function renderRootDetail() {
  const rootData = state.rootMap.get(state.selectedRoot);
  clearNode(els.rootDetail);
  if (!rootData) {
    els.rootDetail.textContent = "未找到该词根数据。";
    return;
  }

  const head = document.createElement("div");
  head.className = "detail-head";

  const rootName = document.createElement("div");
  rootName.className = "detail-root";
  rootName.textContent = rootData.root;

  const gloss = document.createElement("span");
  gloss.className = "chip";
  gloss.textContent = rootData.gloss || "建议通过例词记忆";

  const count = document.createElement("span");
  count.className = "chip";
  count.textContent = `${rootData.wordCount} 个相关词`;

  const mastered = document.createElement("span");
  mastered.className = "chip";
  mastered.textContent = state.progress.mastered[rootData.root] ? "已掌握" : "待复习";

  head.appendChild(rootName);
  head.appendChild(gloss);
  head.appendChild(count);
  head.appendChild(mastered);

  const intro = document.createElement("p");
  intro.textContent = "例词拆解（优先展示包含此词根/词缀的词条）:";

  const examples = document.createElement("div");
  examples.className = "examples";
  const relatedEntries = (state.rootToEntries.get(rootData.root) || []).slice(0, 24);
  if (!relatedEntries.length) {
    const empty = document.createElement("p");
    empty.textContent = "暂无相关例词。";
    els.rootDetail.appendChild(head);
    els.rootDetail.appendChild(empty);
    return;
  }

  relatedEntries.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "example-card";

    const word = document.createElement("div");
    word.className = "example-word clickable-word";
    highlightComponents(word, entry.word, entry.components);
    word.addEventListener("click", () => {
      showWordDetail(entry);
    });

    const meaning = document.createElement("div");
    meaning.className = "example-meaning";
    meaning.textContent = entry.meaning;

    const decomposition = document.createElement("div");
    decomposition.className = "example-decomp";
    decomposition.textContent = entry.decomposition;

    card.appendChild(word);
    card.appendChild(meaning);
    card.appendChild(decomposition);
    examples.appendChild(card);
  });


  els.rootDetail.appendChild(head);
  els.rootDetail.appendChild(intro);
  els.rootDetail.appendChild(examples);
}

function renderWordSearchResults(query) {
  const container = els.wordSearchResults;
  clearNode(container);
  const q = query.toLowerCase();
  if (!q) {
    const hint = document.createElement("div");
    hint.className = "word-search-hint";
    hint.textContent = "支持：词根/词缀/中文提示 + 单词直接检索。";
    container.appendChild(hint);
    state.wordMatches = [];
    return;
  }

  const matches = state.entries.filter((entry) => entry.word.toLowerCase().includes(q));
  state.wordMatches = matches;
  if (!matches.length) {
    const empty = document.createElement("div");
    empty.className = "word-search-empty";
    empty.textContent = "没有按单词匹配的结果。";
    container.appendChild(empty);
    return;
  }

  const title = document.createElement("div");
  title.className = "word-search-title";
  title.textContent = `按单词匹配 (${matches.length})：`;
  container.appendChild(title);

  const list = document.createElement("div");
  list.className = "word-search-list";
  matches.slice(0, 40).forEach((entry) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "word-chip";
    chip.textContent = entry.word;
    chip.addEventListener("click", () => {
      showWordDetail(entry);
    });
    list.appendChild(chip);
  });
  container.appendChild(list);
}

function showWordDetail(entry) {
  if (!entry) return;
  state.selectedWord = entry.word;
  closeWordPopup();

  const overlay = document.createElement("div");
  overlay.className = "word-popup-overlay";
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeWordPopup();
  });

  const popup = document.createElement("div");
  popup.className = "word-popup";

  const closeBtn = document.createElement("button");
  closeBtn.className = "word-popup-close";
  closeBtn.textContent = "\u00d7";
  closeBtn.addEventListener("click", closeWordPopup);
  popup.appendChild(closeBtn);

  const title = document.createElement("div");
  title.className = "word-detail-title";
  const wordText = document.createElement("span");
  highlightComponents(wordText, entry.word, entry.components);
  title.appendChild(wordText);

  const audioWrap = document.createElement("div");
  audioWrap.className = "word-detail-audio";
  const audio = document.createElement("audio");
  audio.controls = true;
  audio.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(entry.word)}&type=2`;
  audioWrap.appendChild(audio);

  const def = document.createElement("p");
  def.className = "word-detail-def";
  def.textContent = buildSimpleDefinition(entry);

  const example = document.createElement("p");
  example.className = "word-detail-example";
  example.textContent = buildSimpleExampleSentence(entry);

  const decomp = document.createElement("p");
  decomp.className = "word-detail-decomp";
  decomp.textContent = `拆解：${entry.decomposition || "（暂无拆解信息）"}`;

  const morphemes = document.createElement("div");
  morphemes.className = "word-detail-morphemes";
  const label = document.createElement("span");
  label.textContent = "词根/词缀：";
  morphemes.appendChild(label);

  (entry.components || []).forEach((component, idx) => {
    const morpheme = component.morpheme;
    if (!morpheme) return;
    const chip = document.createElement("span");
    chip.textContent = morpheme;
    const colorClass = `morph-color-${idx % 5}`;
    if (state.rootMap.has(morpheme)) {
      chip.className = `word-morpheme-link ${colorClass}`;
      chip.addEventListener("click", () => {
        closeWordPopup();
        selectRoot(morpheme);
      });
    } else {
      chip.className = `word-morpheme ${colorClass}`;
    }
    morphemes.appendChild(chip);
  });

  popup.appendChild(title);
  popup.appendChild(audioWrap);
  popup.appendChild(def);
  popup.appendChild(example);
  popup.appendChild(decomp);
  popup.appendChild(morphemes);

  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}

function closeWordPopup() {
  const existing = document.querySelector(".word-popup-overlay");
  if (existing) existing.remove();
}

function buildSimpleDefinition(entry) {
  if (entry.definition) {
    return entry.definition;
  }
  if (entry.meaning) {
    return `This word is about: ${entry.meaning}.`;
  }
  return "This word has a simple meaning that you can learn with the root and example.";
}

function buildSimpleExampleSentence(entry) {
  if (entry.exampleSentence) {
    return entry.exampleSentence;
  }
  return `This is a simple sentence with the word "${entry.word}".`;
}

function initFlash() {
  const pool = state.roots.filter((item) => item.wordCount >= 2).map((item) => item.root);
  state.flash.pool = shuffle(pool);
  state.flash.index = 0;
  state.flash.revealed = false;
  renderFlashCard();
}

function renderFlashCard() {
  clearNode(els.flashCard);
  if (!state.flash.pool.length) {
    els.flashMeta.textContent = "没有可用闪卡。";
    els.flashCard.textContent = "请检查数据文件。";
    return;
  }

  const root = state.flash.pool[state.flash.index];
  const rootData = state.rootMap.get(root);
  if (!rootData) {
    return;
  }

  const masteredCount = Object.values(state.progress.mastered).filter(Boolean).length;
  els.flashMeta.textContent = `第 ${state.flash.index + 1}/${state.flash.pool.length} 张 | 已掌握 ${masteredCount}`;

  const prompt = document.createElement("div");
  prompt.textContent = "请回忆这个词根/词缀的含义和常见单词:";
  els.flashCard.appendChild(prompt);

  const rootText = document.createElement("div");
  rootText.className = "flash-root";
  rootText.textContent = rootData.root;
  els.flashCard.appendChild(rootText);

  if (state.flash.revealed) {
    const gloss = document.createElement("div");
    gloss.textContent = `提示: ${rootData.gloss || "建议通过例词理解"}`;

    const words = document.createElement("div");
    words.textContent = `例词: ${(rootData.sampleWords || []).slice(0, 8).join(", ")}`;

    const sampleEntry = (state.rootToEntries.get(rootData.root) || [])[0];
    const breakdown = document.createElement("div");
    if (sampleEntry) {
      breakdown.textContent = `拆解示例: ${sampleEntry.word} -> ${sampleEntry.decomposition}`;
    }

    els.flashCard.appendChild(gloss);
    els.flashCard.appendChild(words);
    els.flashCard.appendChild(breakdown);
  }

  els.flashReveal.disabled = state.flash.revealed;
  els.flashAgain.disabled = !state.flash.revealed;
  els.flashKnow.disabled = !state.flash.revealed;
}

function advanceFlash(randomJump = false) {
  if (!state.flash.pool.length) {
    return;
  }
  if (randomJump) {
    state.flash.index = Math.floor(Math.random() * state.flash.pool.length);
  } else {
    state.flash.index = (state.flash.index + 1) % state.flash.pool.length;
  }
  state.flash.revealed = false;
  renderFlashCard();
}

function newQuizQuestion() {
  const candidates = state.roots.filter((item) => item.gloss);
  if (candidates.length < 4) {
    els.quizQuestion.textContent = "可用于选择题的数据不足。";
    return;
  }

  const correct = sample(candidates);
  const incorrectRoots = shuffle(
    candidates
      .filter((item) => item.root !== correct.root)
      .slice()
      .map((item) => item.root)
  ).slice(0, 3);
  const options = shuffle([correct.root, ...incorrectRoots]);

  state.quiz.question = {
    prompt: correct.gloss,
    correctRoot: correct.root,
    options,
  };
  renderQuiz();
}

function renderQuiz() {
  const q = state.quiz.question;
  if (!q) {
    return;
  }
  els.quizQuestion.textContent = `哪个词根/词缀最接近这个提示: “${q.prompt}”`;
  els.quizFeedback.textContent = "";
  clearNode(els.quizOptions);
  q.options.forEach((optionRoot) => {
    const button = document.createElement("button");
    button.className = "quiz-option";
    button.dataset.root = optionRoot;
    button.textContent = optionRoot;
    els.quizOptions.appendChild(button);
  });
  renderQuizScore();
}

function answerQuiz(chosenRoot) {
  const q = state.quiz.question;
  if (!q) {
    return;
  }
  const correct = chosenRoot === q.correctRoot;
  state.progress.quizTotal += 1;
  if (correct) {
    state.progress.quizCorrect += 1;
  }
  saveProgress();
  renderMeta();

  const buttons = [...els.quizOptions.querySelectorAll(".quiz-option")];
  buttons.forEach((button) => {
    const root = button.dataset.root;
    button.disabled = true;
    if (root === q.correctRoot) {
      button.classList.add("correct");
    } else if (root === chosenRoot) {
      button.classList.add("wrong");
    }
  });

  const correctData = state.rootMap.get(q.correctRoot);
  const examples = (correctData?.sampleWords || []).slice(0, 4).join(", ");
  els.quizFeedback.textContent = correct
    ? `回答正确。例词: ${examples}`
    : `回答错误。正确答案是 ${q.correctRoot}。例词: ${examples}`;
  renderQuizScore();
}

function renderQuizScore() {
  els.quizScore.textContent = `正确率: ${state.progress.quizCorrect} / ${state.progress.quizTotal}`;
}

function sample(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function highlightComponents(el, targetWord, components) {
  el.textContent = "";
  if (!components || components.length === 0) {
    el.textContent = targetWord;
    return;
  }
  let currentIndex = 0;
  let lowerWord = targetWord.toLowerCase();
  components.forEach((comp, idx) => {
    let m = (comp.morpheme || "").toLowerCase();
    if (!m) return;
    let pos = lowerWord.indexOf(m, currentIndex);
    if (pos !== -1) {
      if (pos > currentIndex) {
        el.appendChild(document.createTextNode(targetWord.slice(currentIndex, pos)));
      }
      const mark = document.createElement("span");
      mark.className = `root-highlight morph-color-${idx % 5}`;
      mark.textContent = targetWord.slice(pos, pos + m.length);
      el.appendChild(mark);
      currentIndex = pos + m.length;
    }
  });
  if (currentIndex < targetWord.length) {
    el.appendChild(document.createTextNode(targetWord.slice(currentIndex)));
  }
}

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { mastered: {}, quizCorrect: 0, quizTotal: 0 };
    }
    const parsed = JSON.parse(raw);
    return {
      mastered: parsed.mastered || {},
      quizCorrect: parsed.quizCorrect || 0,
      quizTotal: parsed.quizTotal || 0,
    };
  } catch (error) {
    return { mastered: {}, quizCorrect: 0, quizTotal: 0 };
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

/* ========== K12 课本单词 ========== */

const K12_DATA = {
  "七下": [
    { unit: 1, word: "fox", meaning: "n. 狐狸" },
    { unit: 1, word: "giraffe", meaning: "n. 长颈鹿" },
    { unit: 1, word: "eagle", meaning: "n. 雕；鹰" },
    { unit: 1, word: "wolf", meaning: "n. (pl. wolves) 狼" },
    { unit: 1, word: "penguin", meaning: "n. 企鹅" },
    { unit: 1, word: "care", meaning: "n. 照顾；护理 v. 关心；在乎" },
    { unit: 1, word: "take care of", meaning: "照顾；处理" },
    { unit: 1, word: "sandwich", meaning: "n. 三明治" },
    { unit: 1, word: "snake", meaning: "n. 蛇" },
    { unit: 1, word: "scary", meaning: "adj. 吓人的；恐怖的" },
    { unit: 1, word: "neck", meaning: "n. 脖子" },
    { unit: 1, word: "guess", meaning: "v. 猜测；估计" },
    { unit: 1, word: "shark", meaning: "n. 鲨鱼" },
    { unit: 1, word: "whale", meaning: "n. 鲸" },
    { unit: 1, word: "huge", meaning: "adj. 巨大的；极多的" },
    { unit: 1, word: "dangerous", meaning: "adj. 危险的；有危害的" },
    { unit: 1, word: "save", meaning: "v. 救；储蓄；保存" },
    { unit: 1, word: "luck", meaning: "n. 幸运；运气" },
    { unit: 1, word: "Thai", meaning: "adj. 泰国的；泰国人的 n. 泰国人；泰语" },
    { unit: 1, word: "trunk", meaning: "n. 象鼻" },
    { unit: 1, word: "pick", meaning: "v. 捡；摘" },
    { unit: 1, word: "pick up", meaning: "拿起；举起" },
    { unit: 1, word: "carry", meaning: "v. 拿；提" },
    { unit: 1, word: "playful", meaning: "adj. 爱嬉戏的；爱玩的" },
    { unit: 1, word: "swimmer", meaning: "n. 游泳者" },
    { unit: 1, word: "one another", meaning: "互相" },
    { unit: 1, word: "look after", meaning: "照顾" },
    { unit: 1, word: "culture", meaning: "n. 文化；文明" },
    { unit: 1, word: "however", meaning: "adv. 然而；不过" },
    { unit: 1, word: "danger", meaning: "n. 危险" },
    { unit: 1, word: "in danger", meaning: "处于危险之中" },
    { unit: 1, word: "forest", meaning: "n. 森林" },
    { unit: 1, word: "cut down", meaning: "砍伐；减少" },
    { unit: 1, word: "too many", meaning: "太多" },
    { unit: 1, word: "kill", meaning: "v. 杀死；弄死" },
    { unit: 1, word: "made of", meaning: "由……制成的" },
    { unit: 1, word: "ivory", meaning: "n. 象牙" },
    { unit: 1, word: "friendly", meaning: "adj. 友好的" },
    { unit: 1, word: "quite", meaning: "adv. 相当；完全" },
    { unit: 1, word: "quite a", meaning: "相当；非常" },
    { unit: 1, word: "not … at all", meaning: "一点也不；完全不" },
    { unit: 1, word: "fur", meaning: "n.（动物浓厚的）软毛" },
    { unit: 1, word: "blind", meaning: "adj. 瞎的；失明的" },
    { unit: 1, word: "hearing", meaning: "n. 听力；听觉" },
    { unit: 2, word: "rule", meaning: "n. 规则；规章" },
    { unit: 2, word: "order", meaning: "n. 秩序；命令 v. 点菜；命令" },
    { unit: 2, word: "follow", meaning: "v. 遵循；跟随" },
    { unit: 2, word: "late for", meaning: "迟到" },
    { unit: 2, word: "arrive", meaning: "v. 到达" },
    { unit: 2, word: "on time", meaning: "准时" },
    { unit: 2, word: "hallway", meaning: "n. 走廊" },
    { unit: 2, word: "uniform", meaning: "n. 校服；制服" },
    { unit: 2, word: "litter", meaning: "v. 乱扔 n. 垃圾" },
    { unit: 2, word: "polite", meaning: "adj. 有礼貌的" },
    { unit: 2, word: "treat", meaning: "v. 对待；招待；治疗 n. 款待" },
    { unit: 2, word: "respect", meaning: "n. & v. 尊敬" },
    { unit: 2, word: "if", meaning: "conj. 如果" },
    { unit: 2, word: "jacket", meaning: "n. 夹克衫；短上衣" },
    { unit: 2, word: "have to", meaning: "不得不" },
    { unit: 2, word: "everything", meaning: "pron. 每件事；一切" },
    { unit: 2, word: "lend", meaning: "v. 借给；借出" },
    { unit: 2, word: "sweet", meaning: "n. 糖果 adj. 甜的" },
    { unit: 2, word: "snack", meaning: "n. 点心；小吃" },
    { unit: 2, word: "of course", meaning: "当然" },
    { unit: 2, word: "mobile", meaning: "adj. 可移动的" },
    { unit: 2, word: "mobile phone", meaning: "手机" },
    { unit: 2, word: "turn off", meaning: "关掉（水、电或煤气）" },
    { unit: 2, word: "queue", meaning: "n. 队" },
    { unit: 2, word: "jump the queue", meaning: "插队" },
    { unit: 2, word: "feed", meaning: "v. 喂养；饲养" },
    { unit: 2, word: "leave", meaning: "v. 离开；留下" },
    { unit: 2, word: "absent", meaning: "adj. 缺席的；不在的" },
    { unit: 2, word: "absent from", meaning: "缺席；不在" },
    { unit: 2, word: "shh", meaning: "interj. 嘘（用以让别人安静下来）" },
    { unit: 2, word: "quietly", meaning: "adv. 轻声地；安静地" },
    { unit: 2, word: "belt", meaning: "n. 安全带；腰带；皮带" },
    { unit: 2, word: "noise", meaning: "n. 声音；噪声" },
    { unit: 2, word: "unhappy", meaning: "adj. 不快乐的" },
    { unit: 2, word: "make sb's/the bed", meaning: "整理床铺；铺床" },
    { unit: 2, word: "either", meaning: "adv. 也（用于否定词组后）" },
    { unit: 2, word: "practise", meaning: "v. 训练；练习" },
    { unit: 2, word: "hang", meaning: "v. 悬挂" },
    { unit: 2, word: "hang out", meaning: "闲逛；常去某处" },
    { unit: 2, word: "weekday", meaning: "n. 工作日" },
    { unit: 2, word: "awful", meaning: "adj. 糟糕的；讨厌的" },
    { unit: 2, word: "become", meaning: "v. 变成；成为" },
    { unit: 2, word: "better", meaning: "adj. 较好的 adv. 较好地" },
    { unit: 2, word: "person", meaning: "n. 人" },
    { unit: 2, word: "focus", meaning: "v. 集中（注意力、精力等）；聚焦" },
    { unit: 2, word: "focus on", meaning: "集中（注意力、精力等）于" },
    { unit: 2, word: "build", meaning: "v. 创建；建造" },
    { unit: 2, word: "spirit", meaning: "n. 精神；情绪" },
    { unit: 2, word: "think about", meaning: "思考；考虑" },
    { unit: 2, word: "relax", meaning: "v. 放松；休息" },
    { unit: 2, word: "advice", meaning: "n. 建议；意见" },
    { unit: 2, word: "understand", meaning: "v. 理解；领会" },
    { unit: 2, word: "untidy", meaning: "adj. 不整洁的" },
    { unit: 3, word: "fit", meaning: "adj. 健康的；健壮的 v. 适合" },
    { unit: 3, word: "baseball", meaning: "n. 棒球（运动）" },
    { unit: 3, word: "glove", meaning: "n.（手指分开的）手套" },
    { unit: 3, word: "mat", meaning: "n.（运动用的）垫子" },
    { unit: 3, word: "rope", meaning: "n. 绳子；粗绳" },
    { unit: 3, word: "jump rope", meaning: "跳绳用的绳子；跳绳（运动）" },
    { unit: 3, word: "racket", meaning: "n.（网球、羽毛球等的）球拍" },
    { unit: 3, word: "hardly", meaning: "adv. 几乎不；几乎没有" },
    { unit: 3, word: "ever", meaning: "adv. 在任何时候；从来；曾经" },
    { unit: 3, word: "hardly ever", meaning: "几乎从不" },
    { unit: 3, word: "once", meaning: "adv. 一次；曾经 conj. 一旦" },
    { unit: 3, word: "twice", meaning: "adv. 两次；两倍" },
    { unit: 3, word: "mine", meaning: "pron. 我的（所有物）" },
    { unit: 3, word: "hers", meaning: "pron. 她的（所有物）" },
    { unit: 3, word: "maybe", meaning: "adv. 也许；大概" },
    { unit: 3, word: "well-used", meaning: "adj. 使用得多的" },
    { unit: 3, word: "practice", meaning: "n. 练习；实践" },
    { unit: 3, word: "perfect", meaning: "adj. 完美的；极好的" },
    { unit: 3, word: "seldom", meaning: "adv. 很少；不常" },
    { unit: 3, word: "badminton", meaning: "n. 羽毛球运动" },
    { unit: 3, word: "double", meaning: "n. 双打 adj. 成双的；两倍的" },
    { unit: 3, word: "sometime", meaning: "adv. 在某个时候" },
    { unit: 3, word: "volleyball", meaning: "n. 排球（运动）" },
    { unit: 3, word: "theirs", meaning: "pron. 他们的，她们的，它们的（所有物）" },
    { unit: 3, word: "jog", meaning: "v. 慢跑" },
    { unit: 3, word: "few", meaning: "adj.（表示否定的）很少的；几乎没有的" },
    { unit: 3, word: "a few", meaning: "少数；几个" },
    { unit: 3, word: "excuse", meaning: "v. 原谅；宽恕" },
    { unit: 3, word: "excuse me", meaning: "劳驾；请原谅" },
    { unit: 3, word: "over there", meaning: "在那边" },
    { unit: 3, word: "just", meaning: "adv. 只是；正好" },
    { unit: 3, word: "T-shirt", meaning: "n. T恤衫" },
    { unit: 3, word: "belong", meaning: "v. 应在（某处）" },
    { unit: 3, word: "belong to", meaning: "属于（某人）" },
    { unit: 3, word: "working", meaning: "adj. 工作的" },
    { unit: 3, word: "working day", meaning: "工作日" },
    { unit: 3, word: "full of", meaning: "有许多；充满" },
    { unit: 3, word: "energy", meaning: "n. 精力；能量" },
    { unit: 3, word: "group", meaning: "n. 组；群" },
    { unit: 3, word: "skateboard", meaning: "n. 滑板" },
    { unit: 3, word: "encourage", meaning: "v. 鼓励；激励" },
    { unit: 3, word: "trick", meaning: "n. 技巧；戏法" },
    { unit: 3, word: "succeed", meaning: "v. 成功；达到目标" },
    { unit: 3, word: "skateboarding", meaning: "n. 滑板运动" },
    { unit: 3, word: "goal", meaning: "n. 目标；目的" },
    { unit: 3, word: "sit-up", meaning: "n. 仰卧起坐" },
    { unit: 3, word: "work out", meaning: "锻炼" },
    { unit: 3, word: "app", meaning: "n. 应用程序" },
    { unit: 3, word: "progress", meaning: "n. 进步；进展" },
    { unit: 3, word: "match", meaning: "n. 比赛；竞赛" },
    { unit: 3, word: "team", meaning: "n. 队；组" },
    { unit: 3, word: "ours", meaning: "pron. 我们的（所有物）" },
    { unit: 3, word: "lose", meaning: "v. 输掉；丢失" },
    { unit: 3, word: "teenager", meaning: "n. 青少年" },
    { unit: 4, word: "watermelon", meaning: "n. 西瓜" },
    { unit: 4, word: "cabbage", meaning: "n. 卷心菜" },
    { unit: 4, word: "mutton", meaning: "n. 羊肉" },
    { unit: 4, word: "cookie", meaning: "n. 曲奇饼" },
    { unit: 4, word: "onion", meaning: "n. 洋葱；葱头" },
    { unit: 4, word: "dumpling", meaning: "n. 饺子" },
    { unit: 4, word: "coffee", meaning: "n. 咖啡" },
    { unit: 4, word: "bean", meaning: "n. 豆" },
    { unit: 4, word: "chip", meaning: "n. 炸薯条" },
    { unit: 4, word: "fish and chips", meaning: "炸鱼薯条" },
    { unit: 4, word: "salad", meaning: "n. 沙拉；色拉" },
    { unit: 4, word: "porridge", meaning: "n. 粥；麦片粥" },
    { unit: 4, word: "waiter", meaning: "n.（男）服务员" },
    { unit: 4, word: "What about ...?", meaning: "……怎么样？" },
    { unit: 4, word: "taste", meaning: "v. 有……味道；尝 n. 味道" },
    { unit: 4, word: "anything", meaning: "pron. 某事物；任何事物" },
    { unit: 4, word: "dish", meaning: "n. 一道菜；盘子" },
    { unit: 4, word: "choice", meaning: "n. 选择" },
    { unit: 4, word: "meal", meaning: "n. 一餐所吃的食物；一餐" },
    { unit: 4, word: "pork", meaning: "n. 猪肉" },
    { unit: 4, word: "strawberry", meaning: "n. 草莓" },
    { unit: 4, word: "menu", meaning: "n. 菜单" },
    { unit: 4, word: "customer", meaning: "n. 顾客" },
    { unit: 4, word: "serve", meaning: "v. 提供；服务" },
    { unit: 4, word: "waitress", meaning: "n. 女服务员" },
    { unit: 4, word: "sir", meaning: "n. 先生" },
    { unit: 4, word: "go with", meaning: "搭配；相配" },
    { unit: 4, word: "instead", meaning: "adv. 反而；代替" },
    { unit: 4, word: "pear", meaning: "n. 梨" },
    { unit: 4, word: "too much", meaning: "太多" },
    { unit: 4, word: "sugar", meaning: "n. 糖" },
    { unit: 4, word: "improve", meaning: "v. 改进；改善" },
    { unit: 4, word: "habit", meaning: "n. 习惯" },
    { unit: 4, word: "fast food", meaning: "快餐" },
    { unit: 4, word: "salt", meaning: "n. 盐" },
    { unit: 4, word: "fat", meaning: "n. 脂肪 adj. 肥胖的" },
    { unit: 4, word: "put on", meaning: "增加；穿上" },
    { unit: 4, word: "weight", meaning: "n. 体重；重量" },
    { unit: 4, word: "hamburger", meaning: "n. 汉堡包" },
    { unit: 4, word: "cause", meaning: "v. 造成；导致" },
    { unit: 4, word: "heart", meaning: "n. 心脏；中心" },
    { unit: 4, word: "balanced", meaning: "adj. 均衡的；平衡的" },
    { unit: 4, word: "too … to", meaning: "太……以至于不能" },
    { unit: 4, word: "sleepy", meaning: "adj. 困倦的；想睡的" },
    { unit: 4, word: "after all", meaning: "毕竟；终归" },
    { unit: 4, word: "away", meaning: "adv. 离开；在别处" },
    { unit: 4, word: "poor", meaning: "adj. 不好的；贫穷的；可怜的" },
    { unit: 4, word: "result", meaning: "n. 后果；结果" },
    { unit: 4, word: "article", meaning: "n. 文章；冠词" },
    { unit: 4, word: "common", meaning: "adj. 共同的；普遍的" },
    { unit: 4, word: "among", meaning: "prep. 在……中；……之一" },
    { unit: 4, word: "soft", meaning: "adj. 柔和的；柔软的" },
    { unit: 4, word: "soft drink", meaning: "软饮料（不含酒精）" },
    { unit: 4, word: "enough", meaning: "adj. 足够的；充足的 adv. 足够地" },
    { unit: 4, word: "thirsty", meaning: "adj. 渴的" },
    { unit: 5, word: "right now", meaning: "现在；立刻" },
    { unit: 5, word: "ride", meaning: "v. 骑 n. 旅程" },
    { unit: 5, word: "moment", meaning: "n. 某个时刻；片刻；瞬间" },
    { unit: 5, word: "at the moment", meaning: "现在；此刻" },
    { unit: 5, word: "work on", meaning: "做；从事" },
    { unit: 5, word: "dragon", meaning: "n. 龙" },
    { unit: 5, word: "festival", meaning: "n. 节日" },
    { unit: 5, word: "hold", meaning: "v. 拿着；抓住" },
    { unit: 5, word: "hold on", meaning: "别挂断电话；等一等" },
    { unit: 5, word: "voice", meaning: "n. 嗓音；声音" },
    { unit: 5, word: "race", meaning: "n. 比赛；竞赛" },
    { unit: 5, word: "darling", meaning: "n. 亲爱的；宝贝" },
    { unit: 5, word: "somebody", meaning: "pron. 某人；有人" },
    { unit: 5, word: "could", meaning: "modal v. 能；可以" },
    { unit: 5, word: "message", meaning: "n. 消息；信息" },
    { unit: 5, word: "take a message", meaning: "捎个口信" },
    { unit: 5, word: "leave a message", meaning: "留个口信" },
    { unit: 5, word: "call back", meaning: "回电话" },
    { unit: 5, word: "kick", meaning: "v. 踢；踹" },
    { unit: 5, word: "wow", meaning: "interj. 哇；呀" },
    { unit: 5, word: "online", meaning: "adj. 在线的" },
    { unit: 5, word: "shuttlecock", meaning: "n. 羽毛球" },
    { unit: 5, word: "sight", meaning: "n. 名胜；风景；视力" },
    { unit: 5, word: "exam", meaning: "n. 考试" },
    { unit: 5, word: "hope", meaning: "v. & n. 希望" },
    { unit: 5, word: "forward", meaning: "adv. 向前" },
    { unit: 5, word: "look forward to", meaning: "盼望" },
    { unit: 5, word: "skate", meaning: "v. 滑冰" },
    { unit: 5, word: "happen", meaning: "v. 发生" },
    { unit: 5, word: "zone", meaning: "n. 地区；地带；区域" },
    { unit: 5, word: "time zone", meaning: "时区" },
    { unit: 5, word: "around the world", meaning: "世界各地" },
    { unit: 5, word: "rush", meaning: "v. & n. 冲；奔" },
    { unit: 5, word: "in a hurry", meaning: "匆忙" },
    { unit: 5, word: "shine", meaning: "v. 发光；照耀 n. 光亮" },
    { unit: 5, word: "brightly", meaning: "adv. 明亮地" },
    { unit: 5, word: "colourful", meaning: "adj. 色彩鲜艳的" },
    { unit: 5, word: "slowly", meaning: "adv. 缓慢地" },
    { unit: 5, word: "such", meaning: "adj. 这样的；那样的 pron. 这样(那样)的人或事物" },
    { unit: 5, word: "such as", meaning: "例如" },
    { unit: 5, word: "painting", meaning: "n. 绘画作品；绘画；油画" },
    { unit: 5, word: "market", meaning: "n. 市场" },
    { unit: 5, word: "side", meaning: "n. 边；侧" },
    { unit: 5, word: "side by side", meaning: "并排；并肩地" },
    { unit: 5, word: "subway", meaning: "n. 地铁" },
    { unit: 5, word: "bright", meaning: "adj. 鲜艳的；明亮的；聪明的" },
    { unit: 5, word: "drop", meaning: "v. 把……送至；落下 n. 滴；下降" },
    { unit: 5, word: "drop off", meaning: "（开车）把某人送到某处" },
    { unit: 5, word: "passenger", meaning: "n. 乘客" },
    { unit: 5, word: "central", meaning: "adj. 中心的；中央的" },
    { unit: 5, word: "explain", meaning: "v. 解释；说明" },
    { unit: 5, word: "take part in", meaning: "参加" },
    { unit: 5, word: "tour", meaning: "n. & v. 旅行；旅游" },
    { unit: 5, word: "sunshine", meaning: "n. 阳光" },
    { unit: 5, word: "drive", meaning: "v. 开车；驾驶" },
    { unit: 5, word: "rush hour", meaning: "交通高峰期" },
    { unit: 6, word: "rain or shine", meaning: "不论是雨或是晴；不管发生什么事" },
    { unit: 6, word: "affect", meaning: "v. 影响" },
    { unit: 6, word: "dry", meaning: "adj. 干的；干旱的" },
    { unit: 6, word: "lightning", meaning: "n. 闪电" },
    { unit: 6, word: "stormy", meaning: "adj. 有暴风雨（或暴风雪）的" },
    { unit: 6, word: "north", meaning: "n. 北部；北；北方" },
    { unit: 6, word: "west", meaning: "n. 西部；西；西方" },
    { unit: 6, word: "south", meaning: "n. 南部；南；南方" },
    { unit: 6, word: "east", meaning: "n. 东部；东；东方" },
    { unit: 6, word: "stay in", meaning: "待在家里；没有外出" },
    { unit: 6, word: "lucky", meaning: "adj. 运气好的；带来好运的" },
    { unit: 6, word: "lucky you", meaning: "你真幸运" },
    { unit: 6, word: "sunbathe", meaning: "v. 沐日光浴；晒太阳" },
    { unit: 6, word: "some day", meaning: "将来；有朝一日" },
    { unit: 6, word: "temperature", meaning: "n. 温度" },
    { unit: 6, word: "snowman", meaning: "n. 雪人" },
    { unit: 6, word: "heavily", meaning: "adv. 大量地；沉重地" },
    { unit: 6, word: "snowy", meaning: "adj. 下雪的；雪白的" },
    { unit: 6, word: "beach volleyball", meaning: "沙滩排球" },
    { unit: 6, word: "high", meaning: "adv. & adj. 高" },
    { unit: 6, word: "freezing", meaning: "adj. 极冷的；冰冻的" },
    { unit: 6, word: "tourist", meaning: "n. 旅行者；观光客" },
    { unit: 6, word: "mount", meaning: "n. 山；山峰" },
    { unit: 6, word: "cloud", meaning: "n. 云；云彩" },
    { unit: 6, word: "feel like", meaning: "感觉像" },
    { unit: 6, word: "magical", meaning: "adj. 魔法的；神奇的" },
    { unit: 6, word: "rock", meaning: "n. 岩石" },
    { unit: 6, word: "rest", meaning: "n. 休息；剩余部分" },
    { unit: 6, word: "area", meaning: "n. 场地；地区" },
    { unit: 6, word: "rest area", meaning: "休息区" },
    { unit: 6, word: "make progress", meaning: "取得进展" },
    { unit: 6, word: "although", meaning: "conj. 虽然；尽管" },
    { unit: 6, word: "still", meaning: "adv. 还；仍然" },
    { unit: 6, word: "in high spirits", meaning: "情绪高涨；兴高采烈" },
    { unit: 6, word: "experience", meaning: "n. 经历；经验 v. 经历" },
    { unit: 6, word: "through", meaning: "prep. 穿过；凭借" },
    { unit: 6, word: "glad", meaning: "adj. 高兴的" },
    { unit: 6, word: "peak", meaning: "n. 山顶；顶点" },
    { unit: 6, word: "grey", meaning: "adj. 灰色的" },
    { unit: 6, word: "because of", meaning: "因为" },
    { unit: 6, word: "fog", meaning: "n. 雾" },
    { unit: 6, word: "ground", meaning: "n. 地面" },
    { unit: 6, word: "wet", meaning: "adj. 湿的" },
    { unit: 6, word: "tiring", meaning: "adj. 令人疲倦的；累人的" },
    { unit: 6, word: "seem", meaning: "v. 似乎；好像" },
    { unit: 6, word: "sunlight", meaning: "n. 阳光；日光" },
    { unit: 6, word: "at the top", meaning: "在顶部；在顶端" },
    { unit: 6, word: "thought", meaning: "n. 想法" },
    { unit: 6, word: "mountain", meaning: "n. 山；高山" },
    { unit: 6, word: "at the start", meaning: "开始；起初" },
    { unit: 6, word: "end", meaning: "n. 末尾；结束" },
    { unit: 6, word: "at the end", meaning: "最后；在末尾" },
    { unit: 6, word: "storm", meaning: "n. 暴风雨；暴风雪" },
    { unit: 6, word: "pour", meaning: "v. 倾倒；倒出" },
    { unit: 6, word: "wind", meaning: "n. 风" },
    { unit: 6, word: "shout", meaning: "v. & n. 喊叫；呼唤" },
    { unit: 6, word: "run after", meaning: "追逐" },
    { unit: 7, word: "meet up", meaning: "碰头；相聚" },
    { unit: 7, word: "museum", meaning: "n. 博物馆" },
    { unit: 7, word: "exhibition", meaning: "n. 展览" },
    { unit: 7, word: "direction", meaning: "n. 方向" },
    { unit: 7, word: "trip", meaning: "n. 旅行" },
    { unit: 7, word: "wastewater", meaning: "n. 废水" },
    { unit: 7, word: "plant", meaning: "n. 工厂" },
    { unit: 7, word: "into", meaning: "prep. 到……里面；进入" },
    { unit: 7, word: "remove", meaning: "v. 移开；拿走" },
    { unit: 7, word: "piece", meaning: "n. 片；块" },
    { unit: 7, word: "waste", meaning: "n. 废弃物 v. 浪费" },
    { unit: 7, word: "machine", meaning: "n. 机器" },
    { unit: 7, word: "germ", meaning: "n. 微生物；细菌" },
    { unit: 7, word: "step", meaning: "n. 步骤；脚步" },
    { unit: 7, word: "used to", meaning: "过去常常（做）" },
    { unit: 7, word: "realize", meaning: "v. 认识到；实现" },
    { unit: 7, word: "inside", meaning: "prep. 在……里面 adv. 在里面" },
    { unit: 7, word: "go on a trip", meaning: "去旅行" },
    { unit: 7, word: "process", meaning: "n. 过程" },
    { unit: 7, word: "theatre", meaning: "n. 戏院；剧场；电影院" },
    { unit: 7, word: "factory", meaning: "n. 工厂" },
    { unit: 7, word: "terrible", meaning: "adj. 糟糕的" },
    { unit: 7, word: "actor", meaning: "n. 演员" },
    { unit: 7, word: "gun", meaning: "n. 枪" },
    { unit: 7, word: "try on", meaning: "试穿" },
    { unit: 7, word: "along", meaning: "prep. 沿着；顺着" },
    { unit: 7, word: "road", meaning: "n. 道路" },
    { unit: 7, word: "create", meaning: "v. 创造" },
    { unit: 7, word: "record", meaning: "v. 记录 n. 记录" },
    { unit: 7, word: "skill", meaning: "n. 技能" },
    { unit: 7, word: "write down", meaning: "写下；记下" },
    { unit: 7, word: "explore", meaning: "v. 探索" },
    { unit: 7, word: "tent", meaning: "n. 帐篷" },
    { unit: 7, word: "cucumber", meaning: "n. 黄瓜" },
    { unit: 7, word: "from … to …", meaning: "从……到……" },
    { unit: 7, word: "straight", meaning: "adv. 直接；立即 adj. 直的" },
    { unit: 7, word: "fill", meaning: "v. 装满；盛满" },
    { unit: 7, word: "basket", meaning: "n. 篮子；筐" },
    { unit: 7, word: "teach", meaning: "v. 教" },
    { unit: 7, word: "branch", meaning: "n. 分支；树枝" },
    { unit: 7, word: "leaf", meaning: "n. 叶；叶子" },
    { unit: 7, word: "finally", meaning: "adv. 终于" },
    { unit: 7, word: "think of", meaning: "考虑；想起" },
    { unit: 7, word: "grain", meaning: "n. 谷物；谷粒" },
    { unit: 7, word: "fresh", meaning: "adj. 新鲜的" },
    { unit: 7, word: "certainly", meaning: "adv. 肯定地" },
    { unit: 7, word: "diary", meaning: "n. 日记；日记本" },
    { unit: 7, word: "entry", meaning: "n.（日记的）一则；入口" },
    { unit: 7, word: "agree", meaning: "v. 赞成；同意" },
    { unit: 7, word: "agree with", meaning: "赞成；同意" },
    { unit: 8, word: "upon", meaning: "prep. 在……上" },
    { unit: 8, word: "once upon a time", meaning: "从前；很久以前" },
    { unit: 8, word: "bite", meaning: "v. 咬；咬伤" },
    { unit: 8, word: "bite through", meaning: "咬穿" },
    { unit: 8, word: "net", meaning: "n. 网；网状物" },
    { unit: 8, word: "hunter", meaning: "n. 猎人；搜寻者" },
    { unit: 8, word: "promise", meaning: "v. 承诺；保证 n. 承诺；诺言" },
    { unit: 8, word: "long ago", meaning: "很久以前" },
    { unit: 8, word: "war", meaning: "n. 战争" },
    { unit: 8, word: "neighbour", meaning: "n. 邻居" },
    { unit: 8, word: "wise", meaning: "adj. 明智的；高明的" },
    { unit: 8, word: "emperor", meaning: "n. 皇帝" },
    { unit: 8, word: "lie", meaning: "v. 撒谎 n. 谎言" },
    { unit: 8, word: "pretend", meaning: "v. 假装；伪装" },
    { unit: 8, word: "official", meaning: "n. 官员；高级职员" },
    { unit: 8, word: "silly", meaning: "adj. 愚蠢的；傻的" },
    { unit: 8, word: "decide", meaning: "v. 决定" },
    { unit: 8, word: "praise", meaning: "v. & n. 赞美；表扬" },
    { unit: 8, word: "afraid", meaning: "adj. 害怕的；担心的" },
    { unit: 8, word: "suddenly", meaning: "adv. 突然地；出乎意料地" },
    { unit: 8, word: "at first", meaning: "起初；最初" },
    { unit: 8, word: "truth", meaning: "n. 真相；事实" },
    { unit: 8, word: "tell the truth", meaning: "说实话" },
    { unit: 8, word: "make money", meaning: "赚钱" },
    { unit: 8, word: "true", meaning: "adj. 符合事实的；真正的" },
    { unit: 8, word: "hate", meaning: "v. 不喜欢；厌恶；讨厌" },
    { unit: 8, word: "get out", meaning: "逃脱；离开" },
    { unit: 8, word: "king", meaning: "n. 君主；国王" },
    { unit: 8, word: "artist", meaning: "n. 美术家；艺术家" },
    { unit: 8, word: "quickly", meaning: "adv. 快速地；很快" },
    { unit: 8, word: "smile", meaning: "v. 微笑 n. 微笑；笑容" },
    { unit: 8, word: "all over", meaning: "到处；遍及" },
    { unit: 8, word: "ugly", meaning: "adj. 丑陋的；难看的" },
    { unit: 8, word: "duckling", meaning: "n. 小鸭子" },
    { unit: 8, word: "real", meaning: "adj. 真的；真正的" },
    { unit: 8, word: "laugh at", meaning: "嘲笑" },
    { unit: 8, word: "go away", meaning: "走开" },
    { unit: 8, word: "search", meaning: "v. 寻找；搜寻" },
    { unit: 8, word: "search for", meaning: "寻找" },
    { unit: 8, word: "hen", meaning: "n. 母鸡" },
    { unit: 8, word: "hopefully", meaning: "adv. 有希望地" },
    { unit: 8, word: "purr", meaning: "v.（猫愉快时）发出呜呜声" },
    { unit: 8, word: "lay", meaning: "v. 下（蛋）；放置；搁" },
    { unit: 8, word: "swan", meaning: "n. 天鹅" },
    { unit: 8, word: "feather", meaning: "n. 羽毛" },
    { unit: 8, word: "to sb's surprise", meaning: "出乎某人的意料" },
    { unit: 8, word: "size", meaning: "n. 大小；尺寸" },
    { unit: 8, word: "believe", meaning: "v. 相信；认为" },
    { unit: 8, word: "only if", meaning: "只有" },
    { unit: 8, word: "fisherman", meaning: "n. 渔夫" },
    { unit: 8, word: "fishing", meaning: "n. 钓鱼；捕鱼" },
    { unit: 8, word: "come out", meaning: "出现；盛开" },
    { unit: 8, word: "genie", meaning: "n. 妖怪；鬼" },
    { unit: 8, word: "die", meaning: "v. 死亡；消失" },
    { unit: 8, word: "make a promise", meaning: "许下诺言" },
    { unit: 8, word: "someone", meaning: "pron. 某人；有人" },
    { unit: 8, word: "set", meaning: "v. 使处于某种状况；使开始" },
    { unit: 8, word: "set … free", meaning: "释放" },
    { unit: 8, word: "rich", meaning: "adj. 富有的；富含……的" },
    { unit: 8, word: "powerful", meaning: "adj. 强大的；有影响力的" },
    { unit: 8, word: "anyone", meaning: "pron. 任何人；某个人" },
    { unit: 8, word: "instead of", meaning: "而不是；代替" },
    { unit: 8, word: "succeed in doing sth", meaning: "成功做成某事" },
    { unit: 8, word: "himself", meaning: "pron. 他自己；他本人" },
    { unit: 8, word: "in the end", meaning: "最后；终究" },
  ],
  "八上": [
    { unit: 1, word: "ancient", meaning: "adj. 古代的；古老的" },
    { unit: 1, word: "camp", meaning: "n. 度假营；营地 v. 露营；宿营" },
    { unit: 1, word: "landscape", meaning: "n. 风景；景色" },
    { unit: 1, word: "strange", meaning: "adj. 奇怪的；陌生的" },
    { unit: 1, word: "vacation", meaning: "n. 假期；度假" },
    { unit: 1, word: "fantastic", meaning: "adj. 极好的；吸引人的" },
    { unit: 1, word: "town", meaning: "n. 镇；商业区" },
    { unit: 1, word: "breath", meaning: "n. 呼吸的空气；一口气" },
    { unit: 1, word: "take sb's breath away", meaning: "令人惊叹；让人叹绝" },
    { unit: 1, word: "especially", meaning: "adv. 尤其；特别" },
    { unit: 1, word: "steamed", meaning: "chicken soup 汽锅鸡" },
    { unit: 1, word: "anywhere", meaning: "adv. & pron. 在任何地方；随便哪个地方" },
    { unit: 1, word: "nothing", meaning: "pron. 没有事；没有任何东西" },
    { unit: 1, word: "guide", meaning: "n. 导游；指南；手册 v. 给某人领路；指导" },
    { unit: 1, word: "scenery", meaning: "n. 风景；景色" },
    { unit: 1, word: "silk", meaning: "n. 丝绸；（蚕）丝" },
    { unit: 1, word: "scarf", meaning: "n. 围巾；披巾" },
    { unit: 1, word: "ready", meaning: "adj. 准备好的；现成的 adv. 已做完；已完成" },
    { unit: 1, word: "ready to do sth", meaning: "马上要（做某事）；愿意做（某事）" },
    { unit: 1, word: "somewhere", meaning: "adv. 在某处；到某处 pron. 某处；某个地方" },
    { unit: 1, word: "myself", meaning: "pron. 我自己" },
    { unit: 1, word: "nothing but", meaning: "只有；只是" },
    { unit: 1, word: "hotel", meaning: "n. 旅馆；旅社" },
    { unit: 1, word: "comfortable", meaning: "adj. 使人舒服的；舒适的" },
    { unit: 1, word: "bored", meaning: "adj. 厌倦的；烦闷的" },
    { unit: 1, word: "sky", meaning: "n. 天；天空" },
    { unit: 1, word: "towards", meaning: "prep. 向；朝" },
    { unit: 1, word: "rainbow", meaning: "n. 虹；彩虹" },
    { unit: 1, word: "square", meaning: "n. 广场；正方形 adj. 正方形的；平方的" },
    { unit: 1, word: "during", meaning: "prep. 在……期间" },
    { unit: 1, word: "victory", meaning: "n. 胜利；成功" },
    { unit: 1, word: "Russian", meaning: "adj. 俄罗斯的；俄罗斯人的 n. 俄罗斯人；俄语" },
    { unit: 1, word: "fight", meaning: "n. 战斗；搏斗；斗争 v. 打仗；打架" },
    { unit: 1, word: "against", meaning: "prep. 反对；与……相反；紧靠" },
    { unit: 1, word: "fight against sb", meaning: "sth 与……作战；与……作斗争" },
    { unit: 1, word: "artwork", meaning: "n. 艺术作品；插图" },
    { unit: 1, word: "thousands of", meaning: "数以千计的；成千上万的" },
    { unit: 1, word: "tear", meaning: "n. 眼泪；泪水" },
    { unit: 1, word: "remind", meaning: "v. 提醒；使想起" },
    { unit: 1, word: "peace", meaning: "n. 和平；太平" },
    { unit: 1, word: "easily", meaning: "adv. 容易地；轻易地" },
    { unit: 1, word: "forget", meaning: "v. 忘记；遗忘" },
    { unit: 1, word: "noon", meaning: "n. 正午；中午" },
    { unit: 1, word: "sick", meaning: "adj. 恶心的；生病的" },
    { unit: 1, word: "metro", meaning: "n. 地下铁道系统" },
    { unit: 1, word: "station", meaning: "n. 车站；所；局" },
    { unit: 1, word: "palace", meaning: "n. 王宫；宫殿" },
    { unit: 1, word: "accordion", meaning: "n. 手风琴" },
    { unit: 1, word: "get together", meaning: "聚会；相聚" },
    { unit: 1, word: "in the sun", meaning: "在阳光下" },
    { unit: 1, word: "tower", meaning: "n. 塔；塔楼" },
    { unit: 1, word: "might", meaning: "modal v. 可能；可以" },
    { unit: 1, word: "budget", meaning: "n. 预算 v. 把……编入预算；精打细算" },
    { unit: 1, word: "passport", meaning: "n. 护照" },
    { unit: 1, word: "forgetful", meaning: "adj. 健忘的；好忘事的" },
    { unit: 1, word: "faraway", meaning: "adj. 远方的；遥远的" },
    { unit: 1, word: "regular", meaning: "adj. 平常的；有规律的" },
    { unit: 1, word: "countryside", meaning: "n. 乡村；农村" },
    { unit: 1, word: "turn around", meaning: "转身；翻转" },
    { unit: 1, word: "surprised", meaning: "adj. 惊奇的；惊讶的" },
    { unit: 1, word: "deer", meaning: "n. 鹿" },
    { unit: 1, word: "probably", meaning: "adv. 很可能；大概" },
    { unit: 1, word: "look for", meaning: "寻找" },
    { unit: 2, word: "pack", meaning: "v. 打包；收拾" },
    { unit: 2, word: "pack up", meaning: "打包" },
    { unit: 2, word: "bathroom", meaning: "n. 浴室；洗手间" },
    { unit: 2, word: "sort", meaning: "v. 把……分类；整理 n. 种类" },
    { unit: 2, word: "bedroom", meaning: "n. 卧室" },
    { unit: 2, word: "balcony", meaning: "n. 阳台" },
    { unit: 2, word: "hang up", meaning: "挂起；挂断电话" },
    { unit: 2, word: "invite", meaning: "v. 邀请" },
    { unit: 2, word: "living room", meaning: "客厅" },
    { unit: 2, word: "arrival", meaning: "n. 到达" },
    { unit: 2, word: "yet", meaning: "adv. 还 conj. 但是" },
    { unit: 2, word: "add", meaning: "v. 添加；加" },
    { unit: 2, word: "add sth to sth", meaning: "把……加入……" },
    { unit: 2, word: "go shopping", meaning: "去购物" },
    { unit: 2, word: "biscuit", meaning: "n. 饼干" },
    { unit: 2, word: "borrow", meaning: "v. 借" },
    { unit: 2, word: "plan", meaning: "v. 策划；打算 n. 计划；方案" },
    { unit: 2, word: "treasure", meaning: "n. 宝物；财富 v. 珍视" },
    { unit: 2, word: "hunt", meaning: "n. 搜寻；狩猎 v. 搜寻；打猎" },
    { unit: 2, word: "treasure hunt", meaning: "寻宝游戏" },
    { unit: 2, word: "lift", meaning: "n. 搭便车；电梯 v. 举起；抬起" },
    { unit: 2, word: "give sb a lift", meaning: "开车顺便送某人" },
    { unit: 2, word: "until", meaning: "prep. 到……时；直到……为止" },
    { unit: 2, word: "be careful with", meaning: "注意；当心" },
    { unit: 2, word: "movie", meaning: "n. 电影" },
    { unit: 2, word: "the movies", meaning: "电影院；电影产业" },
    { unit: 2, word: "dead", meaning: "adj. 不运行的；死的" },
    { unit: 2, word: "note", meaning: "n. 笔记；记录；便条 v. 注意；指出" },
    { unit: 2, word: "take notes", meaning: "做笔记" },
    { unit: 2, word: "clean up", meaning: "清扫" },
    { unit: 2, word: "community", meaning: "n. 社区；社团" },
    { unit: 2, word: "rubbish", meaning: "n. 垃圾" },
    { unit: 2, word: "almost", meaning: "adv. 差不多；几乎" },
    { unit: 2, word: "journey", meaning: "n. 旅行；历程 v. 旅行" },
    { unit: 2, word: "pull", meaning: "v. & n. 拉；拖；拽" },
    { unit: 2, word: "luggage", meaning: "n. 行李" },
    { unit: 2, word: "ah", meaning: "interj. 啊" },
    { unit: 2, word: "share sth with sb", meaning: "把……与……分享" },
    { unit: 2, word: "mm", meaning: "interj. 嗯" },
    { unit: 2, word: "familiar", meaning: "adj. 熟悉的" },
    { unit: 2, word: "joke", meaning: "n. 笑话 v. 开玩笑" },
    { unit: 2, word: "several", meaning: "pron. 几个；一些" },
    { unit: 2, word: "nod", meaning: "v. & n. 点头" },
    { unit: 2, word: "writer", meaning: "n. 作者" },
    { unit: 2, word: "text", meaning: "n. 正文；文本 v. 发短信" },
    { unit: 2, word: "describe", meaning: "v. 描述；形容" },
    { unit: 2, word: "wherever", meaning: "adv. & conj. 无论去哪里" },
    { unit: 2, word: "matter", meaning: "v. 要紧 n. 问题" },
    { unit: 2, word: "no matter", meaning: "不论；不要紧" },
    { unit: 2, word: "perhaps", meaning: "adv. 也许；可能" },
    { unit: 2, word: "plate", meaning: "n. 盘子；碟子" },
    { unit: 2, word: "freshly", meaning: "adv. 刚刚" },
    { unit: 2, word: "smell", meaning: "v. 发臭；闻到 n. 气味" },
    { unit: 2, word: "joy", meaning: "n. 喜悦；乐趣" },
    { unit: 2, word: "apartment", meaning: "n. 房间；公寓套房" },
    { unit: 2, word: "block", meaning: "n. 大楼；街区 v. 阻挡" },
    { unit: 2, word: "decorate", meaning: "v. 装饰；装潢" },
    { unit: 2, word: "cover", meaning: "v. 遮盖；包括 n. 遮盖物；封皮" },
    { unit: 2, word: "poster", meaning: "n. 海报" },
    { unit: 2, word: "scissors", meaning: "n. 剪刀" },
    { unit: 2, word: "glue", meaning: "n. 胶水 v. 粘贴" },
    { unit: 2, word: "paper-cut", meaning: "n. 剪纸" },
    { unit: 3, word: "compare", meaning: "v. 比较；对比" },
    { unit: 3, word: "shy", meaning: "adj. 害羞的" },
    { unit: 3, word: "lazy", meaning: "adj. 懒惰的；懒洋洋的" },
    { unit: 3, word: "loud", meaning: "adv. 响亮地 adj. 大声的" },
    { unit: 3, word: "outgoing", meaning: "adj. 外向的" },
    { unit: 3, word: "hard-working", meaning: "adj. 勤奋的" },
    { unit: 3, word: "perform", meaning: "v. 表演；执行" },
    { unit: 3, word: "alone", meaning: "adv. & adj. 独自；单独" },
    { unit: 3, word: "solve", meaning: "v. 解决；解答" },
    { unit: 3, word: "flute", meaning: "n. 长笛" },
    { unit: 3, word: "congratulation", meaning: "n. 祝贺；恭喜" },
    { unit: 3, word: "Congratulations (on ...) !", meaning: "（对……表示）祝贺！" },
    { unit: 3, word: "prize", meaning: "n. 奖；奖励" },
    { unit: 3, word: "attend", meaning: "v. 参加；出席" },
    { unit: 3, word: "as … as …", meaning: "像……一样……" },
    { unit: 3, word: "besides", meaning: "prep. 除……之外（还） adv. 而且" },
    { unit: 3, word: "spare", meaning: "adj. 空闲的；备用的 v. 抽出" },
    { unit: 3, word: "spare time", meaning: "空闲时间" },
    { unit: 3, word: "pleasure", meaning: "n. 乐事；愉快；荣幸" },
    { unit: 3, word: "have sth in common", meaning: "有共同之处" },
    { unit: 3, word: "appearance", meaning: "n. 外表；露面" },
    { unit: 3, word: "personality", meaning: "n. 性格；品质" },
    { unit: 3, word: "serious", meaning: "adj. 严肃的；严重的" },
    { unit: 3, word: "strength", meaning: "n. 优势；力量" },
    { unit: 3, word: "slim", meaning: "adj. 苗条的；薄的" },
    { unit: 3, word: "fact", meaning: "n. 事实；现实" },
    { unit: 3, word: "population", meaning: "n. 人口" },
    { unit: 3, word: "average", meaning: "adj. 平均的；平常的 n. 平均数" },
    { unit: 3, word: "rainfall", meaning: "n. 降雨量" },
    { unit: 3, word: "pleasant", meaning: "adj. 宜人的；友好的" },
    { unit: 3, word: "difference", meaning: "n. 差异" },
    { unit: 3, word: "alike", meaning: "adj. 相像的 adv. 相似地" },
    { unit: 3, word: "mirror", meaning: "n. 镜子" },
    { unit: 3, word: "interest", meaning: "n. 业余爱好；兴趣 v. 使感兴趣" },
    { unit: 3, word: "novel", meaning: "n. 小说" },
    { unit: 3, word: "sense", meaning: "n. 理解力；感觉 v. 意识到" },
    { unit: 3, word: "humour", meaning: "n. 幽默；幽默感" },
    { unit: 3, word: "thanks to", meaning: "归功于；由于；因为" },
    { unit: 3, word: "opinion", meaning: "n. 看法；意见" },
    { unit: 3, word: "make a mistake", meaning: "犯错误" },
    { unit: 3, word: "less", meaning: "adj. 较少的 adv. 较少地 pron. 较少" },
    { unit: 3, word: "straightforward", meaning: "adj. 坦率的；简单的" },
    { unit: 3, word: "honest", meaning: "adj. 坦诚的；诚实的" },
    { unit: 3, word: "direct", meaning: "adj. 率直的；直接的" },
    { unit: 3, word: "similarity", meaning: "n. 相似之处" },
    { unit: 3, word: "friendship", meaning: "n. 友谊；友情" },
    { unit: 3, word: "metre", meaning: "n. 米" },
    { unit: 3, word: "prince", meaning: "n. 王子" },
    { unit: 3, word: "character", meaning: "n. 人物；个性" },
    { unit: 3, word: "pauper", meaning: "n. 贫民；乞丐" },
    { unit: 3, word: "exchange", meaning: "v. & n. 交换" },
    { unit: 3, word: "accident", meaning: "n. 意外；（交通）事故" },
    { unit: 3, word: "by accident", meaning: "偶然；意外地" },
    { unit: 3, word: "expect", meaning: "v. 预料；期待" },
    { unit: 3, word: "silver", meaning: "adj. 银色的 n. 银" },
    { unit: 3, word: "lining", meaning: "n. 内衬" },
    { unit: 3, word: "silver lining", meaning: "一线光明" },
    { unit: 3, word: "situation", meaning: "n. 情况；状况" },
    { unit: 3, word: "care about", meaning: "关心；担心" },
    { unit: 3, word: "reach", meaning: "v. 伸手；到达" },
    { unit: 3, word: "reach for", meaning: "伸手触碰" },
    { unit: 3, word: "touch", meaning: "v. 触动；触碰" },
    { unit: 3, word: "lend (sb) a hand", meaning: "帮助（某人）" },
    { unit: 4, word: "moss", meaning: "n. 苔藓" },
    { unit: 4, word: "redwood", meaning: "n. 红杉；红木" },
    { unit: 4, word: "cheetah", meaning: "n. 猎豹" },
    { unit: 4, word: "folding", meaning: "adj. 折叠式的；可折叠的" },
    { unit: 4, word: "folding fan", meaning: "折扇" },
    { unit: 4, word: "bamboo", meaning: "n. 竹；竹子" },
    { unit: 4, word: "yeah", meaning: "interj. 是的；对" },
    { unit: 4, word: "popular", meaning: "adj. 广受欢迎的；流行的" },
    { unit: 4, word: "goodness", meaning: "n. 美德；营养" },
    { unit: 4, word: "tool", meaning: "n. 工具；手段" },
    { unit: 4, word: "actually", meaning: "adv. 实际上；居然" },
    { unit: 4, word: "shoot", meaning: "n. 幼苗；嫩芽 v. 开（枪）；射击" },
    { unit: 4, word: "appear", meaning: "v. 出现；看来好像" },
    { unit: 4, word: "feel free (to do sth)", meaning: "可以随便做某事" },
    { unit: 4, word: "land", meaning: "n. 陆地；土地 v. 降落；着陆" },
    { unit: 4, word: "African", meaning: "adj. 非洲的；非洲人的 n. 非洲人" },
    { unit: 4, word: "rose", meaning: "n. 玫瑰；蔷薇" },
    { unit: 4, word: "peony", meaning: "n. 牡丹；芍药" },
    { unit: 4, word: "lotus", meaning: "n. 莲花" },
    { unit: 4, word: "butterfly", meaning: "n. 蝴蝶" },
    { unit: 4, word: "wing", meaning: "n. 翅膀；翼" },
    { unit: 4, word: "frog", meaning: "n. 蛙；青蛙" },
    { unit: 4, word: "up to", meaning: "接近；直到" },
    { unit: 4, word: "weigh", meaning: "v. 有……重；称重量" },
    { unit: 4, word: "ginkgo", meaning: "n. 银杏" },
    { unit: 4, word: "believe", meaning: "v. 相信；认为有可能" },
    { unit: 4, word: "province", meaning: "n. 省份" },
    { unit: 4, word: "take a walk", meaning: "散步" },
    { unit: 4, word: "connect", meaning: "v. 关联；连接" },
    { unit: 4, word: "connected", meaning: "adj. 连接的；相关的" },
    { unit: 4, word: "be connected with", meaning: "to 与……相连；与……有关联" },
    { unit: 4, word: "without", meaning: "prep. 没有；缺乏" },
    { unit: 4, word: "imagine", meaning: "v. 想象；猜想" },
    { unit: 4, word: "honey", meaning: "n. 蜂蜜；（爱称）亲爱的" },
    { unit: 4, word: "disappointed", meaning: "adj. 失望的；沮丧的" },
    { unit: 4, word: "connection", meaning: "n. 联系；连接" },
    { unit: 4, word: "pollination", meaning: "n. 授粉" },
    { unit: 4, word: "pollen", meaning: "n. 花粉" },
    { unit: 4, word: "action", meaning: "n. 行动；行为" },
    { unit: 4, word: "in fact", meaning: "确切地说；实际上" },
    { unit: 4, word: "per cent", meaning: "n. 百分之……" },
    { unit: 4, word: "for this reason", meaning: "出于这个原因" },
    { unit: 4, word: "planet", meaning: "n. 行星" },
    { unit: 4, word: "in order to", meaning: "为了；以便" },
    { unit: 4, word: "store", meaning: "v. 贮存；存储 n. 百货商店" },
    { unit: 4, word: "honeycomb", meaning: "n. 蜂巢" },
    { unit: 4, word: "communicate", meaning: "v. 交流；沟通" },
    { unit: 4, word: "play a part (in sth)", meaning: "参与某事" },
    { unit: 4, word: "ecosystem", meaning: "n. 生态系统" },
    { unit: 4, word: "protect", meaning: "v. 保护；防护" },
    { unit: 4, word: "importance", meaning: "n. 重要性" },
    { unit: 4, word: "title", meaning: "n. 标题；题目；名称" },
    { unit: 4, word: "human", meaning: "n. 人 adj. 人的；人类的" },
    { unit: 4, word: "ant", meaning: "n. 蚂蚁" },
    { unit: 4, word: "be home to sb", meaning: "sth 有……栖息；是……的家乡" },
    { unit: 4, word: "happiness", meaning: "n. 幸福；快乐" },
    { unit: 4, word: "disappoint", meaning: "v. 使失望；使破灭" },
    { unit: 4, word: "mushroom", meaning: "n. 蘑菇；伞菌" },
    { unit: 4, word: "ton", meaning: "n. 吨" },
    { unit: 4, word: "role", meaning: "n. 作用；职能；角色" },
    { unit: 4, word: "play a role (in)", meaning: "在……中发挥作用；扮演角色" },
    { unit: 4, word: "pea", meaning: "n. 豌豆" },
    { unit: 4, word: "climate", meaning: "n. 气候" },
    { unit: 4, word: "ocean", meaning: "n. 大海；海洋" },
    { unit: 4, word: "except", meaning: "prep. 除……之外；除了" },
    { unit: 4, word: "tiny", meaning: "adj. 极小的；微小的" },
    { unit: 4, word: "lively", meaning: "adj. 精力充沛的；生机勃勃的" },
    { unit: 4, word: "the Arctic Ocean", meaning: "北冰洋" },
    { unit: 5, word: "pepper", meaning: "n. 胡椒粉；菜椒" },
    { unit: 5, word: "cut up", meaning: "切碎；剁碎" },
    { unit: 5, word: "mix", meaning: "v. 混合；融合；调配 n. 混合" },
    { unit: 5, word: "bake", meaning: "v. 烘焙" },
    { unit: 5, word: "oven", meaning: "n. 烤箱；烤炉" },
    { unit: 5, word: "pour sth into sth", meaning: "将……倒入……" },
    { unit: 5, word: "flour", meaning: "n. 面粉" },
    { unit: 5, word: "boil", meaning: "v. 煮沸；烧开 n. 沸腾" },
    { unit: 5, word: "butter", meaning: "n. 黄油" },
    { unit: 5, word: "cheese", meaning: "n. 奶酪；干酪" },
    { unit: 5, word: "cut sth in", meaning: "into sth 将……切成……" },
    { unit: 5, word: "tablespoon", meaning: "n. 一汤匙；餐匙" },
    { unit: 5, word: "mash", meaning: "v. 捣烂；捣碎" },
    { unit: 5, word: "mashed potatoes", meaning: "土豆泥" },
    { unit: 5, word: "stir-fry", meaning: "v. 翻炒；炒" },
    { unit: 5, word: "do with", meaning: "处理" },
    { unit: 5, word: "bowl", meaning: "n. 碗；钵；盆" },
    { unit: 5, word: "heat", meaning: "v. 加热；变热 n. 热；温度" },
    { unit: 5, word: "oil", meaning: "n. 食用油；石油" },
    { unit: 5, word: "pan", meaning: "n. 平底锅；烤盘" },
    { unit: 5, word: "put sth back", meaning: "将……放回" },
    { unit: 5, word: "mix ... with ...", meaning: "（使）……和……混合" },
    { unit: 5, word: "simple", meaning: "adj. 简单的；朴素的" },
    { unit: 5, word: "ingredient", meaning: "n. 食材；成分" },
    { unit: 5, word: "instruction", meaning: "n. 用法说明；操作指南" },
    { unit: 5, word: "steamed fish", meaning: "清蒸鱼" },
    { unit: 5, word: "sour", meaning: "adj. 酸的；有酸味的" },
    { unit: 5, word: "hot and sour soup", meaning: "酸辣汤" },
    { unit: 5, word: "mess", meaning: "n. 脏乱；凌乱" },
    { unit: 5, word: "pretty", meaning: "adj. 漂亮的 adv. 相当；非常" },
    { unit: 5, word: "Christmas", meaning: "n. 圣诞节" },
    { unit: 5, word: "pancake", meaning: "n. 烙饼；薄饼" },
    { unit: 5, word: "dream", meaning: "n. 梦想；梦 v. 做梦；梦想" },
    { unit: 5, word: "university", meaning: "n. 大学；高等学府" },
    { unit: 5, word: "go boating", meaning: "去划船" },
    { unit: 5, word: "memory", meaning: "n. 回忆；记忆" },
    { unit: 5, word: "visible", meaning: "adj. 看得见的；可见的" },
    { unit: 5, word: "along with sb", meaning: "sth 除……以外（还）" },
    { unit: 5, word: "pumpkin", meaning: "n. 南瓜" },
    { unit: 5, word: "pie", meaning: "n. 果馅饼；肉馅饼" },
    { unit: 5, word: "warm up", meaning: "（使）活跃起来；热身；预热" },
    { unit: 5, word: "cinnamon", meaning: "n. 肉桂皮；桂皮香料" },
    { unit: 5, word: "fill ... with ...", meaning: "（使）充满；（使）填满" },
    { unit: 5, word: "sweetness", meaning: "n. 甜；芬芳；愉悦" },
    { unit: 5, word: "college", meaning: "n. 学院；大学" },
    { unit: 5, word: "host", meaning: "n. 主人；东道主 v. 主办" },
    { unit: 5, word: "hostess", meaning: "n. 女主人；女房东" },
    { unit: 5, word: "recipe", meaning: "n. 食谱；烹饪法" },
    { unit: 5, word: "cream", meaning: "n. 奶油；护肤霜" },
    { unit: 5, word: "crust", meaning: "n. 糕饼酥皮；面包皮" },
    { unit: 5, word: "mixture", meaning: "n. 混合物；结合体" },
    { unit: 5, word: "least", meaning: "adv. & pron. 最小；最少" },
    { unit: 5, word: "at least", meaning: "至少" },
    { unit: 5, word: "secret", meaning: "n. 诀窍；秘密 adj. 秘密的" },
    { unit: 5, word: "according to", meaning: "根据；依照" },
    { unit: 5, word: "whenever", meaning: "adv. & conj. 每当" },
    { unit: 5, word: "item", meaning: "n. 项目；条" },
    { unit: 5, word: "spaghetti", meaning: "n. 意大利细面条" },
    { unit: 5, word: "spoon", meaning: "n. 一勺的量；勺" },
    { unit: 5, word: "slice", meaning: "n. 薄片 v. 切成薄片" },
    { unit: 5, word: "couple", meaning: "n. 夫妻；情侣；两人" },
    { unit: 5, word: "island", meaning: "n. 岛" },
    { unit: 5, word: "wife", meaning: "n. 妻子" },
    { unit: 5, word: "separate adj.", meaning: "（使）分开" },
    { unit: 5, word: "born", meaning: "v. 出生 adj. 天生的" },
    { unit: 5, word: "one by one", meaning: "逐个地；逐一地" },
    { unit: 6, word: "yourself", meaning: "pron. 你自己；您自己" },
    { unit: 6, word: "engineer", meaning: "n. 工程师；技师" },
    { unit: 6, word: "fashion", meaning: "n. 时装业；时尚" },
    { unit: 6, word: "designer", meaning: "n. 设计师" },
    { unit: 6, word: "director", meaning: "n. 导演；主任" },
    { unit: 6, word: "musician", meaning: "n. 音乐家；乐师" },
    { unit: 6, word: "fireman", meaning: "n. 消防队员" },
    { unit: 6, word: "AI", meaning: "人工智能" },
    { unit: 6, word: "essay", meaning: "n. 小品文；文章" },
    { unit: 6, word: "classic", meaning: "n. 经典作品 adj. 最优秀的；古典的" },
    { unit: 6, word: "keep on doing sth", meaning: "继续做；反复做" },
    { unit: 6, word: "make sure", meaning: "确保；保证" },
    { unit: 6, word: "try one's best", meaning: "尽最大努力" },
    { unit: 6, word: "literature", meaning: "n. 文学；文献" },
    { unit: 6, word: "athlete", meaning: "n. 运动员" },
    { unit: 6, word: "photographer", meaning: "n. 摄影师" },
    { unit: 6, word: "painter", meaning: "n. 画家；油漆匠" },
    { unit: 6, word: "businessman", meaning: "n. 商界人士；企业家" },
    { unit: 6, word: "actress", meaning: "n. 女演员" },
    { unit: 6, word: "lawyer", meaning: "n. 律师" },
    { unit: 6, word: "law", meaning: "n. 法律；法规" },
    { unit: 6, word: "bath", meaning: "n. 洗澡；浴缸" },
    { unit: 6, word: "miss", meaning: "v. 想念；错过" },
    { unit: 6, word: "be tired of", meaning: "对……感到厌倦" },
    { unit: 6, word: "able", meaning: "adj. 能够；有才能的" },
    { unit: 6, word: "stick", meaning: "v. 粘贴；将……刺入 n. 枝条；棍" },
    { unit: 6, word: "stick to sth", meaning: "坚持；维持" },
    { unit: 6, word: "resolution", meaning: "n. 决定；决议" },
    { unit: 6, word: "have (...) to do with sb", meaning: "sth 与……有关系" },
    { unit: 6, word: "mini-goal", meaning: "n. 小目标" },
    { unit: 6, word: "achieve", meaning: "v. 达到；完成" },
    { unit: 6, word: "physical", meaning: "adj. 身体的；物质的" },
    { unit: 6, word: "health", meaning: "n. 健康" },
    { unit: 6, word: "healthily", meaning: "adv. 健康地" },
    { unit: 6, word: "take up", meaning: "开始学；开始从事" },
    { unit: 6, word: "photography", meaning: "n. 照相术；摄影" },
    { unit: 6, word: "self-improvement", meaning: "n. 自我改进" },
    { unit: 6, word: "confident", meaning: "adj. 自信的；肯定的" },
    { unit: 6, word: "organized", meaning: "adj. 有条理的；有组织的" },
    { unit: 6, word: "wisely", meaning: "adv. 聪明地；明智地" },
    { unit: 6, word: "possible", meaning: "adj. 可能的；合理的" },
    { unit: 6, word: "paragraph", meaning: "n. 段；段落" },
    { unit: 6, word: "introduce", meaning: "v. 介绍；引见；引进" },
    { unit: 6, word: "meaning", meaning: "n. 意义；含义" },
    { unit: 6, word: "fail", meaning: "v. 未能（做到）；失败" },
    { unit: 6, word: "ahead", meaning: "adv. 提前；在前面" },
    { unit: 6, word: "put out", meaning: "扑灭；把……摆好" },
    { unit: 6, word: "design", meaning: "v. 设计；计划 n. 设计" },
    { unit: 6, word: "bridge", meaning: "n. 桥" },
    { unit: 6, word: "final", meaning: "adj. 最后的 n. 决赛" },
    { unit: 6, word: "confidence", meaning: "n. 信心；信任" },
    { unit: 6, word: "draw to a close", meaning: "即将结束" },
    { unit: 6, word: "form", meaning: "v. 形成；组成 n. 类型；形式" },
    { unit: 6, word: "relationship", meaning: "n. 关系；联系" },
    { unit: 6, word: "push-up", meaning: "n. 俯卧撑" },
    { unit: 6, word: "energetic", meaning: "adj. 精力充沛的" },
    { unit: 6, word: "last but not least", meaning: "最后但同等重要的" },
    { unit: 7, word: "prediction", meaning: "n. 预测；预言" },
    { unit: 7, word: "outer", meaning: "adj. 外围的；外表的" },
    { unit: 7, word: "outer space", meaning: "太空；外层空间" },
    { unit: 7, word: "worse", meaning: "adj. 更差的 adv. 更差" },
    { unit: 7, word: "take over", meaning: "接替；接管" },
    { unit: 7, word: "sci-fi", meaning: "n. 科幻小说" },
    { unit: 7, word: "ticket", meaning: "n. 票；券" },
    { unit: 7, word: "positive", meaning: "adj. 乐观的；积极的" },
    { unit: 7, word: "traffic", meaning: "n. 交通；运输" },
    { unit: 7, word: "technology", meaning: "n. 科技；工艺" },
    { unit: 7, word: "video", meaning: "n. 视频 v. 录视频" },
    { unit: 7, word: "transport n.", meaning: "交通运输系统" },
    { unit: 7, word: "system", meaning: "n. 系统" },
    { unit: 7, word: "efficient", meaning: "adj. 效率高的" },
    { unit: 7, word: "education", meaning: "n. 教育" },
    { unit: 7, word: "length", meaning: "n. 时长；长度" },
    { unit: 7, word: "topic", meaning: "n. 话题；题目" },
    { unit: 7, word: "partner", meaning: "n. 搭档；同伴" },
    { unit: 7, word: "shall", meaning: "modal v. 将要；将会" },
    { unit: 7, word: "pass", meaning: "v. 及格；通过 n. 及格" },
    { unit: 7, word: "winner", meaning: "n. 优胜者；成功者" },
    { unit: 7, word: "cure", meaning: "n. 药物；疗法 v. 治愈" },
    { unit: 7, word: "cancer", meaning: "n. 癌症" },
    { unit: 7, word: "concert", meaning: "n. 音乐会" },
    { unit: 7, word: "cash", meaning: "n. 现金 v. 兑现" },
    { unit: 7, word: "wallet", meaning: "n. 钱包" },
    { unit: 7, word: "guest", meaning: "n. 客人；宾客" },
    { unit: 7, word: "chief", meaning: "adj. 首席的 n. 首领" },
    { unit: 7, word: "researcher", meaning: "n. 研究者" },
    { unit: 7, word: "research", meaning: "n. & v. 研究；调查" },
    { unit: 7, word: "futurist", meaning: "n. 未来学家" },
    { unit: 7, word: "everywhere", meaning: "adv. 到处" },
    { unit: 7, word: "robotics", meaning: "n. 机器人学" },
    { unit: 7, word: "industry", meaning: "n. 行业；工业" },
    { unit: 7, word: "service", meaning: "n. 服务" },
    { unit: 7, word: "disaster", meaning: "n. 灾难" },
    { unit: 7, word: "emergency", meaning: "n. 突发事件；紧急情况" },
    { unit: 7, word: "disappear", meaning: "v. 消失" },
    { unit: 7, word: "challenging", meaning: "adj. 挑战性的" },
    { unit: 7, word: "pilot", meaning: "n. 飞行员" },
    { unit: 7, word: "expert", meaning: "n. 专家 adj. 熟练的" },
    { unit: 7, word: "replace", meaning: "v. 代替；取代" },
    { unit: 7, word: "creativity", meaning: "n. 创造力" },
    { unit: 7, word: "emotional", meaning: "adj. 情感的；情绪的" },
    { unit: 7, word: "intelligence", meaning: "n. 智力；智慧" },
    { unit: 7, word: "emotional intelligence", meaning: "情绪智力" },
    { unit: 7, word: "mention", meaning: "v. 提到；写到" },
    { unit: 7, word: "refrigerator", meaning: "n. 冰箱" },
    { unit: 7, word: "low", meaning: "adv. 低 adj. 低的 n. 低谷" },
    { unit: 7, word: "run low (on sth)", meaning: "即将用尽" },
    { unit: 7, word: "accept", meaning: "v. 接受；相信" },
    { unit: 7, word: "influence", meaning: "v. 影响 n. 影响" },
    { unit: 7, word: "creative", meaning: "adj. 创造性的" },
    { unit: 7, word: "impossible", meaning: "adj. 不可能的" },
    { unit: 7, word: "quality", meaning: "n. 素质；质量 adj. 优质的" },
    { unit: 7, word: "develop", meaning: "v. 增强；发展" },
    { unit: 7, word: "German", meaning: "n. 德语；德国人 adj. 德国的" },
    { unit: 7, word: "valuable", meaning: "adj. 很有用的；宝贵的" },
    { unit: 7, word: "public", meaning: "adj. 公共的；公众的" },
    { unit: 7, word: "medical", meaning: "adj. 医学的；医疗的" },
    { unit: 7, word: "challenge", meaning: "n. 挑战 v. 挑战" },
    { unit: 7, word: "task", meaning: "n. 任务；工作" },
    { unit: 7, word: "depend", meaning: "v. 取决于；依靠" },
    { unit: 7, word: "depend on", meaning: "upon 取决于；依靠" },
    { unit: 7, word: "come over", meaning: "来访；拜访" },
    { unit: 7, word: "as long as", meaning: "只要" },
    { unit: 8, word: "communication", meaning: "n. 表达；交流" },
    { unit: 8, word: "face to face", meaning: "面对面" },
    { unit: 8, word: "text message", meaning: "短信息；短信" },
    { unit: 8, word: "sign", meaning: "n. 手势；迹象 v. 签（名）" },
    { unit: 8, word: "speaker", meaning: "n. 说话者；发言者" },
    { unit: 8, word: "rehearsal", meaning: "n. 排演；排练" },
    { unit: 8, word: "show sb around", meaning: "领某人参观" },
    { unit: 8, word: "local", meaning: "adj. 当地的 n. 当地人" },
    { unit: 8, word: "face-to-face adj.", meaning: "面对面的" },
    { unit: 8, word: "professor", meaning: "n. 教授" },
    { unit: 8, word: "speech", meaning: "n. 演说；发言" },
    { unit: 8, word: "argue", meaning: "v. 争论；争吵" },
    { unit: 8, word: "make up (with sb)", meaning: "与……言归于好" },
    { unit: 8, word: "in person", meaning: "亲自；亲身" },
    { unit: 8, word: "prefer", meaning: "v. 较喜欢" },
    { unit: 8, word: "calm", meaning: "adj. 镇静的 v. 使平静" },
    { unit: 8, word: "worry about", meaning: "为……担心" },
    { unit: 8, word: "expression", meaning: "n. 表达方式" },
    { unit: 8, word: "chance", meaning: "n. 机会；可能性" },
    { unit: 8, word: "meeting", meaning: "n. 会面；会议" },
    { unit: 8, word: "difficulty", meaning: "n. 困难；难题" },
    { unit: 8, word: "right away", meaning: "立即；马上" },
    { unit: 8, word: "line", meaning: "n. 字行；便条；线" },
    { unit: 8, word: "drop sb a line", meaning: "给……写信" },
    { unit: 8, word: "detail", meaning: "n. 细节；详情" },
    { unit: 8, word: "reunion", meaning: "n. 团聚；重逢" },
    { unit: 8, word: "seriously", meaning: "adv. 严肃地；认真地" },
    { unit: 8, word: "training", meaning: "n. 训练；培训" },
    { unit: 8, word: "nervous", meaning: "adj. 担忧的；焦虑的" },
    { unit: 8, word: "stranger", meaning: "n. 陌生人" },
    { unit: 8, word: "tip", meaning: "n. 指点；提示 v. 倾斜" },
    { unit: 8, word: "carefully", meaning: "adv. 认真地；仔细地" },
    { unit: 8, word: "show interest in sth", meaning: "对……表现出兴趣" },
    { unit: 8, word: "listener", meaning: "n. 听者" },
    { unit: 8, word: "point", meaning: "n. 观点；重点 v. 指向" },
    { unit: 8, word: "surely", meaning: "adv. 想必；必定" },
    { unit: 8, word: "continue", meaning: "v. 持续；继续做" },
    { unit: 8, word: "impolite", meaning: "adj. 不礼貌的" },
    { unit: 8, word: "personal", meaning: "adj. 个人的；私人的" },
    { unit: 8, word: "argue with sb", meaning: "与某人争论" },
    { unit: 8, word: "move on (to sth)", meaning: "换话题" },
    { unit: 8, word: "sincere", meaning: "adj. 真诚的；诚实的" },
    { unit: 8, word: "find out", meaning: "查明；弄清" },
    { unit: 8, word: "pay", meaning: "v. 付费；交纳 n. 工资" },
    { unit: 8, word: "attention", meaning: "n. 注意；专心" },
    { unit: 8, word: "pay attention (to ...)", meaning: "注意；关注" },
    { unit: 8, word: "be yourself", meaning: "行为自然；不做作" },
    { unit: 8, word: "offer", meaning: "v. 提供；主动提出 n. 提议" },
    { unit: 8, word: "reasonable", meaning: "adj. 公平的；合理的" },
    { unit: 8, word: "social", meaning: "adj. 社会的；社交的" },
    { unit: 8, word: "medium", meaning: "n. 媒介 adj. 中等的" },
    { unit: 8, word: "social media", meaning: "社交媒体" },
    { unit: 8, word: "trust", meaning: "n. & v. 信任；相信" },
    { unit: 8, word: "keep (...) away from ...", meaning: "（使）远离" },
    { unit: 8, word: "misunderstanding", meaning: "n. 误解" },
    { unit: 8, word: "event", meaning: "n. 公开活动；重要事情" },
    { unit: 8, word: "take place", meaning: "发生；进行" },
    { unit: 8, word: "cost", meaning: "n. 费用 v. 价格为" },
    { unit: 8, word: "opportunity", meaning: "n. 机会；时机" },
    { unit: 8, word: "benefit", meaning: "v. 使受益 n. 益处" },
    { unit: 8, word: "benefit ... from ...", meaning: "从……获益" },
    { unit: 8, word: "reply", meaning: "n. & v. 回答；回复" },
    { unit: 8, word: "honour", meaning: "n. 荣幸；尊敬 v. 表彰" },
    { unit: 8, word: "sincerely", meaning: "adv. 真诚地" },
    { unit: 8, word: "opening", meaning: "adj. 开篇的 n. 开始" },
    { unit: 8, word: "closing", meaning: "adj. 结尾的 n. 关闭" },
    { unit: 8, word: "sentence", meaning: "n. 句子 v. 判决" },
    { unit: 8, word: "date", meaning: "n. 日期；约会 v. 注明日期" },
    { unit: 8, word: "clause", meaning: "n. 从句；分句" },
  ],
};

const k12State = {
  vocabulary: [],
  currentIndex: 0,
  isFlipped: false,
  isSequential: false,
};

function bindK12Events() {
  els.k12Semester.addEventListener("change", k12UpdatePool);

  const allCb = els.k12Units.querySelector('input[value="all"]');
  const unitCbs = [...els.k12Units.querySelectorAll('input:not([value="all"])')];

  allCb.addEventListener("change", () => {
    unitCbs.forEach((cb) => (cb.checked = allCb.checked));
    k12UpdatePool();
  });

  unitCbs.forEach((cb) => {
    cb.addEventListener("change", () => {
      allCb.checked = unitCbs.every((c) => c.checked);
      k12UpdatePool();
    });
  });

  els.k12CardContainer.addEventListener("click", k12Flip);
  els.k12Prev.addEventListener("click", k12Prev);
  els.k12Next.addEventListener("click", k12Next);
  els.k12Shuffle.addEventListener("click", k12ShuffleMode);
  els.k12Sequential.addEventListener("click", k12SequentialMode);
}

function k12UpdatePool() {
  const semester = els.k12Semester.value;
  const data = K12_DATA[semester] || [];
  const checkedUnits = [...els.k12Units.querySelectorAll('input:not([value="all"]):checked')]
    .map((cb) => parseInt(cb.value, 10));

  const filtered = data.filter((item) => checkedUnits.includes(item.unit));
  k12State.vocabulary = k12State.isSequential ? filtered.slice() : shuffle(filtered.slice());
  k12State.currentIndex = 0;
  k12State.isFlipped = false;
  k12RenderCard();
}

function k12Flip() {
  k12State.isFlipped = !k12State.isFlipped;
  els.k12Flashcard.classList.toggle("is-flipped", k12State.isFlipped);
}

function k12ResetFlip() {
  if (k12State.isFlipped) {
    els.k12Flashcard.style.transition = "none";
    els.k12Flashcard.classList.remove("is-flipped");
    k12State.isFlipped = false;
    void els.k12Flashcard.offsetWidth;
    els.k12Flashcard.style.transition = "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)";
  }
}

function k12Prev() {
  if (k12State.currentIndex > 0) {
    k12State.currentIndex--;
    k12RenderCard();
  }
}

function k12Next() {
  if (k12State.currentIndex < k12State.vocabulary.length - 1) {
    k12State.currentIndex++;
    k12RenderCard();
  }
}

function k12ShuffleMode() {
  k12State.isSequential = false;
  els.k12Shuffle.classList.add("btn-active");
  els.k12Sequential.classList.remove("btn-active");
  k12State.vocabulary = shuffle(k12State.vocabulary.slice());
  k12State.currentIndex = 0;
  k12RenderCard();
}

function k12SequentialMode() {
  k12State.isSequential = true;
  els.k12Sequential.classList.add("btn-active");
  els.k12Shuffle.classList.remove("btn-active");
  k12UpdatePool();
}

function k12RenderCard() {
  k12ResetFlip();
  const v = k12State.vocabulary;
  if (!v.length) {
    els.k12Progress.textContent = "0 / 0";
    els.k12Chinese.textContent = "没有匹配的单词";
    els.k12Exp.textContent = "";
    els.k12Word.textContent = "";
    clearNode(els.k12Example);
    return;
  }

  const item = v[k12State.currentIndex];
  els.k12Progress.textContent = `${k12State.currentIndex + 1} / ${v.length}`;
  els.k12Chinese.textContent = item.meaning;
  els.k12Exp.textContent = item.exp;
  els.k12Word.textContent = item.word;

  clearNode(els.k12Example);
  const sentence = k12BuildExampleSentence(item);
  k12RenderHighlightedSentence(els.k12Example, sentence, item.word);
}

function k12BuildExampleSentence(item) {
  const w = item.word;
  const sentences = {
    "rule": "You must follow the rule in class.",
    "order": "The teacher keeps order in the classroom.",
    "follow": "Please follow me to the library.",
    "arrive": "We arrive at school at 7:30.",
    "uniform": "Students wear a uniform every day.",
    "polite": "It is polite to say thank you.",
    "respect": "We should respect our teachers.",
    "leave": "Don't leave your bag on the floor.",
    "focus": "Please focus on your homework.",
    "fit": "She keeps fit by running every day.",
    "score": "He scored three goals in the game.",
    "challenge": "This is a big challenge for me.",
    "dream": "My dream is to be a scientist.",
    "hate": "I hate getting up early.",
    "fair": "It's not fair to copy others' work.",
    "appear": "A rainbow appeared after the rain.",
    "hide": "The cat likes to hide under the bed.",
    "weather": "The weather is sunny today.",
    "tourist": "The tourist visited the Great Wall.",
    "museum": "We went to the museum last weekend.",
    "explore": "Let's explore the forest together.",
    "believe": "I believe you can do it.",
    "decide": "She decided to study harder.",
    "search": "He searched for his lost key.",
    "promise": "I promise to help you tomorrow.",
  };
  if (sentences[w.toLowerCase()]) return sentences[w.toLowerCase()];
  if (w.includes(" ")) return `We often use "${w}" in daily English.`;
  return `The word "${w}" is important to remember.`;
}

function k12RenderHighlightedSentence(container, sentence, targetWord) {
  const lower = sentence.toLowerCase();
  const target = targetWord.toLowerCase();
  const idx = lower.indexOf(target);
  if (idx === -1) {
    container.textContent = sentence;
    return;
  }
  if (idx > 0) container.appendChild(document.createTextNode(sentence.slice(0, idx)));
  const mark = document.createElement("span");
  mark.className = "k12-word-highlight";
  mark.textContent = sentence.slice(idx, idx + target.length);
  container.appendChild(mark);
  if (idx + target.length < sentence.length) {
    container.appendChild(document.createTextNode(sentence.slice(idx + target.length)));
  }
}

bindK12Events();
k12UpdatePool();
