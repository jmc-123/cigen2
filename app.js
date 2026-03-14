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
    filterUnmastered: false,
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
    1368: document.getElementById("panel-1368"),
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
  flashFilterUnmastered: document.getElementById("flashFilterUnmastered"),
  flashProgressFill: document.getElementById("flashProgressFill"),
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

  els.flashFilterUnmastered.addEventListener("change", () => {
    state.flash.filterUnmastered = els.flashFilterUnmastered.checked;
    initFlash();
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

  document.addEventListener("keydown", (e) => {
    if (!els.panels.learn.classList.contains("active")) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      if (!state.flash.revealed) {
        state.flash.revealed = true;
        renderFlashCard();
      } else {
        advanceFlash();
      }
    } else if (e.key === "ArrowRight") {
      advanceFlash(true);
    } else if (e.key === "ArrowLeft") {
      if (state.flash.index > 0) {
        state.flash.index--;
        state.flash.revealed = false;
        renderFlashCard();
      }
    } else if (e.key === "Enter") {
      if (state.flash.revealed) {
        const root = state.flash.pool[state.flash.index];
        if (root) {
          state.progress.mastered[root] = true;
          saveProgress();
          renderMeta();
        }
        advanceFlash();
      }
    }
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
  const masteredCount = Object.values(state.progress.mastered).filter(
    Boolean,
  ).length;
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
  els.tabs.forEach((tab) =>
    tab.classList.toggle("active", tab.dataset.tab === tabName),
  );
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
  mastered.textContent = state.progress.mastered[rootData.root]
    ? "已掌握"
    : "待复习";

  head.appendChild(rootName);
  head.appendChild(gloss);
  head.appendChild(count);
  head.appendChild(mastered);

  const intro = document.createElement("p");
  intro.textContent = "例词拆解（优先展示包含此词根/词缀的词条）:";

  const examples = document.createElement("div");
  examples.className = "examples";
  const relatedEntries = (state.rootToEntries.get(rootData.root) || []).slice(
    0,
    24,
  );
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

  const matches = state.entries.filter((entry) =>
    entry.word.toLowerCase().includes(q),
  );
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
  let pool = state.roots.filter((item) => item.wordCount >= 2);
  if (state.flash.filterUnmastered) {
    pool = pool.filter((item) => !state.progress.mastered[item.root]);
  }
  state.flash.pool = shuffle(pool.map((item) => item.root));
  state.flash.index = 0;
  state.flash.revealed = false;
  renderFlashCard();
}

function renderFlashCard() {
  clearNode(els.flashCard);
  if (!state.flash.pool.length) {
    els.flashMeta.textContent = state.flash.filterUnmastered
      ? "已全部掌握！🎉"
      : "没有可用闪卡。";
    els.flashCard.textContent = state.flash.filterUnmastered
      ? "所有词根都已标记为掌握，取消筛选查看全部。"
      : "请检查数据文件。";
    els.flashProgressFill.style.width = state.flash.filterUnmastered
      ? "100%"
      : "0%";
    return;
  }

  const root = state.flash.pool[state.flash.index];
  const rootData = state.rootMap.get(root);
  if (!rootData) {
    return;
  }

  const masteredCount = Object.values(state.progress.mastered).filter(
    Boolean,
  ).length;
  const totalRoots = state.roots.filter((item) => item.wordCount >= 2).length;
  els.flashMeta.textContent = `第 ${state.flash.index + 1}/${state.flash.pool.length} 张 | 已掌握 ${masteredCount}/${totalRoots}`;
  const pct =
    state.flash.pool.length > 0
      ? ((state.flash.index + 1) / state.flash.pool.length) * 100
      : 0;
  els.flashProgressFill.style.width = `${pct.toFixed(1)}%`;

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
      .map((item) => item.root),
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
    const rd = state.rootMap.get(root);
    if (rd && rd.gloss) {
      button.textContent = `${root}（${rd.gloss}）`;
    }
  });

  const correctData = state.rootMap.get(q.correctRoot);
  const examples = (correctData?.sampleWords || []).slice(0, 4).join(", ");
  els.quizFeedback.textContent = correct
    ? `✅ 回答正确！例词: ${examples}`
    : `❌ 回答错误。正确答案是 ${q.correctRoot}（${correctData?.gloss || ""}）。例词: ${examples}`;
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
        el.appendChild(
          document.createTextNode(targetWord.slice(currentIndex, pos)),
        );
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
  七下: [
    {
      unit: 1,
      word: "fox",
      meaning: "n. 狐狸",
      exp: "A fox is a wild animal with red or orange fur and a bushy tail. It is known for being clever.",
      example: "The fox ran quickly across the field.",
    },
    {
      unit: 1,
      word: "giraffe",
      meaning: "n. 长颈鹿",
      exp: "A giraffe is the tallest animal on land. It has a very long neck and long legs.",
      example:
        "The giraffe used its long neck to eat leaves from the tall tree.",
    },
    {
      unit: 1,
      word: "eagle",
      meaning: "n. 雕；鹰",
      exp: "An eagle is a large, strong bird that flies very high. It has sharp eyes to find food.",
      example: "The eagle flew high above the mountains.",
    },
    {
      unit: 1,
      word: "wolf",
      meaning: "n. (pl. wolves) 狼",
      exp: "A wolf is a wild animal that looks like a big dog. Wolves live in groups called packs.",
      example: "The wolf howled at the moon at night.",
    },
    {
      unit: 1,
      word: "penguin",
      meaning: "n. 企鹅",
      exp: "A penguin is a black and white bird that lives in cold places. It cannot fly but swims very well.",
      example: "The penguin slid on the ice and jumped into the water.",
    },
    {
      unit: 1,
      word: "care",
      meaning: "n. 照顾；护理 v. 关心；在乎",
      exp: "If you care about something, it is important to you. Care also means looking after someone.",
      example: "Please take care when you cross the road.",
    },
    {
      unit: 1,
      word: "take care of",
      meaning: "照顾；处理",
      exp: "To take care of someone means to look after them and keep them safe.",
      example: "She takes care of her little brother after school.",
    },
    {
      unit: 1,
      word: "sandwich",
      meaning: "n. 三明治",
      exp: "A sandwich is two pieces of bread with food in the middle, like cheese or meat.",
      example: "I made a sandwich with bread and ham for lunch.",
    },
    {
      unit: 1,
      word: "snake",
      meaning: "n. 蛇",
      exp: "A snake is a long animal with no legs that moves along the ground. Some snakes are dangerous.",
      example: "The snake moved slowly through the grass.",
    },
    {
      unit: 1,
      word: "scary",
      meaning: "adj. 吓人的；恐怖的",
      exp: "Something scary makes you feel afraid or frightened.",
      example: "The old house at night looked very scary.",
    },
    {
      unit: 1,
      word: "neck",
      meaning: "n. 脖子",
      exp: "Your neck is the part of your body between your head and your shoulders.",
      example: "A giraffe has a very long neck.",
    },
    {
      unit: 1,
      word: "guess",
      meaning: "v. 猜测；估计",
      exp: "When you guess, you think of an answer without knowing if it is correct.",
      example: "Can you guess how many sweets are in the jar?",
    },
    {
      unit: 1,
      word: "shark",
      meaning: "n. 鲨鱼",
      exp: "A shark is a large, strong fish that lives in the sea. It has sharp teeth.",
      example: "We saw a big shark swimming near the boat.",
    },
    {
      unit: 1,
      word: "whale",
      meaning: "n. 鲸",
      exp: "A whale is the largest animal in the sea. It breathes air like humans.",
      example: "The whale jumped out of the water and made a huge splash.",
    },
    {
      unit: 1,
      word: "huge",
      meaning: "adj. 巨大的；极多的",
      exp: "Huge means very, very big in size.",
      example: "An elephant is a huge animal.",
    },
    {
      unit: 1,
      word: "dangerous",
      meaning: "adj. 危险的；有危害的",
      exp: "Something dangerous can hurt you or cause harm.",
      example: "It is dangerous to swim alone in the deep sea.",
    },
    {
      unit: 1,
      word: "save",
      meaning: "v. 救；储蓄；保存",
      exp: "To save means to help someone from danger, or to keep money for later.",
      example:
        "The firefighter helped save the child from the burning building.",
    },
    {
      unit: 1,
      word: "luck",
      meaning: "n. 幸运；运气",
      exp: "Luck is when good things happen to you without trying. Good luck means things go well.",
      example: "He found a coin on the ground — what good luck!",
    },
    {
      unit: 1,
      word: "Thai",
      meaning: "adj. 泰国的；泰国人的 n. 泰国人；泰语",
      exp: "Thai means belonging to or coming from Thailand, a country in Southeast Asia.",
      example: "She cooked a delicious Thai meal with rice and spices.",
    },
    {
      unit: 1,
      word: "trunk",
      meaning: "n. 象鼻",
      exp: "A trunk is an elephant's long nose. It uses its trunk to pick up things and drink water.",
      example: "The elephant used its trunk to pick up a banana.",
    },
    {
      unit: 1,
      word: "pick",
      meaning: "v. 捡；摘",
      exp: "To pick something means to choose it, or to take it with your fingers.",
      example: "Please pick up the pen from the floor.",
    },
    {
      unit: 1,
      word: "pick up",
      meaning: "拿起；举起",
      exp: "To pick up something means to lift it from the ground or a surface.",
      example: "He bent down to pick up the book he had dropped.",
    },
    {
      unit: 1,
      word: "carry",
      meaning: "v. 拿；提",
      exp: "To carry something means to hold it and take it somewhere.",
      example: "She carried her heavy school bag on her back.",
    },
    {
      unit: 1,
      word: "playful",
      meaning: "adj. 爱嬉戏的；爱玩的",
      exp: "A playful person or animal likes to play and have fun.",
      example: "The playful puppy ran around the garden all morning.",
    },
    {
      unit: 1,
      word: "swimmer",
      meaning: "n. 游泳者",
      exp: "A swimmer is a person who swims in water.",
      example: "She is a fast swimmer and wins many races.",
    },
    {
      unit: 1,
      word: "one another",
      meaning: "互相",
      exp: "One another means each person does the same thing to the other.",
      example: "Good friends help one another when they have problems.",
    },
    {
      unit: 1,
      word: "look after",
      meaning: "照顾",
      exp: "To look after someone means to take care of them and keep them safe.",
      example: "Can you look after my cat while I am away?",
    },
    {
      unit: 1,
      word: "culture",
      meaning: "n. 文化；文明",
      exp: "Culture is the way of life of a group of people — their food, music, and traditions.",
      example: "Learning about Chinese culture is very interesting.",
    },
    {
      unit: 1,
      word: "however",
      meaning: "adv. 然而；不过",
      exp: "However means but or on the other hand. It shows a contrast.",
      example: "I wanted to go outside; however, it was raining.",
    },
    {
      unit: 1,
      word: "danger",
      meaning: "n. 危险",
      exp: "Danger is when something could hurt you or cause harm.",
      example: "The sign warned hikers about the danger of falling rocks.",
    },
    {
      unit: 1,
      word: "in danger",
      meaning: "处于危险之中",
      exp: "When something is in danger, it might be hurt or harmed.",
      example: "The forest animals were in danger because of the fire.",
    },
    {
      unit: 1,
      word: "forest",
      meaning: "n. 森林",
      exp: "A forest is a large area of land covered with many trees.",
      example: "We went for a walk in the forest and saw many birds.",
    },
    {
      unit: 1,
      word: "cut down",
      meaning: "砍伐；减少",
      exp: "To cut down a tree means to cut through it so it falls to the ground.",
      example: "Workers cut down the old tree in the park.",
    },
    {
      unit: 1,
      word: "too many",
      meaning: "太多",
      exp: "Too many means more than is needed or wanted.",
      example: "There are too many people on the bus — it is very crowded.",
    },
    {
      unit: 1,
      word: "kill",
      meaning: "v. 杀死；弄死",
      exp: "To kill means to make a living thing die.",
      example: "Pollution can kill fish and other animals in the river.",
    },
    {
      unit: 1,
      word: "made of",
      meaning: "由……制成的",
      exp: "Made of tells you what material something is made from.",
      example: "This chair is made of wood.",
    },
    {
      unit: 1,
      word: "ivory",
      meaning: "n. 象牙",
      exp: "Ivory is the hard white material that forms an elephant's tusks.",
      example: "The old piano keys were made of ivory.",
    },
    {
      unit: 1,
      word: "friendly",
      meaning: "adj. 友好的",
      exp: "A friendly person is kind and easy to talk to.",
      example: "Our new neighbour is very friendly and always smiles.",
    },
    {
      unit: 1,
      word: "quite",
      meaning: "adv. 相当；完全",
      exp: "Quite means fairly or very, but not completely.",
      example: "The weather is quite warm today.",
    },
    {
      unit: 1,
      word: "quite a",
      meaning: "相当；非常",
      exp: "Quite a is used to say that something is more than expected.",
      example: "That was quite a big surprise!",
    },
    {
      unit: 1,
      word: "not … at all",
      meaning: "一点也不；完全不",
      exp: "Not at all means completely not, with no exceptions.",
      example: "I am not tired at all — I slept very well last night.",
    },
    {
      unit: 1,
      word: "fur",
      meaning: "n.（动物浓厚的）软毛",
      exp: "Fur is the soft, thick hair that covers many animals.",
      example: "The rabbit has soft white fur.",
    },
    {
      unit: 1,
      word: "blind",
      meaning: "adj. 瞎的；失明的",
      exp: "Blind means not able to see anything.",
      example: "The old dog was blind but could still find its food.",
    },
    {
      unit: 1,
      word: "hearing",
      meaning: "n. 听力；听觉",
      exp: "Hearing is the ability to hear sounds through your ears.",
      example: "Bats have very good hearing to find food in the dark.",
    },
    {
      unit: 2,
      word: "rule",
      meaning: "n. 规则；规章",
      exp: "A rule is something that you must do or must not do in a place or game.",
      example: "You must follow the rule in class.",
    },
    {
      unit: 2,
      word: "order",
      meaning: "n. 秩序；命令 v. 点菜；命令",
      exp: "Order means things are arranged well, or a command someone gives you.",
      example: "The teacher keeps order in the classroom.",
    },
    {
      unit: 2,
      word: "follow",
      meaning: "v. 遵循；跟随",
      exp: "To follow means to go after someone, or to do what a rule says.",
      example: "Please follow me to the library.",
    },
    {
      unit: 2,
      word: "late for",
      meaning: "迟到",
      exp: "Late for means arriving after the correct time.",
      example: "He was late for school because he missed the bus.",
    },
    {
      unit: 2,
      word: "arrive",
      meaning: "v. 到达",
      exp: "To arrive means to reach a place after travelling.",
      example: "We arrive at school at 7:30 every morning.",
    },
    {
      unit: 2,
      word: "on time",
      meaning: "准时",
      exp: "On time means at the right time, not late.",
      example: "Please come on time for the meeting.",
    },
    {
      unit: 2,
      word: "hallway",
      meaning: "n. 走廊",
      exp: "A hallway is a long narrow space inside a building that connects rooms.",
      example: "Please walk quietly in the hallway.",
    },
    {
      unit: 2,
      word: "uniform",
      meaning: "n. 校服；制服",
      exp: "A uniform is a set of clothes that all people in a group wear.",
      example: "Students wear a uniform every day.",
    },
    {
      unit: 2,
      word: "litter",
      meaning: "v. 乱扔 n. 垃圾",
      exp: "To litter means to throw rubbish on the ground in a public place.",
      example: "Do not litter — put your rubbish in the bin.",
    },
    {
      unit: 2,
      word: "polite",
      meaning: "adj. 有礼貌的",
      exp: "Polite means having good manners and being respectful to others.",
      example: "It is polite to say thank you when someone helps you.",
    },
    {
      unit: 2,
      word: "treat",
      meaning: "v. 对待；招待；治疗 n. 款待",
      exp: "To treat someone means the way you act towards them. A treat is something special.",
      example: "We should treat everyone with kindness.",
    },
    {
      unit: 2,
      word: "respect",
      meaning: "n. & v. 尊敬",
      exp: "To respect someone means to think well of them and act kindly towards them.",
      example: "We should respect our teachers.",
    },
    {
      unit: 2,
      word: "if",
      meaning: "conj. 如果",
      exp: "If is used to talk about something that might happen.",
      example: "If it rains, we will stay inside.",
    },
    {
      unit: 2,
      word: "jacket",
      meaning: "n. 夹克衫；短上衣",
      exp: "A jacket is a short coat that you wear on the top part of your body.",
      example: "He put on his jacket before going outside.",
    },
    {
      unit: 2,
      word: "have to",
      meaning: "不得不",
      exp: "Have to means something is necessary and you must do it.",
      example: "You have to finish your homework before you watch TV.",
    },
    {
      unit: 2,
      word: "everything",
      meaning: "pron. 每件事；一切",
      exp: "Everything means all things.",
      example: "I checked everything in my bag before leaving.",
    },
    {
      unit: 2,
      word: "lend",
      meaning: "v. 借给；借出",
      exp: "To lend something means to give it to someone for a short time. They must give it back.",
      example: "Can you lend me your pen?",
    },
    {
      unit: 2,
      word: "sweet",
      meaning: "n. 糖果 adj. 甜的",
      exp: "Sweet means having a pleasant sugary taste. A sweet is also a small piece of candy.",
      example: "She likes sweet things like chocolate and cake.",
    },
    {
      unit: 2,
      word: "snack",
      meaning: "n. 点心；小吃",
      exp: "A snack is a small amount of food eaten between meals.",
      example: "I had an apple as a snack after school.",
    },
    {
      unit: 2,
      word: "of course",
      meaning: "当然",
      exp: "Of course means yes, definitely, or as expected.",
      example: "Of course I will help you with your bag.",
    },
    {
      unit: 2,
      word: "mobile",
      meaning: "adj. 可移动的",
      exp: "Mobile means easy to move or carry from place to place.",
      example: "She uses her mobile phone to call her friends.",
    },
    {
      unit: 2,
      word: "mobile phone",
      meaning: "手机",
      exp: "A mobile phone is a small phone you can carry with you everywhere.",
      example: "He sent a message on his mobile phone.",
    },
    {
      unit: 2,
      word: "turn off",
      meaning: "关掉（水、电或煤气）",
      exp: "To turn off means to stop a machine or light from working.",
      example: "Please turn off the lights when you leave the room.",
    },
    {
      unit: 2,
      word: "queue",
      meaning: "n. 队",
      exp: "A queue is a line of people waiting for something.",
      example: "There was a long queue outside the cinema.",
    },
    {
      unit: 2,
      word: "jump the queue",
      meaning: "插队",
      exp: "To jump the queue means to go in front of other people who are already waiting.",
      example: "It is rude to jump the queue at the bus stop.",
    },
    {
      unit: 2,
      word: "feed",
      meaning: "v. 喂养；饲养",
      exp: "To feed someone means to give them food to eat.",
      example: "She feeds her cat every morning.",
    },
    {
      unit: 2,
      word: "leave",
      meaning: "v. 离开；留下",
      exp: "To leave means to go away from a place, or to put something somewhere.",
      example: "Don't leave your bag on the floor.",
    },
    {
      unit: 2,
      word: "absent",
      meaning: "adj. 缺席的；不在的",
      exp: "Absent means not present or not in a place where you should be.",
      example: "Three students were absent from class today.",
    },
    {
      unit: 2,
      word: "absent from",
      meaning: "缺席；不在",
      exp: "Absent from means not attending or not being in a place.",
      example: "She was absent from school because she was sick.",
    },
    {
      unit: 2,
      word: "shh",
      meaning: "interj. 嘘（用以让别人安静下来）",
      exp: "Shh is a sound you make to ask someone to be quiet.",
      example: "Shh! The baby is sleeping.",
    },
    {
      unit: 2,
      word: "quietly",
      meaning: "adv. 轻声地；安静地",
      exp: "Quietly means making very little noise.",
      example: "Please walk quietly in the library.",
    },
    {
      unit: 2,
      word: "belt",
      meaning: "n. 安全带；腰带；皮带",
      exp: "A belt is a long piece of material you wear around your waist. A seat belt keeps you safe in a car.",
      example: "Always wear your seat belt in the car.",
    },
    {
      unit: 2,
      word: "noise",
      meaning: "n. 声音；噪声",
      exp: "Noise is a loud or unpleasant sound.",
      example: "There was a lot of noise from the street outside.",
    },
    {
      unit: 2,
      word: "unhappy",
      meaning: "adj. 不快乐的",
      exp: "Unhappy means not feeling happy or pleased.",
      example: "She looked unhappy after losing the game.",
    },
    {
      unit: 2,
      word: "make sb's/the bed",
      meaning: "整理床铺；铺床",
      exp: "To make the bed means to arrange the sheets and blankets neatly.",
      example: "I make the bed every morning before breakfast.",
    },
    {
      unit: 2,
      word: "either",
      meaning: "adv. 也（用于否定词组后）",
      exp: "Either is used at the end of a negative sentence to mean also.",
      example: "He doesn't like onions and I don't like them either.",
    },
    {
      unit: 2,
      word: "practise",
      meaning: "v. 训练；练习",
      exp: "To practise means to do something many times to get better at it.",
      example: "You need to practise every day to play the piano well.",
    },
    {
      unit: 2,
      word: "hang",
      meaning: "v. 悬挂",
      exp: "To hang something means to put it somewhere so it stays up off the ground.",
      example: "She hung her coat on the door.",
    },
    {
      unit: 2,
      word: "hang out",
      meaning: "闲逛；常去某处",
      exp: "To hang out means to spend time relaxing in a place with friends.",
      example: "We like to hang out in the park after school.",
    },
    {
      unit: 2,
      word: "weekday",
      meaning: "n. 工作日",
      exp: "A weekday is any day from Monday to Friday that is not the weekend.",
      example: "She goes to school every weekday.",
    },
    {
      unit: 2,
      word: "awful",
      meaning: "adj. 糟糕的；讨厌的",
      exp: "Awful means very bad or unpleasant.",
      example: "The weather was awful — it rained all day.",
    },
    {
      unit: 2,
      word: "become",
      meaning: "v. 变成；成为",
      exp: "To become means to start to be something different.",
      example: "She wants to become a doctor when she grows up.",
    },
    {
      unit: 2,
      word: "better",
      meaning: "adj. 较好的 adv. 较好地",
      exp: "Better means more good than before, or improved.",
      example: "I feel much better after resting.",
    },
    {
      unit: 2,
      word: "person",
      meaning: "n. 人",
      exp: "A person is a human being, a man, woman, or child.",
      example: "Every person in the class has a different favourite colour.",
    },
    {
      unit: 2,
      word: "focus",
      meaning: "v. 集中（注意力、精力等）；聚焦",
      exp: "To focus means to give all your attention to one thing.",
      example: "Please focus on your homework.",
    },
    {
      unit: 2,
      word: "focus on",
      meaning: "集中（注意力、精力等）于",
      exp: "To focus on something means to give all your attention to it.",
      example: "Try to focus on one task at a time.",
    },
    {
      unit: 2,
      word: "build",
      meaning: "v. 创建；建造",
      exp: "To build means to make something by putting parts together.",
      example: "They plan to build a new school near the park.",
    },
    {
      unit: 2,
      word: "spirit",
      meaning: "n. 精神；情绪",
      exp: "Spirit means the feeling of energy and enthusiasm in a group.",
      example: "The team played with great spirit and won the match.",
    },
    {
      unit: 2,
      word: "think about",
      meaning: "思考；考虑",
      exp: "To think about something means to use your mind to consider it.",
      example: "I need to think about which subject to choose.",
    },
    {
      unit: 2,
      word: "relax",
      meaning: "v. 放松；休息",
      exp: "To relax means to rest and feel calm without stress.",
      example: "She likes to relax by reading a book.",
    },
    {
      unit: 2,
      word: "advice",
      meaning: "n. 建议；意见",
      exp: "Advice is what someone tells you to help you decide what to do.",
      example: "She gave me good advice about studying.",
    },
    {
      unit: 2,
      word: "understand",
      meaning: "v. 理解；领会",
      exp: "To understand means to know what something means or how it works.",
      example: "I understand the question now.",
    },
    {
      unit: 2,
      word: "untidy",
      meaning: "adj. 不整洁的",
      exp: "Untidy means not neat, with things in the wrong places.",
      example: "His room was untidy with clothes on the floor.",
    },
    {
      unit: 3,
      word: "fit",
      meaning: "adj. 健康的；健壮的 v. 适合",
      exp: "Fit means healthy and strong. To fit also means to be the right size.",
      example: "She keeps fit by running every day.",
    },
    {
      unit: 3,
      word: "baseball",
      meaning: "n. 棒球（运动）",
      exp: "Baseball is a team sport played with a bat and a small ball.",
      example: "He plays baseball every weekend with his school team.",
    },
    {
      unit: 3,
      word: "glove",
      meaning: "n.（手指分开的）手套",
      exp: "A glove is a piece of clothing you wear on your hand to protect it or keep it warm.",
      example: "She wore a baseball glove to catch the ball.",
    },
    {
      unit: 3,
      word: "mat",
      meaning: "n.（运动用的）垫子",
      exp: "A mat is a flat piece of material placed on the floor, used for exercise or wiping feet.",
      example: "We did exercises on the mat in the gym.",
    },
    {
      unit: 3,
      word: "rope",
      meaning: "n. 绳子；粗绳",
      exp: "A rope is a thick, strong string made of twisted fibres.",
      example: "She used a rope to tie the boat to the dock.",
    },
    {
      unit: 3,
      word: "jump rope",
      meaning: "跳绳用的绳子；跳绳（运动）",
      exp: "A jump rope is a rope that you swing over your head and under your feet as you jump.",
      example: "She can jump rope very fast without stopping.",
    },
    {
      unit: 3,
      word: "racket",
      meaning: "n.（网球、羽毛球等的）球拍",
      exp: "A racket is a piece of sports equipment with a long handle and strings, used to hit a ball.",
      example: "He bought a new tennis racket at the sports shop.",
    },
    {
      unit: 3,
      word: "hardly",
      meaning: "adv. 几乎不；几乎没有",
      exp: "Hardly means almost not at all, or very little.",
      example: "I was so tired I could hardly keep my eyes open.",
    },
    {
      unit: 3,
      word: "ever",
      meaning: "adv. 在任何时候；从来；曾经",
      exp: "Ever means at any time, used in questions and negative sentences.",
      example: "Have you ever visited Beijing?",
    },
    {
      unit: 3,
      word: "hardly ever",
      meaning: "几乎从不",
      exp: "Hardly ever means almost never.",
      example: "She hardly ever eats fast food — she prefers home cooking.",
    },
    {
      unit: 3,
      word: "once",
      meaning: "adv. 一次；曾经 conj. 一旦",
      exp: "Once means one time, or at some time in the past.",
      example: "I go swimming once a week.",
    },
    {
      unit: 3,
      word: "twice",
      meaning: "adv. 两次；两倍",
      exp: "Twice means two times.",
      example: "I brush my teeth twice a day.",
    },
    {
      unit: 3,
      word: "mine",
      meaning: "pron. 我的（所有物）",
      exp: "Mine means something that belongs to me.",
      example: "That blue pen is mine, not yours.",
    },
    {
      unit: 3,
      word: "hers",
      meaning: "pron. 她的（所有物）",
      exp: "Hers means something that belongs to her.",
      example: "The red bag is hers.",
    },
    {
      unit: 3,
      word: "maybe",
      meaning: "adv. 也许；大概",
      exp: "Maybe means perhaps or possibly.",
      example: "Maybe we can go to the park tomorrow if the weather is good.",
    },
    {
      unit: 3,
      word: "well-used",
      meaning: "adj. 使用得多的",
      exp: "Well-used means something has been used many times and shows it.",
      example: "His well-used football boots were dirty but he loved them.",
    },
    {
      unit: 3,
      word: "practice",
      meaning: "n. 练习；实践",
      exp: "Practice means doing something many times to get better at it.",
      example: "Daily practice will help you improve your English.",
    },
    {
      unit: 3,
      word: "perfect",
      meaning: "adj. 完美的；极好的",
      exp: "Perfect means the best possible, with no mistakes.",
      example: "She got a perfect score on her maths test.",
    },
    {
      unit: 3,
      word: "seldom",
      meaning: "adv. 很少；不常",
      exp: "Seldom means not often, very rarely.",
      example: "He seldom watches TV because he prefers reading.",
    },
    {
      unit: 3,
      word: "badminton",
      meaning: "n. 羽毛球运动",
      exp: "Badminton is a sport where players hit a small feathered object over a net using rackets.",
      example: "We played badminton in the gym after school.",
    },
    {
      unit: 3,
      word: "double",
      meaning: "n. 双打 adj. 成双的；两倍的",
      exp: "Double means two of the same thing, or twice as much.",
      example: "We need a double room — two beds please.",
    },
    {
      unit: 3,
      word: "sometime",
      meaning: "adv. 在某个时候",
      exp: "Sometime means at an unknown or unspecified time.",
      example: "Let's meet up sometime next week.",
    },
    {
      unit: 3,
      word: "volleyball",
      meaning: "n. 排球（运动）",
      exp: "Volleyball is a team sport where players hit a ball over a high net.",
      example: "Our school team plays volleyball every Tuesday.",
    },
    {
      unit: 3,
      word: "theirs",
      meaning: "pron. 他们的，她们的，它们的（所有物）",
      exp: "Theirs means something belonging to them.",
      example: "The two dogs in the garden are theirs.",
    },
    {
      unit: 3,
      word: "jog",
      meaning: "v. 慢跑",
      exp: "To jog means to run at a slow, steady speed for exercise.",
      example: "He jogs around the park every morning.",
    },
    {
      unit: 3,
      word: "few",
      meaning: "adj.（表示否定的）很少的；几乎没有的",
      exp: "Few means not many, a small number of something.",
      example: "There are few students in the classroom today.",
    },
    {
      unit: 3,
      word: "a few",
      meaning: "少数；几个",
      exp: "A few means a small number of things or people.",
      example: "I have a few books to read this holiday.",
    },
    {
      unit: 3,
      word: "excuse",
      meaning: "v. 原谅；宽恕",
      exp: "To excuse someone means to forgive them for a small mistake.",
      example: "Please excuse me — I didn't mean to bump into you.",
    },
    {
      unit: 3,
      word: "excuse me",
      meaning: "劳驾；请原谅",
      exp: "Excuse me is what you say to politely get someone's attention or say sorry.",
      example: "Excuse me, can you tell me where the library is?",
    },
    {
      unit: 3,
      word: "over there",
      meaning: "在那边",
      exp: "Over there means in that place, a short distance away.",
      example: "The school is over there on the left.",
    },
    {
      unit: 3,
      word: "just",
      meaning: "adv. 只是；正好",
      exp: "Just means only, or exactly, or very recently.",
      example: "I just finished my homework.",
    },
    {
      unit: 3,
      word: "T-shirt",
      meaning: "n. T恤衫",
      exp: "A T-shirt is a simple top without buttons, usually with short sleeves.",
      example: "She wore a white T-shirt and blue jeans.",
    },
    {
      unit: 3,
      word: "belong",
      meaning: "v. 应在（某处）",
      exp: "To belong means to be in the right place, or to be owned by someone.",
      example: "This book belongs to the school library.",
    },
    {
      unit: 3,
      word: "belong to",
      meaning: "属于（某人）",
      exp: "Belong to means to be owned by someone.",
      example: "The blue bicycle belongs to my sister.",
    },
    {
      unit: 3,
      word: "working",
      meaning: "adj. 工作的",
      exp: "Working means operating or being used. A working day is a regular day of work.",
      example: "Is the coffee machine working today?",
    },
    {
      unit: 3,
      word: "working day",
      meaning: "工作日",
      exp: "A working day is a day when people go to work, usually Monday to Friday.",
      example: "There are five working days in a week.",
    },
    {
      unit: 3,
      word: "full of",
      meaning: "有许多；充满",
      exp: "Full of means containing a lot of something.",
      example: "The bag is full of apples from the garden.",
    },
    {
      unit: 3,
      word: "energy",
      meaning: "n. 精力；能量",
      exp: "Energy is the power that makes you able to move and do things.",
      example: "Children have lots of energy to run and play.",
    },
    {
      unit: 3,
      word: "group",
      meaning: "n. 组；群",
      exp: "A group is a number of people or things that are together.",
      example: "We worked in a group of four for the project.",
    },
    {
      unit: 3,
      word: "skateboard",
      meaning: "n. 滑板",
      exp: "A skateboard is a flat board with wheels that you stand on and ride.",
      example: "He does tricks on his skateboard in the park.",
    },
    {
      unit: 3,
      word: "encourage",
      meaning: "v. 鼓励；激励",
      exp: "To encourage someone means to give them confidence and support.",
      example: "Her teacher encouraged her to enter the art competition.",
    },
    {
      unit: 3,
      word: "trick",
      meaning: "n. 技巧；戏法",
      exp: "A trick is a clever or difficult action that someone performs.",
      example: "The skateboarder did an amazing trick at the competition.",
    },
    {
      unit: 3,
      word: "succeed",
      meaning: "v. 成功；达到目标",
      exp: "To succeed means to do what you were trying to do.",
      example: "If you work hard, you will succeed.",
    },
    {
      unit: 3,
      word: "skateboarding",
      meaning: "n. 滑板运动",
      exp: "Skateboarding is the sport or hobby of riding on a skateboard.",
      example: "He spends his weekends skateboarding with his friends.",
    },
    {
      unit: 3,
      word: "goal",
      meaning: "n. 目标；目的",
      exp: "A goal is something you want to achieve. In sport, a goal is when you score a point.",
      example: "My goal is to read ten books this summer.",
    },
    {
      unit: 3,
      word: "sit-up",
      meaning: "n. 仰卧起坐",
      exp: "A sit-up is an exercise where you lie down and raise your body up with your stomach muscles.",
      example: "She did thirty sit-ups every morning.",
    },
    {
      unit: 3,
      word: "work out",
      meaning: "锻炼",
      exp: "To work out means to do physical exercise to keep fit.",
      example: "He works out at the gym three times a week.",
    },
    {
      unit: 3,
      word: "app",
      meaning: "n. 应用程序",
      exp: "An app is a program on a phone or computer that does a specific job.",
      example: "I use a language learning app every day.",
    },
    {
      unit: 3,
      word: "progress",
      meaning: "n. 进步；进展",
      exp: "Progress means moving forward and getting better at something.",
      example: "She has made great progress in her English studies.",
    },
    {
      unit: 3,
      word: "match",
      meaning: "n. 比赛；竞赛",
      exp: "A match is a game or competition between two teams or players.",
      example: "We won the basketball match by five points.",
    },
    {
      unit: 3,
      word: "team",
      meaning: "n. 队；组",
      exp: "A team is a group of people who work or play together.",
      example: "Our class team won the first prize in the competition.",
    },
    {
      unit: 3,
      word: "ours",
      meaning: "pron. 我们的（所有物）",
      exp: "Ours means something that belongs to us.",
      example: "The house on the corner is ours.",
    },
    {
      unit: 3,
      word: "lose",
      meaning: "v. 输掉；丢失",
      exp: "To lose means to not win, or to not be able to find something.",
      example: "We tried hard but still lost the game.",
    },
    {
      unit: 3,
      word: "teenager",
      meaning: "n. 青少年",
      exp: "A teenager is a person between the ages of thirteen and nineteen.",
      example: "She is a teenager who loves music and sports.",
    },
    {
      unit: 4,
      word: "watermelon",
      meaning: "n. 西瓜",
      exp: "A watermelon is a large green fruit with red flesh and black seeds inside.",
      example: "We ate cold watermelon on the hot summer day.",
    },
    {
      unit: 4,
      word: "cabbage",
      meaning: "n. 卷心菜",
      exp: "Cabbage is a round vegetable with green or purple leaves.",
      example: "My mum makes soup with cabbage and potatoes.",
    },
    {
      unit: 4,
      word: "mutton",
      meaning: "n. 羊肉",
      exp: "Mutton is the meat from a sheep.",
      example: "The hot pot restaurant serves delicious mutton.",
    },
    {
      unit: 4,
      word: "cookie",
      meaning: "n. 曲奇饼",
      exp: "A cookie is a small, flat sweet biscuit.",
      example: "She baked chocolate chip cookies for the class.",
    },
    {
      unit: 4,
      word: "onion",
      meaning: "n. 洋葱；葱头",
      exp: "An onion is a round vegetable with a strong smell and taste.",
      example: "He cut the onion and his eyes started to water.",
    },
    {
      unit: 4,
      word: "dumpling",
      meaning: "n. 饺子",
      exp: "A dumpling is a small piece of dough filled with meat or vegetables, then cooked.",
      example: "We eat dumplings during the Spring Festival.",
    },
    {
      unit: 4,
      word: "coffee",
      meaning: "n. 咖啡",
      exp: "Coffee is a hot dark drink made from roasted coffee beans.",
      example: "My parents drink coffee every morning.",
    },
    {
      unit: 4,
      word: "bean",
      meaning: "n. 豆",
      exp: "A bean is a seed from certain plants that we eat as a vegetable.",
      example: "I added some beans to the vegetable soup.",
    },
    {
      unit: 4,
      word: "chip",
      meaning: "n. 炸薯条",
      exp: "A chip is a thin slice of potato that is fried until crispy.",
      example: "We ordered fish and chips at the restaurant.",
    },
    {
      unit: 4,
      word: "fish and chips",
      meaning: "炸鱼薯条",
      exp: "Fish and chips is a popular British dish of fried fish and fried potato chips.",
      example: "Fish and chips is a very popular dish in Britain.",
    },
    {
      unit: 4,
      word: "salad",
      meaning: "n. 沙拉；色拉",
      exp: "A salad is a cold dish made of vegetables, often with dressing.",
      example: "She made a fresh salad with tomatoes and lettuce.",
    },
    {
      unit: 4,
      word: "porridge",
      meaning: "n. 粥；麦片粥",
      exp: "Porridge is a hot food made by cooking oats in water or milk.",
      example: "He eats porridge for breakfast every morning.",
    },
    {
      unit: 4,
      word: "waiter",
      meaning: "n.（男）服务员",
      exp: "A waiter is a man who brings food and drinks to customers in a restaurant.",
      example: "The waiter brought our food quickly.",
    },
    {
      unit: 4,
      word: "What about ...?",
      meaning: "……怎么样？",
      exp: "What about ...? is used to ask for someone's opinion or suggest something.",
      example: "What about going to the cinema this evening?",
    },
    {
      unit: 4,
      word: "taste",
      meaning: "v. 有……味道；尝 n. 味道",
      exp: "Taste is the feeling you get from food in your mouth. To taste means to try food.",
      example: "This soup tastes very good.",
    },
    {
      unit: 4,
      word: "anything",
      meaning: "pron. 某事物；任何事物",
      exp: "Anything means any thing at all, used in questions and negative sentences.",
      example: "Is there anything I can help you with?",
    },
    {
      unit: 4,
      word: "dish",
      meaning: "n. 一道菜；盘子",
      exp: "A dish is a type of food prepared in a particular way, or a plate for serving food.",
      example: "Peking duck is my favourite Chinese dish.",
    },
    {
      unit: 4,
      word: "choice",
      meaning: "n. 选择",
      exp: "A choice is when you pick one thing from two or more options.",
      example: "She had to make a choice between science and art.",
    },
    {
      unit: 4,
      word: "meal",
      meaning: "n. 一餐所吃的食物；一餐",
      exp: "A meal is the food you eat at a particular time, like breakfast, lunch, or dinner.",
      example: "Dinner is my favourite meal of the day.",
    },
    {
      unit: 4,
      word: "pork",
      meaning: "n. 猪肉",
      exp: "Pork is the meat from a pig.",
      example: "She made a delicious dish of pork and vegetables.",
    },
    {
      unit: 4,
      word: "strawberry",
      meaning: "n. 草莓",
      exp: "A strawberry is a small, sweet, red fruit.",
      example: "I love eating strawberries with cream.",
    },
    {
      unit: 4,
      word: "menu",
      meaning: "n. 菜单",
      exp: "A menu is a list of food and drinks you can order in a restaurant.",
      example: "The waiter gave us the menu to look at.",
    },
    {
      unit: 4,
      word: "customer",
      meaning: "n. 顾客",
      exp: "A customer is a person who buys something from a shop or restaurant.",
      example: "The waiter welcomed each customer with a smile.",
    },
    {
      unit: 4,
      word: "serve",
      meaning: "v. 提供；服务",
      exp: "To serve means to give food or drinks to someone, or to help customers.",
      example: "The waiter served the soup first.",
    },
    {
      unit: 4,
      word: "waitress",
      meaning: "n. 女服务员",
      exp: "A waitress is a woman who brings food and drinks to customers in a restaurant.",
      example: "The waitress asked us what we would like to eat.",
    },
    {
      unit: 4,
      word: "sir",
      meaning: "n. 先生",
      exp: "Sir is a polite way to speak to a man whose name you do not know.",
      example: "Excuse me, sir, would you like a table by the window?",
    },
    {
      unit: 4,
      word: "go with",
      meaning: "搭配；相配",
      exp: "Go with means to match or suit something.",
      example: "This sauce goes well with noodles.",
    },
    {
      unit: 4,
      word: "instead",
      meaning: "adv. 反而；代替",
      exp: "Instead means in place of something else.",
      example: "She did not want rice, so she had noodles instead.",
    },
    {
      unit: 4,
      word: "pear",
      meaning: "n. 梨",
      exp: "A pear is a green or yellow fruit that is soft and sweet.",
      example: "She put a pear in her lunchbox.",
    },
    {
      unit: 4,
      word: "too much",
      meaning: "太多",
      exp: "Too much means more than you need or want.",
      example: "Don't eat too much sugar — it is bad for your teeth.",
    },
    {
      unit: 4,
      word: "sugar",
      meaning: "n. 糖",
      exp: "Sugar is a sweet white substance used in food and drinks.",
      example: "He put two spoons of sugar in his tea.",
    },
    {
      unit: 4,
      word: "improve",
      meaning: "v. 改进；改善",
      exp: "To improve means to get better or to make something better.",
      example: "She practises every day to improve her singing.",
    },
    {
      unit: 4,
      word: "habit",
      meaning: "n. 习惯",
      exp: "A habit is something you do often and regularly, almost without thinking.",
      example: "Brushing your teeth twice a day is a good habit.",
    },
    {
      unit: 4,
      word: "fast food",
      meaning: "快餐",
      exp: "Fast food is food that is made and served very quickly, like burgers or chips.",
      example: "Fast food is tasty but not very healthy.",
    },
    {
      unit: 4,
      word: "salt",
      meaning: "n. 盐",
      exp: "Salt is a white powder used to add flavour to food.",
      example: "She added a pinch of salt to the soup.",
    },
    {
      unit: 4,
      word: "fat",
      meaning: "n. 脂肪 adj. 肥胖的",
      exp: "Fat is the oily substance in food. Fat also means having too much weight on the body.",
      example: "Too much fat in your food is bad for your heart.",
    },
    {
      unit: 4,
      word: "put on",
      meaning: "增加；穿上",
      exp: "Put on weight means to become heavier. Put on also means to wear something.",
      example: "He put on his coat before going outside.",
    },
    {
      unit: 4,
      word: "weight",
      meaning: "n. 体重；重量",
      exp: "Weight is how heavy someone or something is.",
      example: "The doctor checked her weight at the hospital.",
    },
    {
      unit: 4,
      word: "hamburger",
      meaning: "n. 汉堡包",
      exp: "A hamburger is a round bread roll with a piece of cooked beef inside.",
      example: "He ordered a hamburger and chips for lunch.",
    },
    {
      unit: 4,
      word: "cause",
      meaning: "v. 造成；导致",
      exp: "To cause something means to make it happen.",
      example: "Eating too much sugar can cause tooth problems.",
    },
    {
      unit: 4,
      word: "heart",
      meaning: "n. 心脏；中心",
      exp: "Your heart is the organ in your chest that pumps blood around your body.",
      example: "Exercise is good for your heart.",
    },
    {
      unit: 4,
      word: "balanced",
      meaning: "adj. 均衡的；平衡的",
      exp: "Balanced means having the right amount of different things.",
      example: "A balanced diet includes vegetables, fruit, and protein.",
    },
    {
      unit: 4,
      word: "too … to",
      meaning: "太……以至于不能",
      exp: "Too ... to means so much of something that you cannot do the next thing.",
      example: "She was too tired to do her homework.",
    },
    {
      unit: 4,
      word: "sleepy",
      meaning: "adj. 困倦的；想睡的",
      exp: "Sleepy means feeling like you want to sleep.",
      example: "He felt sleepy after eating a big lunch.",
    },
    {
      unit: 4,
      word: "after all",
      meaning: "毕竟；终归",
      exp: "After all means despite what you thought before, or when reminding someone of a fact.",
      example: "Let's be kind — after all, she is our friend.",
    },
    {
      unit: 4,
      word: "away",
      meaning: "adv. 离开；在别处",
      exp: "Away means not here, or to a different place.",
      example: "She is away on holiday this week.",
    },
    {
      unit: 4,
      word: "poor",
      meaning: "adj. 不好的；贫穷的；可怜的",
      exp: "Poor means having very little money, or of bad quality.",
      example: "The poor boy had no shoes on his feet.",
    },
    {
      unit: 4,
      word: "result",
      meaning: "n. 后果；结果",
      exp: "A result is what happens because of something, or a score.",
      example: "She was happy with her exam result.",
    },
    {
      unit: 4,
      word: "article",
      meaning: "n. 文章；冠词",
      exp: "An article is a piece of writing in a newspaper or magazine.",
      example: "I read an interesting article about animals.",
    },
    {
      unit: 4,
      word: "common",
      meaning: "adj. 共同的；普遍的",
      exp: "Common means happening often, or shared by everyone.",
      example: "Colds are a common illness in winter.",
    },
    {
      unit: 4,
      word: "among",
      meaning: "prep. 在……中；……之一",
      exp: "Among means in the middle of a group of things or people.",
      example: "She found her book among the pile of papers.",
    },
    {
      unit: 4,
      word: "soft",
      meaning: "adj. 柔和的；柔软的",
      exp: "Soft means not hard, or quiet and gentle.",
      example: "The cat has very soft fur.",
    },
    {
      unit: 4,
      word: "soft drink",
      meaning: "软饮料（不含酒精）",
      exp: "A soft drink is a cold, sweet drink with bubbles that has no alcohol.",
      example: "He ordered a soft drink with his meal.",
    },
    {
      unit: 4,
      word: "enough",
      meaning: "adj. 足够的；充足的 adv. 足够地",
      exp: "Enough means as much as you need, not too much and not too little.",
      example: "Have you eaten enough food?",
    },
    {
      unit: 4,
      word: "thirsty",
      meaning: "adj. 渴的",
      exp: "Thirsty means feeling like you need to drink something.",
      example: "I felt thirsty after running in the sun.",
    },
    {
      unit: 5,
      word: "right now",
      meaning: "现在；立刻",
      exp: "Right now means at this exact moment.",
      example: "I am doing my homework right now.",
    },
    {
      unit: 5,
      word: "ride",
      meaning: "v. 骑 n. 旅程",
      exp: "To ride means to sit on something and travel, like a bike or horse.",
      example: "She rides her bike to school every day.",
    },
    {
      unit: 5,
      word: "moment",
      meaning: "n. 某个时刻；片刻；瞬间",
      exp: "A moment is a very short period of time.",
      example: "Wait a moment — I will be ready soon.",
    },
    {
      unit: 5,
      word: "at the moment",
      meaning: "现在；此刻",
      exp: "At the moment means right now, at this time.",
      example: "She is not here at the moment — she went shopping.",
    },
    {
      unit: 5,
      word: "work on",
      meaning: "做；从事",
      exp: "To work on something means to spend time doing or improving it.",
      example: "He is working on his science project.",
    },
    {
      unit: 5,
      word: "dragon",
      meaning: "n. 龙",
      exp: "A dragon is an imaginary creature in stories that breathes fire.",
      example: "In Chinese culture, the dragon is a symbol of good luck.",
    },
    {
      unit: 5,
      word: "festival",
      meaning: "n. 节日",
      exp: "A festival is a special time when people celebrate something.",
      example: "The Spring Festival is the most important festival in China.",
    },
    {
      unit: 5,
      word: "hold",
      meaning: "v. 拿着；抓住",
      exp: "To hold something means to keep it in your hand. Hold on means wait.",
      example: "She held the baby carefully in her arms.",
    },
    {
      unit: 5,
      word: "hold on",
      meaning: "别挂断电话；等一等",
      exp: "Hold on means wait for a moment, or do not hang up the phone.",
      example: "Hold on, I need to find my keys.",
    },
    {
      unit: 5,
      word: "voice",
      meaning: "n. 嗓音；声音",
      exp: "Your voice is the sound you make when you speak or sing.",
      example: "She has a beautiful voice when she sings.",
    },
    {
      unit: 5,
      word: "race",
      meaning: "n. 比赛；竞赛",
      exp: "A race is a competition to see who is fastest.",
      example: "He won the race by running faster than everyone.",
    },
    {
      unit: 5,
      word: "darling",
      meaning: "n. 亲爱的；宝贝",
      exp: "Darling is a word used to show love to someone close to you.",
      example: "Come here, darling — I have a surprise for you.",
    },
    {
      unit: 5,
      word: "somebody",
      meaning: "pron. 某人；有人",
      exp: "Somebody means a person, but you do not know who.",
      example: "Somebody left a bag in the classroom.",
    },
    {
      unit: 5,
      word: "could",
      meaning: "modal v. 能；可以",
      exp: "Could is used to say something was possible, or to ask politely.",
      example: "Could you help me carry this bag?",
    },
    {
      unit: 5,
      word: "message",
      meaning: "n. 消息；信息",
      exp: "A message is a piece of information sent to someone.",
      example: "She left a message for her teacher.",
    },
    {
      unit: 5,
      word: "take a message",
      meaning: "捎个口信",
      exp: "To take a message means to write down information for someone who is not there.",
      example: "He is not in — shall I take a message?",
    },
    {
      unit: 5,
      word: "leave a message",
      meaning: "留个口信",
      exp: "To leave a message means to give information to someone for another person.",
      example: "Please leave a message and she will call you back.",
    },
    {
      unit: 5,
      word: "call back",
      meaning: "回电话",
      exp: "To call back means to phone someone again after they called you.",
      example: "I missed his call so I called back later.",
    },
    {
      unit: 5,
      word: "kick",
      meaning: "v. 踢；踹",
      exp: "To kick means to hit something with your foot.",
      example: "He kicked the football into the goal.",
    },
    {
      unit: 5,
      word: "wow",
      meaning: "interj. 哇；呀",
      exp: "Wow is something you say when you are very surprised or impressed.",
      example: "Wow! That is a beautiful painting!",
    },
    {
      unit: 5,
      word: "online",
      meaning: "adj. 在线的",
      exp: "Online means connected to the internet or available on the internet.",
      example: "She does her shopping online.",
    },
    {
      unit: 5,
      word: "shuttlecock",
      meaning: "n. 羽毛球",
      exp: "A shuttlecock is the small feathered object used in badminton.",
      example: "He hit the shuttlecock over the net.",
    },
    {
      unit: 5,
      word: "sight",
      meaning: "n. 名胜；风景；视力",
      exp: "A sight is a beautiful or interesting place worth seeing.",
      example: "The Great Wall is one of the most famous sights in the world.",
    },
    {
      unit: 5,
      word: "exam",
      meaning: "n. 考试",
      exp: "An exam is a test to see how much you know about a subject.",
      example: "She studied hard for her maths exam.",
    },
    {
      unit: 5,
      word: "hope",
      meaning: "v. & n. 希望",
      exp: "Hope means to wish that something good will happen.",
      example: "I hope the weather will be sunny tomorrow.",
    },
    {
      unit: 5,
      word: "forward",
      meaning: "adv. 向前",
      exp: "Forward means in the direction ahead of you.",
      example: "She moved forward to the front of the queue.",
    },
    {
      unit: 5,
      word: "look forward to",
      meaning: "盼望",
      exp: "To look forward to something means to feel excited and happy about it coming.",
      example: "I look forward to my summer holiday.",
    },
    {
      unit: 5,
      word: "skate",
      meaning: "v. 滑冰",
      exp: "To skate means to glide on ice or a smooth surface wearing special boots or wheels.",
      example: "They skate on the frozen lake in winter.",
    },
    {
      unit: 5,
      word: "happen",
      meaning: "v. 发生",
      exp: "To happen means to take place or occur.",
      example: "What happened to your bike?",
    },
    {
      unit: 5,
      word: "zone",
      meaning: "n. 地区；地带；区域",
      exp: "A zone is a particular area where a specific rule or activity applies.",
      example: "This is a no-parking zone.",
    },
    {
      unit: 5,
      word: "time zone",
      meaning: "时区",
      exp: "A time zone is a region of the world that uses the same time.",
      example: "Beijing and London are in different time zones.",
    },
    {
      unit: 5,
      word: "around the world",
      meaning: "世界各地",
      exp: "Around the world means in all parts of the world.",
      example: "People around the world celebrate New Year differently.",
    },
    {
      unit: 5,
      word: "rush",
      meaning: "v. & n. 冲；奔",
      exp: "To rush means to move or do something very quickly.",
      example: "She rushed to school so she would not be late.",
    },
    {
      unit: 5,
      word: "in a hurry",
      meaning: "匆忙",
      exp: "In a hurry means needing to do something quickly because you have little time.",
      example: "He ate his breakfast fast because he was in a hurry.",
    },
    {
      unit: 5,
      word: "shine",
      meaning: "v. 发光；照耀 n. 光亮",
      exp: "To shine means to produce bright light.",
      example: "The sun shines brightly on a clear day.",
    },
    {
      unit: 5,
      word: "brightly",
      meaning: "adv. 明亮地",
      exp: "Brightly means with a lot of light or colour.",
      example: "The stars shone brightly in the night sky.",
    },
    {
      unit: 5,
      word: "colourful",
      meaning: "adj. 色彩鲜艳的",
      exp: "Colourful means having many bright colours.",
      example: "She wore a colourful dress to the party.",
    },
    {
      unit: 5,
      word: "slowly",
      meaning: "adv. 缓慢地",
      exp: "Slowly means not fast, taking more time than usual.",
      example: "The old man walked slowly up the hill.",
    },
    {
      unit: 5,
      word: "such",
      meaning: "adj. 这样的；那样的 pron. 这样(那样)的人或事物",
      exp: "Such means of that kind, or used to make something stronger.",
      example: "I have never seen such a beautiful sunset.",
    },
    {
      unit: 5,
      word: "such as",
      meaning: "例如",
      exp: "Such as means for example.",
      example: "I like fruit such as apples, oranges, and bananas.",
    },
    {
      unit: 5,
      word: "painting",
      meaning: "n. 绘画作品；绘画；油画",
      exp: "A painting is a picture made with paint.",
      example: "She bought a beautiful painting for her bedroom wall.",
    },
    {
      unit: 5,
      word: "market",
      meaning: "n. 市场",
      exp: "A market is a place where people buy and sell things.",
      example: "We bought fresh vegetables at the market.",
    },
    {
      unit: 5,
      word: "side",
      meaning: "n. 边；侧",
      exp: "A side is one of the flat surfaces of an object, or one of two parts.",
      example: "She sat on the left side of the classroom.",
    },
    {
      unit: 5,
      word: "side by side",
      meaning: "并排；并肩地",
      exp: "Side by side means next to each other.",
      example: "The two friends walked side by side down the street.",
    },
    {
      unit: 5,
      word: "subway",
      meaning: "n. 地铁",
      exp: "A subway is an underground railway in a city.",
      example: "We took the subway to get to the shopping centre.",
    },
    {
      unit: 5,
      word: "bright",
      meaning: "adj. 鲜艳的；明亮的；聪明的",
      exp: "Bright means full of light, or very clever.",
      example: "She is a bright student who learns quickly.",
    },
    {
      unit: 5,
      word: "drop",
      meaning: "v. 把……送至；落下 n. 滴；下降",
      exp: "To drop something means to let it fall. Drop off means to take someone somewhere.",
      example: "He dropped his phone on the floor.",
    },
    {
      unit: 5,
      word: "drop off",
      meaning: "（开车）把某人送到某处",
      exp: "To drop off means to take someone to a place by car and leave them there.",
      example: "Dad dropped me off at school this morning.",
    },
    {
      unit: 5,
      word: "passenger",
      meaning: "n. 乘客",
      exp: "A passenger is a person who travels in a car, bus, train, or plane but does not drive.",
      example: "All passengers must wear their seat belts.",
    },
    {
      unit: 5,
      word: "central",
      meaning: "adj. 中心的；中央的",
      exp: "Central means in the middle of an area, or the most important.",
      example: "The hotel is in a central location, near the shops.",
    },
    {
      unit: 5,
      word: "explain",
      meaning: "v. 解释；说明",
      exp: "To explain means to make something clear by giving information.",
      example: "The teacher explained how to solve the problem.",
    },
    {
      unit: 5,
      word: "take part in",
      meaning: "参加",
      exp: "To take part in something means to join in an activity or event.",
      example: "She wants to take part in the school play.",
    },
    {
      unit: 5,
      word: "tour",
      meaning: "n. & v. 旅行；旅游",
      exp: "A tour is a journey to visit different interesting places.",
      example: "We went on a tour of the old city centre.",
    },
    {
      unit: 5,
      word: "sunshine",
      meaning: "n. 阳光",
      exp: "Sunshine is the light and warmth from the sun.",
      example: "We had a picnic in the warm sunshine.",
    },
    {
      unit: 5,
      word: "drive",
      meaning: "v. 开车；驾驶",
      exp: "To drive means to control and move a vehicle.",
      example: "My dad drives me to school on rainy days.",
    },
    {
      unit: 5,
      word: "rush hour",
      meaning: "交通高峰期",
      exp: "Rush hour is the busy time of day when many people travel to or from work.",
      example: "The roads are very busy during rush hour.",
    },
    {
      unit: 6,
      word: "rain or shine",
      meaning: "不论是雨或是晴；不管发生什么事",
      exp: "Rain or shine means no matter what the weather is.",
      example: "We will have the picnic rain or shine.",
    },
    {
      unit: 6,
      word: "affect",
      meaning: "v. 影响",
      exp: "To affect something means to have an influence on it and change it.",
      example: "Bad weather can affect your mood.",
    },
    {
      unit: 6,
      word: "dry",
      meaning: "adj. 干的；干旱的",
      exp: "Dry means without water or rain.",
      example: "It has been a very dry summer with no rain.",
    },
    {
      unit: 6,
      word: "lightning",
      meaning: "n. 闪电",
      exp: "Lightning is the flash of bright light in the sky during a storm.",
      example: "We saw lightning in the dark clouds before the storm.",
    },
    {
      unit: 6,
      word: "stormy",
      meaning: "adj. 有暴风雨（或暴风雪）的",
      exp: "Stormy means having strong wind and heavy rain.",
      example: "It was a dark and stormy night.",
    },
    {
      unit: 6,
      word: "north",
      meaning: "n. 北部；北；北方",
      exp: "North is the direction towards the North Pole, opposite to south.",
      example: "The wind was blowing from the north.",
    },
    {
      unit: 6,
      word: "west",
      meaning: "n. 西部；西；西方",
      exp: "West is the direction where the sun sets in the evening.",
      example: "They drove west towards the mountains.",
    },
    {
      unit: 6,
      word: "south",
      meaning: "n. 南部；南；南方",
      exp: "South is the direction opposite to north.",
      example: "Many birds fly south for the winter.",
    },
    {
      unit: 6,
      word: "east",
      meaning: "n. 东部；东；东方",
      exp: "East is the direction where the sun rises in the morning.",
      example: "She lives to the east of the city.",
    },
    {
      unit: 6,
      word: "stay in",
      meaning: "待在家里；没有外出",
      exp: "Stay in means to remain at home instead of going out.",
      example: "It was raining, so we decided to stay in.",
    },
    {
      unit: 6,
      word: "lucky",
      meaning: "adj. 运气好的；带来好运的",
      exp: "Lucky means having good luck, with good things happening to you.",
      example: "She was lucky to find her lost keys.",
    },
    {
      unit: 6,
      word: "lucky you",
      meaning: "你真幸运",
      exp: "Lucky you is what you say to someone who has had good fortune.",
      example: "You won first prize? Lucky you!",
    },
    {
      unit: 6,
      word: "sunbathe",
      meaning: "v. 沐日光浴；晒太阳",
      exp: "To sunbathe means to sit or lie in the sunshine to get a tan.",
      example: "They went to the beach to sunbathe.",
    },
    {
      unit: 6,
      word: "some day",
      meaning: "将来；有朝一日",
      exp: "Some day means at an unknown time in the future.",
      example: "Some day I would like to travel around the world.",
    },
    {
      unit: 6,
      word: "temperature",
      meaning: "n. 温度",
      exp: "Temperature is a measure of how hot or cold something is.",
      example: "The temperature today is thirty degrees.",
    },
    {
      unit: 6,
      word: "snowman",
      meaning: "n. 雪人",
      exp: "A snowman is a figure made of snow shaped to look like a person.",
      example: "The children built a snowman in the garden.",
    },
    {
      unit: 6,
      word: "heavily",
      meaning: "adv. 大量地；沉重地",
      exp: "Heavily means a great amount or to a large degree.",
      example: "It rained heavily all night.",
    },
    {
      unit: 6,
      word: "snowy",
      meaning: "adj. 下雪的；雪白的",
      exp: "Snowy means covered in snow or with snow falling.",
      example: "We played outside on a snowy day.",
    },
    {
      unit: 6,
      word: "beach volleyball",
      meaning: "沙滩排球",
      exp: "Beach volleyball is a game played on sand where players hit a ball over a net.",
      example: "They played beach volleyball on holiday.",
    },
    {
      unit: 6,
      word: "high",
      meaning: "adv. & adj. 高",
      exp: "High means far above the ground or at a great level.",
      example: "The mountain is very high — it is hard to climb.",
    },
    {
      unit: 6,
      word: "freezing",
      meaning: "adj. 极冷的；冰冻的",
      exp: "Freezing means extremely cold.",
      example: "It was freezing outside, so I wore my warmest coat.",
    },
    {
      unit: 6,
      word: "tourist",
      meaning: "n. 旅行者；观光客",
      exp: "A tourist is a person who visits a place on holiday.",
      example: "Many tourists visit the Great Wall every year.",
    },
    {
      unit: 6,
      word: "mount",
      meaning: "n. 山；山峰",
      exp: "Mount means a mountain or high hill, often used in names.",
      example: "Mount Tai is one of the most famous mountains in China.",
    },
    {
      unit: 6,
      word: "cloud",
      meaning: "n. 云；云彩",
      exp: "A cloud is a white or grey mass in the sky made of tiny water drops.",
      example: "The clouds covered the sun and it became cooler.",
    },
    {
      unit: 6,
      word: "feel like",
      meaning: "感觉像",
      exp: "Feel like means to want to do something or to seem like something.",
      example: "I feel like eating something sweet.",
    },
    {
      unit: 6,
      word: "magical",
      meaning: "adj. 魔法的；神奇的",
      exp: "Magical means seeming to have special powers, like something from a story.",
      example: "The snow made the forest look magical.",
    },
    {
      unit: 6,
      word: "rock",
      meaning: "n. 岩石",
      exp: "A rock is a large, hard piece of stone.",
      example: "She climbed over the big rocks near the river.",
    },
    {
      unit: 6,
      word: "rest",
      meaning: "n. 休息；剩余部分",
      exp: "Rest means to relax and stop working. The rest means the part that is left.",
      example: "She sat down to rest after a long walk.",
    },
    {
      unit: 6,
      word: "area",
      meaning: "n. 场地；地区",
      exp: "An area is a part of a place or a region.",
      example: "This is a quiet area with lots of trees.",
    },
    {
      unit: 6,
      word: "rest area",
      meaning: "休息区",
      exp: "A rest area is a place where travellers can stop to relax.",
      example: "We stopped at a rest area on the motorway.",
    },
    {
      unit: 6,
      word: "make progress",
      meaning: "取得进展",
      exp: "To make progress means to improve or move forward in something.",
      example: "She is making great progress in learning to swim.",
    },
    {
      unit: 6,
      word: "although",
      meaning: "conj. 虽然；尽管",
      exp: "Although means even though, or despite the fact that.",
      example: "Although it was raining, we still played outside.",
    },
    {
      unit: 6,
      word: "still",
      meaning: "adv. 还；仍然",
      exp: "Still means continuing to happen, or without moving.",
      example: "She is still working on her project.",
    },
    {
      unit: 6,
      word: "in high spirits",
      meaning: "情绪高涨；兴高采烈",
      exp: "In high spirits means feeling very happy and excited.",
      example: "The team was in high spirits after winning the match.",
    },
    {
      unit: 6,
      word: "experience",
      meaning: "n. 经历；经验 v. 经历",
      exp: "Experience is something you do and learn from. To experience means to live through something.",
      example: "Climbing the mountain was an amazing experience.",
    },
    {
      unit: 6,
      word: "through",
      meaning: "prep. 穿过；凭借",
      exp: "Through means from one side to the other, or because of.",
      example: "She walked through the park to get home.",
    },
    {
      unit: 6,
      word: "glad",
      meaning: "adj. 高兴的",
      exp: "Glad means happy or pleased about something.",
      example: "I am glad you could come to my party.",
    },
    {
      unit: 6,
      word: "peak",
      meaning: "n. 山顶；顶点",
      exp: "A peak is the top of a mountain.",
      example: "They reached the peak of the mountain after a long climb.",
    },
    {
      unit: 6,
      word: "grey",
      meaning: "adj. 灰色的",
      exp: "Grey is a colour between black and white.",
      example: "The sky looked grey before the storm.",
    },
    {
      unit: 6,
      word: "because of",
      meaning: "因为",
      exp: "Because of means as a result of something.",
      example: "The match was cancelled because of the rain.",
    },
    {
      unit: 6,
      word: "fog",
      meaning: "n. 雾",
      exp: "Fog is thick cloud near the ground that makes it hard to see.",
      example: "The fog made it difficult to drive safely.",
    },
    {
      unit: 6,
      word: "ground",
      meaning: "n. 地面",
      exp: "The ground is the surface of the earth that you walk on.",
      example: "The children sat on the ground in the park.",
    },
    {
      unit: 6,
      word: "wet",
      meaning: "adj. 湿的",
      exp: "Wet means covered with water or rain.",
      example: "My shoes were wet after walking in the rain.",
    },
    {
      unit: 6,
      word: "tiring",
      meaning: "adj. 令人疲倦的；累人的",
      exp: "Tiring means making you feel tired or exhausted.",
      example: "Climbing the mountain was very tiring.",
    },
    {
      unit: 6,
      word: "seem",
      meaning: "v. 似乎；好像",
      exp: "To seem means to appear to be a certain way.",
      example: "She seems happy today.",
    },
    {
      unit: 6,
      word: "sunlight",
      meaning: "n. 阳光；日光",
      exp: "Sunlight is the light that comes from the sun.",
      example: "The room was bright with sunlight in the morning.",
    },
    {
      unit: 6,
      word: "at the top",
      meaning: "在顶部；在顶端",
      exp: "At the top means at the highest point of something.",
      example: "There is a beautiful view at the top of the hill.",
    },
    {
      unit: 6,
      word: "thought",
      meaning: "n. 想法",
      exp: "A thought is an idea in your mind.",
      example: "She had a great thought about how to solve the problem.",
    },
    {
      unit: 6,
      word: "mountain",
      meaning: "n. 山；高山",
      exp: "A mountain is a very high area of land.",
      example: "They climbed the mountain in the summer.",
    },
    {
      unit: 6,
      word: "at the start",
      meaning: "开始；起初",
      exp: "At the start means at the beginning of something.",
      example: "At the start of the school year we met our new teacher.",
    },
    {
      unit: 6,
      word: "end",
      meaning: "n. 末尾；结束",
      exp: "The end is the last part of something.",
      example: "I was happy at the end of the film.",
    },
    {
      unit: 6,
      word: "at the end",
      meaning: "最后；在末尾",
      exp: "At the end means at the final part of something.",
      example: "At the end of the lesson, the teacher gave us homework.",
    },
    {
      unit: 6,
      word: "storm",
      meaning: "n. 暴风雨；暴风雪",
      exp: "A storm is very bad weather with strong wind and heavy rain.",
      example: "A storm knocked down many trees last night.",
    },
    {
      unit: 6,
      word: "pour",
      meaning: "v. 倾倒；倒出",
      exp: "To pour means to make liquid flow out of something.",
      example: "She poured some milk into her cup of tea.",
    },
    {
      unit: 6,
      word: "wind",
      meaning: "n. 风",
      exp: "Wind is the air that moves across the outside.",
      example: "A strong wind blew her hat off her head.",
    },
    {
      unit: 6,
      word: "shout",
      meaning: "v. & n. 喊叫；呼唤",
      exp: "To shout means to say something very loudly.",
      example: "He shouted to his friend across the playground.",
    },
    {
      unit: 6,
      word: "run after",
      meaning: "追逐",
      exp: "To run after means to chase someone or something.",
      example: "The dog ran after the ball in the park.",
    },
    {
      unit: 7,
      word: "meet up",
      meaning: "碰头；相聚",
      exp: "To meet up means to come together with someone at a place.",
      example: "We met up at the library to study together.",
    },
    {
      unit: 7,
      word: "museum",
      meaning: "n. 博物馆",
      exp: "A museum is a building where you can look at interesting objects from history or art.",
      example: "We went to the science museum on our class trip.",
    },
    {
      unit: 7,
      word: "exhibition",
      meaning: "n. 展览",
      exp: "An exhibition is a public show of art, objects, or information.",
      example: "We visited the photo exhibition at the art gallery.",
    },
    {
      unit: 7,
      word: "direction",
      meaning: "n. 方向",
      exp: "A direction is the way you go to get somewhere, like left, right, or north.",
      example: "She asked for directions to the nearest station.",
    },
    {
      unit: 7,
      word: "trip",
      meaning: "n. 旅行",
      exp: "A trip is a journey to a place and back again.",
      example: "We had a great trip to the mountains.",
    },
    {
      unit: 7,
      word: "wastewater",
      meaning: "n. 废水",
      exp: "Wastewater is used, dirty water that needs to be cleaned before it can be used again.",
      example: "The factory treats its wastewater before releasing it.",
    },
    {
      unit: 7,
      word: "plant",
      meaning: "n. 工厂",
      exp: "A plant is a living thing that grows in soil. A plant is also a factory.",
      example: "There is a new car plant near our city.",
    },
    {
      unit: 7,
      word: "into",
      meaning: "prep. 到……里面；进入",
      exp: "Into means going inside something, or changing from one state to another.",
      example: "She walked into the classroom and sat down.",
    },
    {
      unit: 7,
      word: "remove",
      meaning: "v. 移开；拿走",
      exp: "To remove something means to take it away from a place.",
      example: "Please remove your shoes at the door.",
    },
    {
      unit: 7,
      word: "piece",
      meaning: "n. 片；块",
      exp: "A piece is a part of something that has been separated from the rest.",
      example: "She ate a piece of cake after dinner.",
    },
    {
      unit: 7,
      word: "waste",
      meaning: "n. 废弃物 v. 浪费",
      exp: "Waste means material that is no longer needed. To waste means to use too much of something.",
      example: "Don't waste water — turn off the tap.",
    },
    {
      unit: 7,
      word: "machine",
      meaning: "n. 机器",
      exp: "A machine is a device with parts that work together to do a job.",
      example: "The washing machine was broken, so she washed by hand.",
    },
    {
      unit: 7,
      word: "germ",
      meaning: "n. 微生物；细菌",
      exp: "A germ is a very tiny living thing that can cause disease.",
      example: "Wash your hands to remove germs.",
    },
    {
      unit: 7,
      word: "step",
      meaning: "n. 步骤；脚步",
      exp: "A step is a movement of your foot when you walk, or one stage in a process.",
      example: "Follow these steps to make the recipe.",
    },
    {
      unit: 7,
      word: "used to",
      meaning: "过去常常（做）",
      exp: "Used to means something happened regularly in the past but does not happen now.",
      example: "She used to walk to school but now she takes the bus.",
    },
    {
      unit: 7,
      word: "realize",
      meaning: "v. 认识到；实现",
      exp: "To realize means to suddenly understand or become aware of something.",
      example: "I realized I had forgotten my homework.",
    },
    {
      unit: 7,
      word: "inside",
      meaning: "prep. 在……里面 adv. 在里面",
      exp: "Inside means in the inner part of something.",
      example: "We stayed inside because it was raining.",
    },
    {
      unit: 7,
      word: "go on a trip",
      meaning: "去旅行",
      exp: "To go on a trip means to travel somewhere.",
      example: "We went on a trip to Xi'an and visited the Terracotta Army.",
    },
    {
      unit: 7,
      word: "process",
      meaning: "n. 过程",
      exp: "A process is a series of steps you follow to do or make something.",
      example: "Making bread is a long process.",
    },
    {
      unit: 7,
      word: "theatre",
      meaning: "n. 戏院；剧场；电影院",
      exp: "A theatre is a building where plays or shows are performed.",
      example: "We went to the theatre to watch a play.",
    },
    {
      unit: 7,
      word: "factory",
      meaning: "n. 工厂",
      exp: "A factory is a building where products are made by machines.",
      example: "She works in a car factory.",
    },
    {
      unit: 7,
      word: "terrible",
      meaning: "adj. 糟糕的",
      exp: "Terrible means very bad or horrible.",
      example: "I had a terrible headache all day.",
    },
    {
      unit: 7,
      word: "actor",
      meaning: "n. 演员",
      exp: "An actor is a person who performs in films, plays, or TV shows.",
      example: "He is a famous actor who has been in many films.",
    },
    {
      unit: 7,
      word: "gun",
      meaning: "n. 枪",
      exp: "A gun is a weapon that fires bullets.",
      example: "Only police officers should carry a gun.",
    },
    {
      unit: 7,
      word: "try on",
      meaning: "试穿",
      exp: "To try on means to put on a piece of clothing to see if it fits.",
      example: "She tried on three dresses before choosing one.",
    },
    {
      unit: 7,
      word: "along",
      meaning: "prep. 沿着；顺着",
      exp: "Along means from one end to the other, or moving in the same direction.",
      example: "We walked along the river for an hour.",
    },
    {
      unit: 7,
      word: "road",
      meaning: "n. 道路",
      exp: "A road is a hard surface built for cars and other vehicles to travel on.",
      example: "The road was wet and slippery after the rain.",
    },
    {
      unit: 7,
      word: "create",
      meaning: "v. 创造",
      exp: "To create means to make something new.",
      example: "She created a beautiful painting for the school art show.",
    },
    {
      unit: 7,
      word: "record",
      meaning: "v. 记录 n. 记录",
      exp: "To record means to write down or save information. A record is the best result ever.",
      example: "He broke the world record for the 100 metres.",
    },
    {
      unit: 7,
      word: "skill",
      meaning: "n. 技能",
      exp: "A skill is the ability to do something well because you have practised it.",
      example: "Drawing is a skill that takes a lot of practice.",
    },
    {
      unit: 7,
      word: "write down",
      meaning: "写下；记下",
      exp: "To write down means to put information on paper so you do not forget it.",
      example: "Write down the homework so you remember what to do.",
    },
    {
      unit: 7,
      word: "explore",
      meaning: "v. 探索",
      exp: "To explore means to travel to a new place to find out about it.",
      example: "We explored the old town and found some great cafés.",
    },
    {
      unit: 7,
      word: "tent",
      meaning: "n. 帐篷",
      exp: "A tent is a shelter made of fabric that you put up outside to sleep in.",
      example: "They set up their tent near the river.",
    },
    {
      unit: 7,
      word: "cucumber",
      meaning: "n. 黄瓜",
      exp: "A cucumber is a long, green vegetable that you eat in salads.",
      example: "She sliced the cucumber and added it to the salad.",
    },
    {
      unit: 7,
      word: "from … to …",
      meaning: "从……到……",
      exp: "From ... to ... shows the start and end of a range of time or place.",
      example: "The shop is open from nine to five.",
    },
    {
      unit: 7,
      word: "straight",
      meaning: "adv. 直接；立即 adj. 直的",
      exp: "Straight means not curved. Straight away means immediately.",
      example: "Go straight ahead and turn left at the traffic lights.",
    },
    {
      unit: 7,
      word: "fill",
      meaning: "v. 装满；盛满",
      exp: "To fill means to put enough of something into a container to make it full.",
      example: "She filled her bottle with water before the hike.",
    },
    {
      unit: 7,
      word: "basket",
      meaning: "n. 篮子；筐",
      exp: "A basket is a container made of woven material used to carry things.",
      example: "She put the vegetables in a basket.",
    },
    {
      unit: 7,
      word: "teach",
      meaning: "v. 教",
      exp: "To teach means to give someone knowledge or a skill.",
      example: "She teaches English at the middle school.",
    },
    {
      unit: 7,
      word: "branch",
      meaning: "n. 分支；树枝",
      exp: "A branch is a part of a tree that grows out from the main trunk.",
      example: "The bird sat on a branch and sang.",
    },
    {
      unit: 7,
      word: "leaf",
      meaning: "n. 叶；叶子",
      exp: "A leaf is the flat, green part of a plant that grows from a branch.",
      example: "The leaves on the tree turn red in autumn.",
    },
    {
      unit: 7,
      word: "finally",
      meaning: "adv. 终于",
      exp: "Finally means at the end, after a long time or many things.",
      example: "After hours of work, she finally finished her project.",
    },
    {
      unit: 7,
      word: "think of",
      meaning: "考虑；想起",
      exp: "To think of means to have an idea, or to remember something.",
      example: "Can you think of a word that means happy?",
    },
    {
      unit: 7,
      word: "grain",
      meaning: "n. 谷物；谷粒",
      exp: "Grain is a seed from plants like wheat or rice that we use for food.",
      example: "Rice is an important grain in Chinese cooking.",
    },
    {
      unit: 7,
      word: "fresh",
      meaning: "adj. 新鲜的",
      exp: "Fresh means new and not old, or food that has just been made.",
      example: "She bought fresh vegetables from the market.",
    },
    {
      unit: 7,
      word: "certainly",
      meaning: "adv. 肯定地",
      exp: "Certainly means definitely yes, without any doubt.",
      example: "I will certainly help you with that.",
    },
    {
      unit: 7,
      word: "diary",
      meaning: "n. 日记；日记本",
      exp: "A diary is a book where you write about your thoughts and what happened each day.",
      example: "She writes in her diary every night before bed.",
    },
    {
      unit: 7,
      word: "entry",
      meaning: "n.（日记的）一则；入口",
      exp: "An entry in a diary is what you write on one day. An entry is also a way in.",
      example: "She read the diary entry from last year.",
    },
    {
      unit: 7,
      word: "agree",
      meaning: "v. 赞成；同意",
      exp: "To agree means to think the same as someone, or to say yes to something.",
      example: "I agree with you — we should start early.",
    },
    {
      unit: 7,
      word: "agree with",
      meaning: "赞成；同意",
      exp: "To agree with someone means to have the same opinion as them.",
      example: "Do you agree with the teacher's decision?",
    },
    {
      unit: 8,
      word: "upon",
      meaning: "prep. 在……上",
      exp: "Upon means on or at. Once upon a time is used to start a story.",
      example: "She placed her hand upon his shoulder.",
    },
    {
      unit: 8,
      word: "once upon a time",
      meaning: "从前；很久以前",
      exp: "Once upon a time is how many fairy tales begin, meaning long ago.",
      example: "Once upon a time, there lived a kind princess.",
    },
    {
      unit: 8,
      word: "bite",
      meaning: "v. 咬；咬伤",
      exp: "To bite means to use your teeth to cut into something.",
      example: "The dog bit through the rope.",
    },
    {
      unit: 8,
      word: "bite through",
      meaning: "咬穿",
      exp: "To bite through means to cut all the way through something with your teeth.",
      example: "The mouse bit through the net to free the lion.",
    },
    {
      unit: 8,
      word: "net",
      meaning: "n. 网；网状物",
      exp: "A net is an object made of crossed strings or wires with spaces between them.",
      example: "The fish was caught in the fishing net.",
    },
    {
      unit: 8,
      word: "hunter",
      meaning: "n. 猎人；搜寻者",
      exp: "A hunter is a person or animal that catches other animals for food.",
      example: "The hunter walked quietly through the forest.",
    },
    {
      unit: 8,
      word: "promise",
      meaning: "v. 承诺；保证 n. 承诺；诺言",
      exp: "A promise is when you say you will definitely do something.",
      example: "I promise to help you tomorrow.",
    },
    {
      unit: 8,
      word: "long ago",
      meaning: "很久以前",
      exp: "Long ago means in the far past, a very long time before now.",
      example: "Long ago, people did not have electricity or cars.",
    },
    {
      unit: 8,
      word: "war",
      meaning: "n. 战争",
      exp: "A war is a long and serious fight between countries or groups.",
      example: "Many people were hurt during the war.",
    },
    {
      unit: 8,
      word: "neighbour",
      meaning: "n. 邻居",
      exp: "A neighbour is someone who lives near you.",
      example: "Our neighbour is very friendly and helps us sometimes.",
    },
    {
      unit: 8,
      word: "wise",
      meaning: "adj. 明智的；高明的",
      exp: "Wise means having good knowledge and judgement from experience.",
      example: "The wise old teacher gave good advice to the students.",
    },
    {
      unit: 8,
      word: "emperor",
      meaning: "n. 皇帝",
      exp: "An emperor is a man who rules an empire, a large group of countries.",
      example: "The emperor lived in the beautiful palace.",
    },
    {
      unit: 8,
      word: "lie",
      meaning: "v. 撒谎 n. 谎言",
      exp: "A lie is something you say that is not true. To lie also means to be in a flat position.",
      example: "It is wrong to tell a lie.",
    },
    {
      unit: 8,
      word: "pretend",
      meaning: "v. 假装；伪装",
      exp: "To pretend means to act as if something is true when it is not.",
      example: "The children pretended to be animals in the garden.",
    },
    {
      unit: 8,
      word: "official",
      meaning: "n. 官员；高级职员",
      exp: "An official is a person who holds an important position in an organisation or government.",
      example: "The official signed the important documents.",
    },
    {
      unit: 8,
      word: "silly",
      meaning: "adj. 愚蠢的；傻的",
      exp: "Silly means not serious or a bit foolish.",
      example: "He made everyone laugh with his silly jokes.",
    },
    {
      unit: 8,
      word: "decide",
      meaning: "v. 决定",
      exp: "To decide means to choose what to do after thinking about it.",
      example: "She decided to study harder for her next exam.",
    },
    {
      unit: 8,
      word: "praise",
      meaning: "v. & n. 赞美；表扬",
      exp: "To praise means to say good things about someone for what they did well.",
      example: "The teacher praised her for her excellent essay.",
    },
    {
      unit: 8,
      word: "afraid",
      meaning: "adj. 害怕的；担心的",
      exp: "Afraid means feeling scared or worried about something.",
      example: "She was afraid of the dark and slept with a light on.",
    },
    {
      unit: 8,
      word: "suddenly",
      meaning: "adv. 突然地；出乎意料地",
      exp: "Suddenly means very quickly and without any warning.",
      example: "Suddenly, it started to rain heavily.",
    },
    {
      unit: 8,
      word: "at first",
      meaning: "起初；最初",
      exp: "At first means in the beginning, before things changed.",
      example: "At first I found maths difficult, but I got better.",
    },
    {
      unit: 8,
      word: "truth",
      meaning: "n. 真相；事实",
      exp: "The truth is what is real and correct.",
      example: "It is always better to tell the truth.",
    },
    {
      unit: 8,
      word: "tell the truth",
      meaning: "说实话",
      exp: "To tell the truth means to say what is real and honest.",
      example: "He told the truth even though it was difficult.",
    },
    {
      unit: 8,
      word: "make money",
      meaning: "赚钱",
      exp: "To make money means to earn money from work or a business.",
      example: "She started a small business to make money.",
    },
    {
      unit: 8,
      word: "true",
      meaning: "adj. 符合事实的；真正的",
      exp: "True means correct and real, not false.",
      example: "Is it true that you won first prize?",
    },
    {
      unit: 8,
      word: "hate",
      meaning: "v. 不喜欢；厌恶；讨厌",
      exp: "To hate something means to dislike it very strongly.",
      example: "I hate getting up early in the morning.",
    },
    {
      unit: 8,
      word: "get out",
      meaning: "逃脱；离开",
      exp: "To get out means to leave a place or to escape from somewhere.",
      example: "Get out of the water — there is a shark!",
    },
    {
      unit: 8,
      word: "king",
      meaning: "n. 君主；国王",
      exp: "A king is a man who rules a country.",
      example: "The king sat on his golden throne.",
    },
    {
      unit: 8,
      word: "artist",
      meaning: "n. 美术家；艺术家",
      exp: "An artist is a person who creates art like paintings or sculptures.",
      example: "The artist painted a beautiful picture of the sea.",
    },
    {
      unit: 8,
      word: "quickly",
      meaning: "adv. 快速地；很快",
      exp: "Quickly means in a fast way, without much time.",
      example: "She quickly finished her lunch and went outside.",
    },
    {
      unit: 8,
      word: "smile",
      meaning: "v. 微笑 n. 微笑；笑容",
      exp: "To smile means to make a happy expression with your mouth turning up.",
      example: "She smiled when she saw her best friend.",
    },
    {
      unit: 8,
      word: "all over",
      meaning: "到处；遍及",
      exp: "All over means everywhere in a place.",
      example: "There were flowers all over the garden.",
    },
    {
      unit: 8,
      word: "ugly",
      meaning: "adj. 丑陋的；难看的",
      exp: "Ugly means not pleasant to look at.",
      example: "The ugly duckling was sad until it grew into a beautiful swan.",
    },
    {
      unit: 8,
      word: "duckling",
      meaning: "n. 小鸭子",
      exp: "A duckling is a baby duck.",
      example: "The duckling followed its mother to the pond.",
    },
    {
      unit: 8,
      word: "real",
      meaning: "adj. 真的；真正的",
      exp: "Real means actually existing, not imaginary or false.",
      example: "Is that a real diamond or a fake one?",
    },
    {
      unit: 8,
      word: "laugh at",
      meaning: "嘲笑",
      exp: "To laugh at someone means to laugh because you think they are funny or foolish.",
      example: "Don't laugh at others — it is unkind.",
    },
    {
      unit: 8,
      word: "go away",
      meaning: "走开",
      exp: "Go away means to leave a place, or to tell someone to leave.",
      example: "Go away — I need to concentrate.",
    },
    {
      unit: 8,
      word: "search",
      meaning: "v. 寻找；搜寻",
      exp: "To search means to look carefully for something.",
      example: "She searched for her lost key all morning.",
    },
    {
      unit: 8,
      word: "search for",
      meaning: "寻找",
      exp: "To search for something means to look carefully to find it.",
      example: "He searched for his missing cat for two days.",
    },
    {
      unit: 8,
      word: "hen",
      meaning: "n. 母鸡",
      exp: "A hen is a female chicken.",
      example: "The hen laid three eggs in the morning.",
    },
    {
      unit: 8,
      word: "hopefully",
      meaning: "adv. 有希望地",
      exp: "Hopefully means in a hopeful way, or it is hoped that something will happen.",
      example: "Hopefully, the weather will be better tomorrow.",
    },
    {
      unit: 8,
      word: "purr",
      meaning: "v.（猫愉快时）发出呜呜声",
      exp: "To purr is the soft sound a cat makes when it is happy.",
      example: "The cat purred as I stroked it.",
    },
    {
      unit: 8,
      word: "lay",
      meaning: "v. 下（蛋）；放置；搁",
      exp: "To lay means to put something down flat, or for a bird to produce an egg.",
      example: "The hen lays one egg every day.",
    },
    {
      unit: 8,
      word: "swan",
      meaning: "n. 天鹅",
      exp: "A swan is a large white bird with a long neck that lives near water.",
      example: "We watched the swans swimming on the lake.",
    },
    {
      unit: 8,
      word: "feather",
      meaning: "n. 羽毛",
      exp: "A feather is one of the light, soft coverings on a bird's body.",
      example: "She found a white feather on the ground.",
    },
    {
      unit: 8,
      word: "to sb's surprise",
      meaning: "出乎某人的意料",
      exp: "To someone's surprise means that something happened and they did not expect it.",
      example: "To everyone's surprise, she won the competition.",
    },
    {
      unit: 8,
      word: "size",
      meaning: "n. 大小；尺寸",
      exp: "Size is how big or small something is.",
      example: "What size shoes do you wear?",
    },
    {
      unit: 8,
      word: "believe",
      meaning: "v. 相信；认为",
      exp: "To believe means to think that something is true.",
      example: "I believe you can win if you try hard.",
    },
    {
      unit: 8,
      word: "only if",
      meaning: "只有",
      exp: "Only if means something will happen only when a certain condition is true.",
      example: "I will go only if my homework is finished.",
    },
    {
      unit: 8,
      word: "fisherman",
      meaning: "n. 渔夫",
      exp: "A fisherman is a person who catches fish as a job or hobby.",
      example: "The fisherman caught many fish in the lake.",
    },
    {
      unit: 8,
      word: "fishing",
      meaning: "n. 钓鱼；捕鱼",
      exp: "Fishing is the activity of trying to catch fish.",
      example: "We went fishing by the river on Saturday morning.",
    },
    {
      unit: 8,
      word: "come out",
      meaning: "出现；盛开",
      exp: "To come out means to appear from inside somewhere.",
      example: "The sun came out after the rain stopped.",
    },
    {
      unit: 8,
      word: "genie",
      meaning: "n. 妖怪；鬼",
      exp: "A genie is a magical spirit in stories that can grant wishes.",
      example: "The genie appeared from the lamp and offered three wishes.",
    },
    {
      unit: 8,
      word: "die",
      meaning: "v. 死亡；消失",
      exp: "To die means to stop living.",
      example: "The plant died because I forgot to water it.",
    },
    {
      unit: 8,
      word: "make a promise",
      meaning: "许下诺言",
      exp: "To make a promise means to say firmly that you will do something.",
      example: "He made a promise to always help his friend.",
    },
    {
      unit: 8,
      word: "someone",
      meaning: "pron. 某人；有人",
      exp: "Someone means a person, but you do not know who.",
      example: "Someone left flowers on the doorstep.",
    },
    {
      unit: 8,
      word: "set",
      meaning: "v. 使处于某种状况；使开始",
      exp: "To set means to put something in a place or position, or to make something free.",
      example: "She set the books on the shelf carefully.",
    },
    {
      unit: 8,
      word: "set … free",
      meaning: "释放",
      exp: "To set someone free means to let them go so they are no longer kept.",
      example: "The fisherman set the fish free back into the sea.",
    },
    {
      unit: 8,
      word: "rich",
      meaning: "adj. 富有的；富含……的",
      exp: "Rich means having a lot of money or valuable things.",
      example: "She became rich after starting her own business.",
    },
    {
      unit: 8,
      word: "powerful",
      meaning: "adj. 强大的；有影响力的",
      exp: "Powerful means having a lot of strength, ability, or control.",
      example: "The lion is a powerful animal.",
    },
    {
      unit: 8,
      word: "anyone",
      meaning: "pron. 任何人；某个人",
      exp: "Anyone means any person at all.",
      example: "Is anyone here good at drawing?",
    },
    {
      unit: 8,
      word: "instead of",
      meaning: "而不是；代替",
      exp: "Instead of means in place of something else.",
      example: "She had fruit instead of cake.",
    },
    {
      unit: 8,
      word: "succeed in doing sth",
      meaning: "成功做成某事",
      exp: "To succeed in doing something means to manage to do it successfully.",
      example: "He succeeded in passing all his exams.",
    },
    {
      unit: 8,
      word: "himself",
      meaning: "pron. 他自己；他本人",
      exp: "Himself is used when the subject and object of the verb are the same male person.",
      example: "He made breakfast himself this morning.",
    },
    {
      unit: 8,
      word: "in the end",
      meaning: "最后；终究",
      exp: "In the end means finally, after everything that happened.",
      example: "We tried many solutions, and in the end, we fixed it.",
    },
  ],
  八上: [
    {
      unit: 1,
      word: "ancient",
      meaning: "adj. 古代的；古老的",
      exp: "Ancient means very old, from a long time ago in history.",
      example: "The ancient temple was built over two thousand years ago.",
    },
    {
      unit: 1,
      word: "camp",
      meaning: "n. 度假营；营地 v. 露营；宿营",
      exp: "A camp is a place where people stay in tents or simple buildings. To camp means to stay there.",
      example: "We stayed at a camp near the lake for a week.",
    },
    {
      unit: 1,
      word: "landscape",
      meaning: "n. 风景；景色",
      exp: "A landscape is the view of an area of land, including its hills, rivers, and fields.",
      example: "The landscape of the countryside is green and beautiful.",
    },
    {
      unit: 1,
      word: "strange",
      meaning: "adj. 奇怪的；陌生的",
      exp: "Strange means unusual or different from what you normally see.",
      example: "She heard a strange noise outside her window.",
    },
    {
      unit: 1,
      word: "vacation",
      meaning: "n. 假期；度假",
      exp: "A vacation is a period of time when you are not working or studying.",
      example: "We went to the beach for our summer vacation.",
    },
    {
      unit: 1,
      word: "fantastic",
      meaning: "adj. 极好的；吸引人的",
      exp: "Fantastic means extremely good and wonderful.",
      example: "We had a fantastic time at the theme park.",
    },
    {
      unit: 1,
      word: "town",
      meaning: "n. 镇；商业区",
      exp: "A town is a place where many people live, smaller than a city.",
      example: "She grew up in a small town near the mountains.",
    },
    {
      unit: 1,
      word: "breath",
      meaning: "n. 呼吸的空气；一口气",
      exp: "Breath is the air you take into and let out of your lungs.",
      example: "She took a deep breath before her performance.",
    },
    {
      unit: 1,
      word: "take sb's breath away",
      meaning: "令人惊叹；让人叹绝",
      exp: "If something takes your breath away, it is so beautiful or amazing that you are surprised.",
      example: "The view from the mountain top took my breath away.",
    },
    {
      unit: 1,
      word: "especially",
      meaning: "adv. 尤其；特别",
      exp: "Especially means more than other things, particularly.",
      example: "I love all fruit, especially mangoes.",
    },
    {
      unit: 1,
      word: "steamed",
      meaning: "chicken soup 汽锅鸡",
      exp: "Steamed means cooked using hot steam rather than oil or water.",
      example: "She made steamed fish with ginger and soy sauce.",
    },
    {
      unit: 1,
      word: "anywhere",
      meaning: "adv. & pron. 在任何地方；随便哪个地方",
      exp: "Anywhere means in, at, or to any place.",
      example: "You can sit anywhere you like.",
    },
    {
      unit: 1,
      word: "nothing",
      meaning: "pron. 没有事；没有任何东西",
      exp: "Nothing means not anything at all.",
      example: "There is nothing to eat in the fridge.",
    },
    {
      unit: 1,
      word: "guide",
      meaning: "n. 导游；指南；手册 v. 给某人领路；指导",
      exp: "A guide is a person who shows visitors around a place and explains it.",
      example: "The tour guide told us about the history of the city.",
    },
    {
      unit: 1,
      word: "scenery",
      meaning: "n. 风景；景色",
      exp: "Scenery is the natural things you see in a landscape, like mountains and rivers.",
      example: "The scenery in Guilin is amazingly beautiful.",
    },
    {
      unit: 1,
      word: "silk",
      meaning: "n. 丝绸；（蚕）丝",
      exp: "Silk is a smooth, soft, and shiny fabric made from the thread of silkworms.",
      example: "China is famous for producing fine silk.",
    },
    {
      unit: 1,
      word: "scarf",
      meaning: "n. 围巾；披巾",
      exp: "A scarf is a piece of cloth worn around your neck or head.",
      example: "She wore a colourful silk scarf around her neck.",
    },
    {
      unit: 1,
      word: "ready",
      meaning: "adj. 准备好的；现成的 adv. 已做完；已完成",
      exp: "Ready means prepared and able to do something.",
      example: "Are you ready to go to school?",
    },
    {
      unit: 1,
      word: "ready to do sth",
      meaning: "马上要（做某事）；愿意做（某事）",
      exp: "Ready to do something means prepared and willing to start doing it.",
      example: "She was ready to give her speech.",
    },
    {
      unit: 1,
      word: "somewhere",
      meaning: "adv. 在某处；到某处 pron. 某处；某个地方",
      exp: "Somewhere means in or to a place, but not a specific one.",
      example: "I left my bag somewhere in the classroom.",
    },
    {
      unit: 1,
      word: "myself",
      meaning: "pron. 我自己",
      exp: "Myself is used when the speaker is also the object of the action.",
      example: "I made this cake myself.",
    },
    {
      unit: 1,
      word: "nothing but",
      meaning: "只有；只是",
      exp: "Nothing but means only, and nothing else.",
      example: "There is nothing but rice left to eat.",
    },
    {
      unit: 1,
      word: "hotel",
      meaning: "n. 旅馆；旅社",
      exp: "A hotel is a building where you pay to stay in a room when you are travelling.",
      example: "We stayed in a comfortable hotel near the sea.",
    },
    {
      unit: 1,
      word: "comfortable",
      meaning: "adj. 使人舒服的；舒适的",
      exp: "Comfortable means making you feel relaxed and at ease.",
      example: "The sofa is very comfortable to sit on.",
    },
    {
      unit: 1,
      word: "bored",
      meaning: "adj. 厌倦的；烦闷的",
      exp: "Bored means feeling tired because nothing is interesting or exciting.",
      example: "She was bored on the long train journey.",
    },
    {
      unit: 1,
      word: "sky",
      meaning: "n. 天；天空",
      exp: "The sky is the space above the earth that you see when you look up.",
      example: "The sky was clear and full of stars.",
    },
    {
      unit: 1,
      word: "towards",
      meaning: "prep. 向；朝",
      exp: "Towards means in the direction of something.",
      example: "She walked towards the exit.",
    },
    {
      unit: 1,
      word: "rainbow",
      meaning: "n. 虹；彩虹",
      exp: "A rainbow is the curved band of many colours that appears in the sky after rain.",
      example: "A beautiful rainbow appeared after the storm.",
    },
    {
      unit: 1,
      word: "square",
      meaning: "n. 广场；正方形 adj. 正方形的；平方的",
      exp: "A square is a shape with four equal sides. A square is also an open public space in a town.",
      example: "We took a photo in the main square of the old city.",
    },
    {
      unit: 1,
      word: "during",
      meaning: "prep. 在……期间",
      exp: "During means in the time between the start and end of an event.",
      example: "She fell asleep during the film.",
    },
    {
      unit: 1,
      word: "victory",
      meaning: "n. 胜利；成功",
      exp: "Victory means winning a battle, game, or competition.",
      example: "The team celebrated their victory with cheers.",
    },
    {
      unit: 1,
      word: "Russian",
      meaning: "adj. 俄罗斯的；俄罗斯人的 n. 俄罗斯人；俄语",
      exp: "Russian means belonging to Russia or its people or language.",
      example: "She is learning to speak Russian.",
    },
    {
      unit: 1,
      word: "fight",
      meaning: "n. 战斗；搏斗；斗争 v. 打仗；打架",
      exp: "A fight is when people hit each other. To fight means to take part in this.",
      example: "The two boys had an argument but did not fight.",
    },
    {
      unit: 1,
      word: "against",
      meaning: "prep. 反对；与……相反；紧靠",
      exp: "Against means in opposition to, or touching the side of something.",
      example: "He leaned against the wall and waited.",
    },
    {
      unit: 1,
      word: "fight against sb",
      meaning: "sth 与……作战；与……作斗争",
      exp: "To fight against someone or something means to oppose or struggle with them.",
      example: "People worked together to fight against the disease.",
    },
    {
      unit: 1,
      word: "artwork",
      meaning: "n. 艺术作品；插图",
      exp: "Artwork is a painting, drawing, or other piece of creative work.",
      example:
        "The museum displayed beautiful artwork from different countries.",
    },
    {
      unit: 1,
      word: "thousands of",
      meaning: "数以千计的；成千上万的",
      exp: "Thousands of means a very large number.",
      example: "Thousands of people visit the museum every year.",
    },
    {
      unit: 1,
      word: "tear",
      meaning: "n. 眼泪；泪水",
      exp: "A tear is a drop of water from your eye when you cry.",
      example: "A tear ran down her cheek when she heard the sad news.",
    },
    {
      unit: 1,
      word: "remind",
      meaning: "v. 提醒；使想起",
      exp: "To remind someone means to help them remember something.",
      example: "Can you remind me to call Mum?",
    },
    {
      unit: 1,
      word: "peace",
      meaning: "n. 和平；太平",
      exp: "Peace means a time without war or conflict, when things are calm.",
      example: "After the war, people hoped for peace.",
    },
    {
      unit: 1,
      word: "easily",
      meaning: "adv. 容易地；轻易地",
      exp: "Easily means without difficulty.",
      example: "She easily solved the maths problem.",
    },
    {
      unit: 1,
      word: "forget",
      meaning: "v. 忘记；遗忘",
      exp: "To forget means to not remember something.",
      example: "Don't forget to bring your homework tomorrow.",
    },
    {
      unit: 1,
      word: "noon",
      meaning: "n. 正午；中午",
      exp: "Noon is twelve o'clock in the middle of the day.",
      example: "We had lunch at noon.",
    },
    {
      unit: 1,
      word: "sick",
      meaning: "adj. 恶心的；生病的",
      exp: "Sick means ill or not feeling well in your body.",
      example: "She was sick and stayed home from school.",
    },
    {
      unit: 1,
      word: "metro",
      meaning: "n. 地下铁道系统",
      exp: "A metro is an underground train system in a city.",
      example: "We took the metro to get across the city quickly.",
    },
    {
      unit: 1,
      word: "station",
      meaning: "n. 车站；所；局",
      exp: "A station is a place where trains or buses stop to let people on and off.",
      example: "She waited at the station for the next train.",
    },
    {
      unit: 1,
      word: "palace",
      meaning: "n. 王宫；宫殿",
      exp: "A palace is a large and grand building where a king or queen lives.",
      example: "We visited the famous palace in the old city.",
    },
    {
      unit: 1,
      word: "accordion",
      meaning: "n. 手风琴",
      exp: "An accordion is a musical instrument you squeeze to make sound while pressing keys.",
      example: "He played an old song on his accordion.",
    },
    {
      unit: 1,
      word: "get together",
      meaning: "聚会；相聚",
      exp: "To get together means to meet and spend time with other people.",
      example: "The whole family gets together for the holidays.",
    },
    {
      unit: 1,
      word: "in the sun",
      meaning: "在阳光下",
      exp: "In the sun means in a place where the sun is shining on you.",
      example: "They sat in the sun and had a picnic.",
    },
    {
      unit: 1,
      word: "tower",
      meaning: "n. 塔；塔楼",
      exp: "A tower is a tall, narrow building or part of a building.",
      example: "We climbed to the top of the old stone tower.",
    },
    {
      unit: 1,
      word: "might",
      meaning: "modal v. 可能；可以",
      exp: "Might means something is possible but not certain.",
      example: "It might rain tomorrow, so take an umbrella.",
    },
    {
      unit: 1,
      word: "budget",
      meaning: "n. 预算 v. 把……编入预算；精打细算",
      exp: "A budget is the amount of money you have and plan to spend.",
      example: "We planned our trip carefully to stay within our budget.",
    },
    {
      unit: 1,
      word: "passport",
      meaning: "n. 护照",
      exp: "A passport is an official document that proves who you are when travelling to other countries.",
      example: "Don't forget your passport when travelling abroad.",
    },
    {
      unit: 1,
      word: "forgetful",
      meaning: "adj. 健忘的；好忘事的",
      exp: "Forgetful means often forgetting things.",
      example: "She is quite forgetful and often leaves her keys at home.",
    },
    {
      unit: 1,
      word: "faraway",
      meaning: "adj. 远方的；遥远的",
      exp: "Faraway means a long distance from where you are.",
      example: "She dreamed of travelling to faraway countries.",
    },
    {
      unit: 1,
      word: "regular",
      meaning: "adj. 平常的；有规律的",
      exp: "Regular means happening or done often at the same time.",
      example: "He makes regular visits to his grandparents.",
    },
    {
      unit: 1,
      word: "countryside",
      meaning: "n. 乡村；农村",
      exp: "The countryside is the land outside cities and towns with fields and trees.",
      example: "We drove through the beautiful countryside.",
    },
    {
      unit: 1,
      word: "turn around",
      meaning: "转身；翻转",
      exp: "To turn around means to face the other direction.",
      example: "She turned around and saw her old friend standing there.",
    },
    {
      unit: 1,
      word: "surprised",
      meaning: "adj. 惊奇的；惊讶的",
      exp: "Surprised means feeling something you did not expect.",
      example: "She was surprised to find a birthday card on her desk.",
    },
    {
      unit: 1,
      word: "deer",
      meaning: "n. 鹿",
      exp: "A deer is a wild animal with four legs. Male deer have antlers on their heads.",
      example: "We saw a deer in the forest during our walk.",
    },
    {
      unit: 1,
      word: "probably",
      meaning: "adv. 很可能；大概",
      exp: "Probably means likely, or almost certainly true.",
      example: "It will probably rain this afternoon — take an umbrella.",
    },
    {
      unit: 1,
      word: "look for",
      meaning: "寻找",
      exp: "To look for something means to try to find it.",
      example: "She looked for her keys everywhere.",
    },
    {
      unit: 2,
      word: "pack",
      meaning: "v. 打包；收拾",
      exp: "To pack means to put things into a bag or box to take with you.",
      example: "She packed her bag the night before the trip.",
    },
    {
      unit: 2,
      word: "pack up",
      meaning: "打包",
      exp: "To pack up means to put all your things into bags or boxes.",
      example: "We packed up after the picnic and went home.",
    },
    {
      unit: 2,
      word: "bathroom",
      meaning: "n. 浴室；洗手间",
      exp: "A bathroom is a room with a bath or shower, and usually a toilet.",
      example: "She went to the bathroom to wash her hands.",
    },
    {
      unit: 2,
      word: "sort",
      meaning: "v. 把……分类；整理 n. 种类",
      exp: "To sort means to put things into groups or the right order.",
      example: "Please sort these books into alphabetical order.",
    },
    {
      unit: 2,
      word: "bedroom",
      meaning: "n. 卧室",
      exp: "A bedroom is a room in a house where you sleep.",
      example: "Her bedroom walls are covered with posters.",
    },
    {
      unit: 2,
      word: "balcony",
      meaning: "n. 阳台",
      exp: "A balcony is a small platform outside a room on the upper floor of a building.",
      example: "We had breakfast on the balcony and watched the sunrise.",
    },
    {
      unit: 2,
      word: "hang up",
      meaning: "挂起；挂断电话",
      exp: "To hang up means to put a phone call, or to put something on a hook.",
      example: "She hung up her coat on the hook by the door.",
    },
    {
      unit: 2,
      word: "invite",
      meaning: "v. 邀请",
      exp: "To invite someone means to ask them to come to a place or event.",
      example: "She invited all her friends to her birthday party.",
    },
    {
      unit: 2,
      word: "living room",
      meaning: "客厅",
      exp: "A living room is the main room in a home where people sit and relax together.",
      example: "The family watched TV together in the living room.",
    },
    {
      unit: 2,
      word: "arrival",
      meaning: "n. 到达",
      exp: "Arrival is the act of arriving or reaching a place.",
      example: "We waited at the airport for the arrival of the flight.",
    },
    {
      unit: 2,
      word: "yet",
      meaning: "adv. 还 conj. 但是",
      exp: "Yet means by this time, or up to now. It is used in negative sentences and questions.",
      example: "Have you finished your homework yet?",
    },
    {
      unit: 2,
      word: "add",
      meaning: "v. 添加；加",
      exp: "To add means to put something in with something else to increase the total.",
      example: "Add some salt to the soup to improve the taste.",
    },
    {
      unit: 2,
      word: "add sth to sth",
      meaning: "把……加入……",
      exp: "To add something to something means to put it in to include it.",
      example: "She added some sugar to her tea.",
    },
    {
      unit: 2,
      word: "go shopping",
      meaning: "去购物",
      exp: "To go shopping means to visit shops to buy things.",
      example: "Let's go shopping this Saturday afternoon.",
    },
    {
      unit: 2,
      word: "biscuit",
      meaning: "n. 饼干",
      exp: "A biscuit is a small, flat, crispy food, sweet or plain, often eaten as a snack.",
      example: "She ate a biscuit with her afternoon tea.",
    },
    {
      unit: 2,
      word: "borrow",
      meaning: "v. 借",
      exp: "To borrow means to take something from someone for a short time and then return it.",
      example: "Can I borrow your ruler for a moment?",
    },
    {
      unit: 2,
      word: "plan",
      meaning: "v. 策划；打算 n. 计划；方案",
      exp: "A plan is what you decide to do. To plan means to decide how to do something in advance.",
      example: "We made a plan for our school trip.",
    },
    {
      unit: 2,
      word: "treasure",
      meaning: "n. 宝物；财富 v. 珍视",
      exp: "Treasure is a valuable collection of gold, jewels, or other precious things.",
      example: "The children looked for treasure buried in the garden.",
    },
    {
      unit: 2,
      word: "hunt",
      meaning: "n. 搜寻；狩猎 v. 搜寻；打猎",
      exp: "A hunt is the act of searching for something. To hunt means to look for something.",
      example: "The treasure hunt was a lot of fun.",
    },
    {
      unit: 2,
      word: "treasure hunt",
      meaning: "寻宝游戏",
      exp: "A treasure hunt is a game where players follow clues to find hidden objects.",
      example: "We organised a treasure hunt in the park for the children.",
    },
    {
      unit: 2,
      word: "lift",
      meaning: "n. 搭便车；电梯 v. 举起；抬起",
      exp: "A lift is a machine that moves people between floors in a building. To give someone a lift means to take them in your car.",
      example: "He gave me a lift to school in his car.",
    },
    {
      unit: 2,
      word: "give sb a lift",
      meaning: "开车顺便送某人",
      exp: "To give someone a lift means to take them somewhere in your car.",
      example: "Can you give me a lift to the station?",
    },
    {
      unit: 2,
      word: "until",
      meaning: "prep. 到……时；直到……为止",
      exp: "Until means up to a particular time or event.",
      example: "She studied until midnight to prepare for the exam.",
    },
    {
      unit: 2,
      word: "be careful with",
      meaning: "注意；当心",
      exp: "To be careful with something means to handle it in a safe and attentive way.",
      example: "Be careful with that glass — it might break.",
    },
    {
      unit: 2,
      word: "movie",
      meaning: "n. 电影",
      exp: "A movie is a film you watch at the cinema or on a screen.",
      example: "Let's watch a movie tonight.",
    },
    {
      unit: 2,
      word: "the movies",
      meaning: "电影院；电影产业",
      exp: "The movies means a cinema, or films in general.",
      example: "She went to the movies with her friends.",
    },
    {
      unit: 2,
      word: "dead",
      meaning: "adj. 不运行的；死的",
      exp: "Dead means not alive any longer. Dead can also mean not working.",
      example: "My phone battery is dead.",
    },
    {
      unit: 2,
      word: "note",
      meaning: "n. 笔记；记录；便条 v. 注意；指出",
      exp: "A note is a short piece of writing to remind you or tell someone something.",
      example: "She wrote a note to say she was going out.",
    },
    {
      unit: 2,
      word: "take notes",
      meaning: "做笔记",
      exp: "To take notes means to write down important information while listening.",
      example: "Students take notes during the lesson.",
    },
    {
      unit: 2,
      word: "clean up",
      meaning: "清扫",
      exp: "To clean up means to make a place tidy and remove mess.",
      example: "We cleaned up the classroom after the party.",
    },
    {
      unit: 2,
      word: "community",
      meaning: "n. 社区；社团",
      exp: "A community is a group of people who live in the same area or share common interests.",
      example: "Everyone in the community helped after the flood.",
    },
    {
      unit: 2,
      word: "rubbish",
      meaning: "n. 垃圾",
      exp: "Rubbish is things you throw away because they are not needed.",
      example: "Please put your rubbish in the bin.",
    },
    {
      unit: 2,
      word: "almost",
      meaning: "adv. 差不多；几乎",
      exp: "Almost means very nearly but not completely.",
      example: "She has almost finished her book.",
    },
    {
      unit: 2,
      word: "journey",
      meaning: "n. 旅行；历程 v. 旅行",
      exp: "A journey is when you travel from one place to another.",
      example: "The journey by train took three hours.",
    },
    {
      unit: 2,
      word: "pull",
      meaning: "v. & n. 拉；拖；拽",
      exp: "To pull means to move something towards you by holding it.",
      example: "She pulled the door open and walked in.",
    },
    {
      unit: 2,
      word: "luggage",
      meaning: "n. 行李",
      exp: "Luggage is the bags and suitcases you take with you when you travel.",
      example: "The luggage was heavy, so we used a trolley.",
    },
    {
      unit: 2,
      word: "ah",
      meaning: "interj. 啊",
      exp: "Ah is an exclamation used to show you understand or are pleased.",
      example: "Ah, I see what you mean now.",
    },
    {
      unit: 2,
      word: "share sth with sb",
      meaning: "把……与……分享",
      exp: "To share something with someone means to give them part of what you have.",
      example: "She shared her lunch with her friend.",
    },
    {
      unit: 2,
      word: "mm",
      meaning: "interj. 嗯",
      exp: "Mm is a sound made to show you are thinking or agree.",
      example: "Mm, that soup smells delicious.",
    },
    {
      unit: 2,
      word: "familiar",
      meaning: "adj. 熟悉的",
      exp: "Familiar means something you know well or have seen before.",
      example: "The song sounded familiar — I had heard it before.",
    },
    {
      unit: 2,
      word: "joke",
      meaning: "n. 笑话 v. 开玩笑",
      exp: "A joke is a funny story or comment meant to make people laugh.",
      example: "He told a funny joke and everyone laughed.",
    },
    {
      unit: 2,
      word: "several",
      meaning: "pron. 几个；一些",
      exp: "Several means more than two but not a large number.",
      example: "She called me several times today.",
    },
    {
      unit: 2,
      word: "nod",
      meaning: "v. & n. 点头",
      exp: "To nod means to move your head up and down to say yes or show you understand.",
      example: "She nodded to show she agreed with the idea.",
    },
    {
      unit: 2,
      word: "writer",
      meaning: "n. 作者",
      exp: "A writer is a person who writes books, articles, or stories.",
      example: "Her favourite writer is Mo Yan.",
    },
    {
      unit: 2,
      word: "text",
      meaning: "n. 正文；文本 v. 发短信",
      exp: "A text is a written message sent on a phone. To text means to send one.",
      example: "She sent me a text to say she was on her way.",
    },
    {
      unit: 2,
      word: "describe",
      meaning: "v. 描述；形容",
      exp: "To describe something means to say what it looks like or what it is like.",
      example: "Can you describe what the man looked like?",
    },
    {
      unit: 2,
      word: "wherever",
      meaning: "adv. & conj. 无论去哪里",
      exp: "Wherever means in any place, or no matter where.",
      example: "You can take your book wherever you go.",
    },
    {
      unit: 2,
      word: "matter",
      meaning: "v. 要紧 n. 问题",
      exp: "To matter means to be important. A matter is a subject or problem.",
      example: "It doesn't matter — I can do it myself.",
    },
    {
      unit: 2,
      word: "no matter",
      meaning: "不论；不要紧",
      exp: "No matter means despite something, it does not change the result.",
      example: "No matter how hard I tried, I couldn't solve it.",
    },
    {
      unit: 2,
      word: "perhaps",
      meaning: "adv. 也许；可能",
      exp: "Perhaps means maybe or possibly.",
      example: "Perhaps she will come to the party tomorrow.",
    },
    {
      unit: 2,
      word: "plate",
      meaning: "n. 盘子；碟子",
      exp: "A plate is a flat dish you use to eat food from.",
      example: "She put a plate of rice on the table.",
    },
    {
      unit: 2,
      word: "freshly",
      meaning: "adv. 刚刚",
      exp: "Freshly means just made or done very recently.",
      example: "The freshly baked bread smelled wonderful.",
    },
    {
      unit: 2,
      word: "smell",
      meaning: "v. 发臭；闻到 n. 气味",
      exp: "To smell means to notice a scent with your nose. A smell is a scent.",
      example: "The flowers smell very nice.",
    },
    {
      unit: 2,
      word: "joy",
      meaning: "n. 喜悦；乐趣",
      exp: "Joy is a strong feeling of happiness.",
      example: "She felt great joy when she heard the good news.",
    },
    {
      unit: 2,
      word: "apartment",
      meaning: "n. 房间；公寓套房",
      exp: "An apartment is a set of rooms for one person or family to live in, usually in a big building.",
      example: "They live in a small apartment in the city.",
    },
    {
      unit: 2,
      word: "block",
      meaning: "n. 大楼；街区 v. 阻挡",
      exp: "A block is a large building divided into separate apartments. A block is also a section of a street.",
      example: "She lives in the third block on the left.",
    },
    {
      unit: 2,
      word: "decorate",
      meaning: "v. 装饰；装潢",
      exp: "To decorate means to add things to make a place look nicer.",
      example: "We decorated the classroom for the school party.",
    },
    {
      unit: 2,
      word: "cover",
      meaning: "v. 遮盖；包括 n. 遮盖物；封皮",
      exp: "To cover something means to put something over it.",
      example: "She covered the table with a white cloth.",
    },
    {
      unit: 2,
      word: "poster",
      meaning: "n. 海报",
      exp: "A poster is a large printed picture or notice put on a wall.",
      example: "He has a poster of his favourite band on his bedroom wall.",
    },
    {
      unit: 2,
      word: "scissors",
      meaning: "n. 剪刀",
      exp: "Scissors are a tool with two sharp blades used for cutting paper or cloth.",
      example: "She used scissors to cut the paper into shapes.",
    },
    {
      unit: 2,
      word: "glue",
      meaning: "n. 胶水 v. 粘贴",
      exp: "Glue is a sticky substance used to attach things together.",
      example: "He used glue to fix the broken vase.",
    },
    {
      unit: 2,
      word: "paper-cut",
      meaning: "n. 剪纸",
      exp: "A paper-cut is a traditional Chinese art form made by cutting designs in paper.",
      example: "She made a beautiful paper-cut with a red pattern.",
    },
    {
      unit: 3,
      word: "compare",
      meaning: "v. 比较；对比",
      exp: "To compare means to look at two things and see how they are the same or different.",
      example: "Let's compare the prices at the two shops.",
    },
    {
      unit: 3,
      word: "shy",
      meaning: "adj. 害羞的",
      exp: "Shy means feeling nervous or uncomfortable around other people.",
      example: "She was shy and did not speak much on her first day.",
    },
    {
      unit: 3,
      word: "lazy",
      meaning: "adj. 懒惰的；懒洋洋的",
      exp: "Lazy means not wanting to work or make an effort.",
      example: "He was too lazy to clean his room.",
    },
    {
      unit: 3,
      word: "loud",
      meaning: "adv. 响亮地 adj. 大声的",
      exp: "Loud means making a lot of noise.",
      example: "The music was so loud we could not hear each other.",
    },
    {
      unit: 3,
      word: "outgoing",
      meaning: "adj. 外向的",
      exp: "Outgoing means confident and enjoying meeting other people.",
      example: "She is very outgoing and makes friends easily.",
    },
    {
      unit: 3,
      word: "hard-working",
      meaning: "adj. 勤奋的",
      exp: "Hard-working means putting a lot of effort into your work or studies.",
      example: "She is a hard-working student who always does her best.",
    },
    {
      unit: 3,
      word: "perform",
      meaning: "v. 表演；执行",
      exp: "To perform means to do something in front of an audience.",
      example: "She performed a beautiful song at the school concert.",
    },
    {
      unit: 3,
      word: "alone",
      meaning: "adv. & adj. 独自；单独",
      exp: "Alone means without other people.",
      example: "He sat alone on the bench and thought.",
    },
    {
      unit: 3,
      word: "solve",
      meaning: "v. 解决；解答",
      exp: "To solve a problem means to find the answer or fix it.",
      example: "She solved the difficult maths problem in two minutes.",
    },
    {
      unit: 3,
      word: "flute",
      meaning: "n. 长笛",
      exp: "A flute is a long, thin musical instrument you blow across to make sound.",
      example: "She has been learning to play the flute for three years.",
    },
    {
      unit: 3,
      word: "congratulation",
      meaning: "n. 祝贺；恭喜",
      exp: "A congratulation is something you say to someone when they do well.",
      example: "They sent their congratulations on her graduation.",
    },
    {
      unit: 3,
      word: "Congratulations (on ...) !",
      meaning: "（对……表示）祝贺！",
      exp: "Congratulations is what you say to someone to celebrate their success.",
      example: "Congratulations on winning the prize!",
    },
    {
      unit: 3,
      word: "prize",
      meaning: "n. 奖；奖励",
      exp: "A prize is something you get when you win a competition.",
      example: "She won first prize in the writing competition.",
    },
    {
      unit: 3,
      word: "attend",
      meaning: "v. 参加；出席",
      exp: "To attend means to be present at a meeting or event.",
      example: "All students must attend the assembly tomorrow.",
    },
    {
      unit: 3,
      word: "as … as …",
      meaning: "像……一样……",
      exp: "As ... as ... is used to compare two things and say they are equal.",
      example: "She is as tall as her older sister.",
    },
    {
      unit: 3,
      word: "besides",
      meaning: "prep. 除……之外（还） adv. 而且",
      exp: "Besides means in addition to, or also.",
      example: "Besides English, she can speak French.",
    },
    {
      unit: 3,
      word: "spare",
      meaning: "adj. 空闲的；备用的 v. 抽出",
      exp: "Spare means extra, not being used. Spare time is free time.",
      example: "I like to draw in my spare time.",
    },
    {
      unit: 3,
      word: "spare time",
      meaning: "空闲时间",
      exp: "Spare time is the time when you are not working or studying.",
      example: "What do you do in your spare time?",
    },
    {
      unit: 3,
      word: "pleasure",
      meaning: "n. 乐事；愉快；荣幸",
      exp: "Pleasure is a feeling of enjoyment or happiness.",
      example: "It was a pleasure to meet you.",
    },
    {
      unit: 3,
      word: "have sth in common",
      meaning: "有共同之处",
      exp: "To have something in common means to share the same interest or quality.",
      example: "We have a lot in common — we both love football.",
    },
    {
      unit: 3,
      word: "appearance",
      meaning: "n. 外表；露面",
      exp: "Appearance is what someone or something looks like from the outside.",
      example: "He changed his appearance by cutting his hair short.",
    },
    {
      unit: 3,
      word: "personality",
      meaning: "n. 性格；品质",
      exp: "Personality is the set of qualities that make someone who they are.",
      example: "She has a warm personality and everyone likes her.",
    },
    {
      unit: 3,
      word: "serious",
      meaning: "adj. 严肃的；严重的",
      exp: "Serious means not funny or playful, or important.",
      example: "She has a serious expression when she studies.",
    },
    {
      unit: 3,
      word: "strength",
      meaning: "n. 优势；力量",
      exp: "Strength is the power to do difficult physical things, or a good quality.",
      example: "One of her strengths is that she never gives up.",
    },
    {
      unit: 3,
      word: "slim",
      meaning: "adj. 苗条的；薄的",
      exp: "Slim means thin in a healthy way.",
      example: "She stays slim by exercising regularly.",
    },
    {
      unit: 3,
      word: "fact",
      meaning: "n. 事实；现实",
      exp: "A fact is a piece of information that is true.",
      example: "It is a fact that the Earth goes around the Sun.",
    },
    {
      unit: 3,
      word: "population",
      meaning: "n. 人口",
      exp: "The population is the number of people living in a place.",
      example: "China has the largest population in the world.",
    },
    {
      unit: 3,
      word: "average",
      meaning: "adj. 平均的；平常的 n. 平均数",
      exp: "Average means typical or normal, or the result you get by adding numbers and dividing.",
      example: "The average temperature in July is thirty degrees.",
    },
    {
      unit: 3,
      word: "rainfall",
      meaning: "n. 降雨量",
      exp: "Rainfall is the amount of rain that falls in a place over a period of time.",
      example: "The south of China has high rainfall in summer.",
    },
    {
      unit: 3,
      word: "pleasant",
      meaning: "adj. 宜人的；友好的",
      exp: "Pleasant means enjoyable, nice, and agreeable.",
      example: "We had a pleasant walk through the park.",
    },
    {
      unit: 3,
      word: "difference",
      meaning: "n. 差异",
      exp: "A difference is a way in which things are not the same.",
      example: "Can you spot the difference between these two pictures?",
    },
    {
      unit: 3,
      word: "alike",
      meaning: "adj. 相像的 adv. 相似地",
      exp: "Alike means very similar, almost the same.",
      example: "The twins look so alike that I always mix them up.",
    },
    {
      unit: 3,
      word: "mirror",
      meaning: "n. 镜子",
      exp: "A mirror is a flat piece of glass that reflects your image.",
      example: "She looked at herself in the mirror before leaving.",
    },
    {
      unit: 3,
      word: "interest",
      meaning: "n. 业余爱好；兴趣 v. 使感兴趣",
      exp: "An interest is something you enjoy doing or learning about. To interest means to attract attention.",
      example: "She has an interest in photography.",
    },
    {
      unit: 3,
      word: "novel",
      meaning: "n. 小说",
      exp: "A novel is a long book that tells a story.",
      example: "She spent the whole weekend reading her favourite novel.",
    },
    {
      unit: 3,
      word: "sense",
      meaning: "n. 理解力；感觉 v. 意识到",
      exp: "A sense is one of the abilities to see, hear, smell, taste, or touch.",
      example: "She has a great sense of humour.",
    },
    {
      unit: 3,
      word: "humour",
      meaning: "n. 幽默；幽默感",
      exp: "Humour is the quality of being funny, or the ability to find things funny.",
      example: "He has a good sense of humour and makes people smile.",
    },
    {
      unit: 3,
      word: "thanks to",
      meaning: "归功于；由于；因为",
      exp: "Thanks to means because of someone or something, usually in a positive way.",
      example: "Thanks to her hard work, the project was a success.",
    },
    {
      unit: 3,
      word: "opinion",
      meaning: "n. 看法；意见",
      exp: "An opinion is what you think or believe about something.",
      example: "In my opinion, this is the best film of the year.",
    },
    {
      unit: 3,
      word: "make a mistake",
      meaning: "犯错误",
      exp: "To make a mistake means to do something wrong.",
      example: "Don't worry — everyone makes a mistake sometimes.",
    },
    {
      unit: 3,
      word: "less",
      meaning: "adj. 较少的 adv. 较少地 pron. 较少",
      exp: "Less means a smaller amount of something.",
      example: "Try to eat less sugar for better health.",
    },
    {
      unit: 3,
      word: "straightforward",
      meaning: "adj. 坦率的；简单的",
      exp: "Straightforward means easy to understand, or honest and direct.",
      example: "The instructions were straightforward and easy to follow.",
    },
    {
      unit: 3,
      word: "honest",
      meaning: "adj. 坦诚的；诚实的",
      exp: "Honest means telling the truth and not deceiving others.",
      example: "She is honest and always tells me the truth.",
    },
    {
      unit: 3,
      word: "direct",
      meaning: "adj. 率直的；直接的",
      exp: "Direct means straight to the point, without going around things.",
      example: "She gave a direct answer without wasting time.",
    },
    {
      unit: 3,
      word: "similarity",
      meaning: "n. 相似之处",
      exp: "A similarity is a way in which two things are the same.",
      example: "There are many similarities between the two cities.",
    },
    {
      unit: 3,
      word: "friendship",
      meaning: "n. 友谊；友情",
      exp: "Friendship is the close relationship between people who are friends.",
      example: "Their friendship has lasted for over ten years.",
    },
    {
      unit: 3,
      word: "metre",
      meaning: "n. 米",
      exp: "A metre is a unit of length equal to 100 centimetres.",
      example: "The swimming pool is fifty metres long.",
    },
    {
      unit: 3,
      word: "prince",
      meaning: "n. 王子",
      exp: "A prince is the son of a king or queen.",
      example: "The prince waved to the crowd from the palace window.",
    },
    {
      unit: 3,
      word: "character",
      meaning: "n. 人物；个性",
      exp: "A character is a person in a book, film, or story. It also means a person's qualities.",
      example: "My favourite character in the story is the brave girl.",
    },
    {
      unit: 3,
      word: "pauper",
      meaning: "n. 贫民；乞丐",
      exp: "A pauper is a very poor person who has almost nothing.",
      example: "The story is about a prince and a pauper who change places.",
    },
    {
      unit: 3,
      word: "exchange",
      meaning: "v. & n. 交换",
      exp: "To exchange means to give something and receive something in return.",
      example: "They exchanged gifts at the winter festival.",
    },
    {
      unit: 3,
      word: "accident",
      meaning: "n. 意外；（交通）事故",
      exp: "An accident is something bad that happens by chance and is not planned.",
      example: "He broke his arm in an accident on his bike.",
    },
    {
      unit: 3,
      word: "by accident",
      meaning: "偶然；意外地",
      exp: "By accident means not intentionally, happening without planning.",
      example: "She found the answer by accident while reading.",
    },
    {
      unit: 3,
      word: "expect",
      meaning: "v. 预料；期待",
      exp: "To expect means to think something will happen.",
      example: "I did not expect to see you here!",
    },
    {
      unit: 3,
      word: "silver",
      meaning: "adj. 银色的 n. 银",
      exp: "Silver is a shiny grey-white precious metal. Silver also means a grey-white colour.",
      example: "She wore a silver necklace to the party.",
    },
    {
      unit: 3,
      word: "lining",
      meaning: "n. 内衬",
      exp: "A lining is the layer of material inside a piece of clothing or a cloud.",
      example: "Every cloud has a silver lining.",
    },
    {
      unit: 3,
      word: "silver lining",
      meaning: "一线光明",
      exp: "A silver lining is a good thing inside a bad situation.",
      example: "Every cloud has a silver lining.",
    },
    {
      unit: 3,
      word: "situation",
      meaning: "n. 情况；状况",
      exp: "A situation is the set of things that are happening at a particular time and place.",
      example: "He was in a difficult situation and needed help.",
    },
    {
      unit: 3,
      word: "care about",
      meaning: "关心；担心",
      exp: "To care about something means to think it is important to you.",
      example: "She cares about the environment and recycles everything.",
    },
    {
      unit: 3,
      word: "reach",
      meaning: "v. 伸手；到达",
      exp: "To reach means to arrive at a place or to stretch your arm to get something.",
      example: "She reached for the book on the high shelf.",
    },
    {
      unit: 3,
      word: "reach for",
      meaning: "伸手触碰",
      exp: "To reach for something means to stretch out your hand to get it.",
      example: "He reached for the remote control on the sofa.",
    },
    {
      unit: 3,
      word: "touch",
      meaning: "v. 触动；触碰",
      exp: "To touch means to put your hand on something. To touch someone also means to affect them emotionally.",
      example: "The sad story touched everyone in the room.",
    },
    {
      unit: 3,
      word: "lend (sb) a hand",
      meaning: "帮助（某人）",
      exp: "To lend someone a hand means to help them with something.",
      example: "Can you lend me a hand carrying these bags?",
    },
    {
      unit: 4,
      word: "moss",
      meaning: "n. 苔藓",
      exp: "Moss is a small, soft green plant that grows on rocks or trees in wet places.",
      example: "The old stones were covered in green moss.",
    },
    {
      unit: 4,
      word: "redwood",
      meaning: "n. 红杉；红木",
      exp: "A redwood is one of the tallest and oldest types of tree in the world.",
      example: "Redwood trees can grow taller than ninety metres.",
    },
    {
      unit: 4,
      word: "cheetah",
      meaning: "n. 猎豹",
      exp: "A cheetah is the fastest land animal, with black spots on its yellow fur.",
      example: "The cheetah can run at over one hundred kilometres per hour.",
    },
    {
      unit: 4,
      word: "folding",
      meaning: "adj. 折叠式的；可折叠的",
      exp: "Folding means able to be bent or folded to take up less space.",
      example: "She carried a folding fan to cool herself in the heat.",
    },
    {
      unit: 4,
      word: "folding fan",
      meaning: "折扇",
      exp: "A folding fan is a fan that can be folded and easily carried.",
      example: "She waved her folding fan in the hot weather.",
    },
    {
      unit: 4,
      word: "bamboo",
      meaning: "n. 竹；竹子",
      exp: "Bamboo is a tall, fast-growing plant with a hard, hollow stem, common in Asia.",
      example: "Giant pandas love to eat bamboo.",
    },
    {
      unit: 4,
      word: "yeah",
      meaning: "interj. 是的；对",
      exp: "Yeah means yes, used in informal speech.",
      example: "Yeah, I would love to come to the party!",
    },
    {
      unit: 4,
      word: "popular",
      meaning: "adj. 广受欢迎的；流行的",
      exp: "Popular means liked or enjoyed by many people.",
      example: "This song is very popular with young people.",
    },
    {
      unit: 4,
      word: "goodness",
      meaning: "n. 美德；营养",
      exp: "Goodness can mean the quality of being good or healthy. It is also used to show surprise.",
      example: "Goodness, that is a big dog!",
    },
    {
      unit: 4,
      word: "tool",
      meaning: "n. 工具；手段",
      exp: "A tool is an object used to do a particular job.",
      example: "A hammer is a useful tool.",
    },
    {
      unit: 4,
      word: "actually",
      meaning: "adv. 实际上；居然",
      exp: "Actually means in truth, or really, used to give correct information.",
      example: "I thought she was tired, but actually she was sad.",
    },
    {
      unit: 4,
      word: "shoot",
      meaning: "n. 幼苗；嫩芽 v. 开（枪）；射击",
      exp: "A shoot is a new growth on a plant. To shoot can mean to fire a gun.",
      example: "Bamboo shoots are a popular ingredient in Chinese cooking.",
    },
    {
      unit: 4,
      word: "appear",
      meaning: "v. 出现；看来好像",
      exp: "To appear means to come into view or to seem a certain way.",
      example: "A rainbow appeared after the rain.",
    },
    {
      unit: 4,
      word: "feel free (to do sth)",
      meaning: "可以随便做某事",
      exp: "Feel free to do something means you have permission and can do it without worry.",
      example: "Feel free to ask me any questions at any time.",
    },
    {
      unit: 4,
      word: "land",
      meaning: "n. 陆地；土地 v. 降落；着陆",
      exp: "Land is the solid dry part of the Earth's surface. To land means to come down from the air.",
      example: "The plane landed safely at the airport.",
    },
    {
      unit: 4,
      word: "African",
      meaning: "adj. 非洲的；非洲人的 n. 非洲人",
      exp: "African means belonging to or coming from Africa.",
      example: "African elephants are larger than Asian elephants.",
    },
    {
      unit: 4,
      word: "rose",
      meaning: "n. 玫瑰；蔷薇",
      exp: "A rose is a beautiful flower with a sweet smell, often red or pink.",
      example: "He gave her a red rose on Valentine's Day.",
    },
    {
      unit: 4,
      word: "peony",
      meaning: "n. 牡丹；芍药",
      exp: "A peony is a large, round, fragrant flower that is popular in China.",
      example: "The garden was full of beautiful pink peonies.",
    },
    {
      unit: 4,
      word: "lotus",
      meaning: "n. 莲花",
      exp: "A lotus is a beautiful flower that grows in water.",
      example: "The lotus flower is a symbol of purity in Chinese culture.",
    },
    {
      unit: 4,
      word: "butterfly",
      meaning: "n. 蝴蝶",
      exp: "A butterfly is a flying insect with large, colourful wings.",
      example: "A butterfly landed on the flower and then flew away.",
    },
    {
      unit: 4,
      word: "wing",
      meaning: "n. 翅膀；翼",
      exp: "A wing is the part of a bird or insect that it uses to fly.",
      example: "The butterfly's wings were bright blue.",
    },
    {
      unit: 4,
      word: "frog",
      meaning: "n. 蛙；青蛙",
      exp: "A frog is a small animal that can jump and lives near water.",
      example: "We heard a frog croaking near the pond.",
    },
    {
      unit: 4,
      word: "up to",
      meaning: "接近；直到",
      exp: "Up to means as many as, or reaching a certain level.",
      example: "Up to thirty students can attend the class.",
    },
    {
      unit: 4,
      word: "weigh",
      meaning: "v. 有……重；称重量",
      exp: "To weigh means to measure how heavy something is.",
      example: "The bag weighs five kilograms.",
    },
    {
      unit: 4,
      word: "ginkgo",
      meaning: "n. 银杏",
      exp: "A ginkgo is an ancient tree with fan-shaped leaves.",
      example: "The ginkgo tree outside the school is hundreds of years old.",
    },
    {
      unit: 4,
      word: "believe",
      meaning: "v. 相信；认为有可能",
      exp: "To believe means to think that something is true.",
      example: "I believe you can win if you try hard.",
    },
    {
      unit: 4,
      word: "province",
      meaning: "n. 省份",
      exp: "A province is a large area of land that is part of a country.",
      example: "Sichuan is a province in southwest China.",
    },
    {
      unit: 4,
      word: "take a walk",
      meaning: "散步",
      exp: "To take a walk means to go for a walk for pleasure.",
      example: "We took a walk along the river in the evening.",
    },
    {
      unit: 4,
      word: "connect",
      meaning: "v. 关联；连接",
      exp: "To connect means to join two things together.",
      example: "A bridge connects the two sides of the river.",
    },
    {
      unit: 4,
      word: "connected",
      meaning: "adj. 连接的；相关的",
      exp: "Connected means joined together or linked.",
      example: "The two buildings are connected by a covered walkway.",
    },
    {
      unit: 4,
      word: "be connected with",
      meaning: "to 与……相连；与……有关联",
      exp: "To be connected with something means to be related to or linked with it.",
      example: "This road is connected with the main highway.",
    },
    {
      unit: 4,
      word: "without",
      meaning: "prep. 没有；缺乏",
      exp: "Without means not having something, or not doing something.",
      example: "She left without saying goodbye.",
    },
    {
      unit: 4,
      word: "imagine",
      meaning: "v. 想象；猜想",
      exp: "To imagine means to create a picture in your mind of something that is not real.",
      example: "Close your eyes and imagine a beach on a sunny day.",
    },
    {
      unit: 4,
      word: "honey",
      meaning: "n. 蜂蜜；（爱称）亲爱的",
      exp: "Honey is a sweet, sticky food made by bees.",
      example: "She put honey on her toast for breakfast.",
    },
    {
      unit: 4,
      word: "disappointed",
      meaning: "adj. 失望的；沮丧的",
      exp: "Disappointed means feeling sad because something you hoped for did not happen.",
      example: "She was disappointed when it rained on the day of the picnic.",
    },
    {
      unit: 4,
      word: "connection",
      meaning: "n. 联系；连接",
      exp: "A connection is a link or relationship between two things.",
      example: "There is a close connection between health and exercise.",
    },
    {
      unit: 4,
      word: "pollination",
      meaning: "n. 授粉",
      exp: "Pollination is the process by which pollen is moved from one flower to another.",
      example: "Bees play an important role in the pollination of flowers.",
    },
    {
      unit: 4,
      word: "pollen",
      meaning: "n. 花粉",
      exp: "Pollen is the tiny yellow powder produced by flowers.",
      example: "In spring, the air is full of pollen from flowers.",
    },
    {
      unit: 4,
      word: "action",
      meaning: "n. 行动；行为",
      exp: "An action is something that a person does.",
      example: "Kind actions make the world a better place.",
    },
    {
      unit: 4,
      word: "in fact",
      meaning: "确切地说；实际上",
      exp: "In fact means really or truly, used to give correct or extra information.",
      example: "He said he was fine, but in fact he was very tired.",
    },
    {
      unit: 4,
      word: "per cent",
      meaning: "n. 百分之……",
      exp: "Per cent means for every hundred, written as %.",
      example: "Ninety per cent of the students passed the exam.",
    },
    {
      unit: 4,
      word: "for this reason",
      meaning: "出于这个原因",
      exp: "For this reason means because of what was just said.",
      example: "She was ill for this reason she could not come.",
    },
    {
      unit: 4,
      word: "planet",
      meaning: "n. 行星",
      exp: "A planet is a large round object in space that goes around a star.",
      example: "Earth is the third planet from the Sun.",
    },
    {
      unit: 4,
      word: "in order to",
      meaning: "为了；以便",
      exp: "In order to means for the purpose of something.",
      example: "She studied hard in order to pass her exam.",
    },
    {
      unit: 4,
      word: "store",
      meaning: "v. 贮存；存储 n. 百货商店",
      exp: "To store means to keep something somewhere for future use.",
      example: "She stores her winter clothes in a box under the bed.",
    },
    {
      unit: 4,
      word: "honeycomb",
      meaning: "n. 蜂巢",
      exp: "A honeycomb is the waxy structure made by bees to store honey.",
      example: "The bees filled every cell of the honeycomb with honey.",
    },
    {
      unit: 4,
      word: "communicate",
      meaning: "v. 交流；沟通",
      exp: "To communicate means to share information or ideas with others.",
      example: "Animals communicate in many different ways.",
    },
    {
      unit: 4,
      word: "play a part (in sth)",
      meaning: "参与某事",
      exp: "To play a part in something means to be involved in making it happen.",
      example: "Everyone plays a part in keeping the school clean.",
    },
    {
      unit: 4,
      word: "ecosystem",
      meaning: "n. 生态系统",
      exp: "An ecosystem is all the plants, animals, and other living things in an area.",
      example: "Bees are very important for the ecosystem.",
    },
    {
      unit: 4,
      word: "protect",
      meaning: "v. 保护；防护",
      exp: "To protect something means to keep it safe from harm.",
      example: "We must protect the environment for future generations.",
    },
    {
      unit: 4,
      word: "importance",
      meaning: "n. 重要性",
      exp: "Importance is the quality of being significant or valuable.",
      example: "She understands the importance of getting enough sleep.",
    },
    {
      unit: 4,
      word: "title",
      meaning: "n. 标题；题目；名称",
      exp: "A title is the name of a book, film, or piece of work. It is also a name used before a person's name.",
      example: "What is the title of the book you are reading?",
    },
    {
      unit: 4,
      word: "human",
      meaning: "n. 人 adj. 人的；人类的",
      exp: "A human is a person, a member of the human race.",
      example: "Humans need food, water, and shelter to survive.",
    },
    {
      unit: 4,
      word: "ant",
      meaning: "n. 蚂蚁",
      exp: "An ant is a very small insect that lives in a group called a colony.",
      example: "A line of ants carried a piece of food across the path.",
    },
    {
      unit: 4,
      word: "be home to sb",
      meaning: "sth 有……栖息；是……的家乡",
      exp: "To be home to someone or something means a place where they live.",
      example: "This forest is home to many rare animals.",
    },
    {
      unit: 4,
      word: "happiness",
      meaning: "n. 幸福；快乐",
      exp: "Happiness is the feeling of being joyful and content.",
      example: "Family and friends bring true happiness.",
    },
    {
      unit: 4,
      word: "disappoint",
      meaning: "v. 使失望；使破灭",
      exp: "To disappoint means to make someone feel sad because things did not happen as hoped.",
      example: "I don't want to disappoint my parents.",
    },
    {
      unit: 4,
      word: "mushroom",
      meaning: "n. 蘑菇；伞菌",
      exp: "A mushroom is a type of fungus that grows in the ground, some are safe to eat.",
      example: "She added mushrooms to the soup.",
    },
    {
      unit: 4,
      word: "ton",
      meaning: "n. 吨",
      exp: "A ton is a unit of weight equal to 1,000 kilograms.",
      example: "The truck carried five tons of sand.",
    },
    {
      unit: 4,
      word: "role",
      meaning: "n. 作用；职能；角色",
      exp: "A role is the part someone or something plays in a situation.",
      example: "Teachers play an important role in children's lives.",
    },
    {
      unit: 4,
      word: "play a role (in)",
      meaning: "在……中发挥作用；扮演角色",
      exp: "To play a role in something means to have an important effect on it.",
      example: "Diet plays a key role in staying healthy.",
    },
    {
      unit: 4,
      word: "pea",
      meaning: "n. 豌豆",
      exp: "A pea is a small, round, green vegetable.",
      example: "She added fresh peas to the vegetable soup.",
    },
    {
      unit: 4,
      word: "climate",
      meaning: "n. 气候",
      exp: "Climate is the typical weather in a place over a long period of time.",
      example: "The climate in the south is warm and wet.",
    },
    {
      unit: 4,
      word: "ocean",
      meaning: "n. 大海；海洋",
      exp: "An ocean is a very large area of sea.",
      example: "The Pacific Ocean is the largest ocean in the world.",
    },
    {
      unit: 4,
      word: "except",
      meaning: "prep. 除……之外；除了",
      exp: "Except means not including someone or something.",
      example: "Everyone passed the test except Tom.",
    },
    {
      unit: 4,
      word: "tiny",
      meaning: "adj. 极小的；微小的",
      exp: "Tiny means very, very small.",
      example: "The baby's hand was tiny and soft.",
    },
    {
      unit: 4,
      word: "lively",
      meaning: "adj. 精力充沛的；生机勃勃的",
      exp: "Lively means full of energy and excitement.",
      example: "The market was lively with music and people.",
    },
    {
      unit: 4,
      word: "the Arctic Ocean",
      meaning: "北冰洋",
      exp: "The Arctic Ocean is the smallest ocean, around the North Pole.",
      example: "The Arctic Ocean is covered with ice for most of the year.",
    },
    {
      unit: 5,
      word: "pepper",
      meaning: "n. 胡椒粉；菜椒",
      exp: "Pepper is a spice used to flavour food. A pepper is also a type of vegetable.",
      example: "She added pepper to the soup to make it tastier.",
    },
    {
      unit: 5,
      word: "cut up",
      meaning: "切碎；剁碎",
      exp: "To cut up means to cut something into smaller pieces.",
      example: "She cut up the vegetables and put them in the pot.",
    },
    {
      unit: 5,
      word: "mix",
      meaning: "v. 混合；融合；调配 n. 混合",
      exp: "To mix means to combine two or more things together.",
      example: "Mix the flour and butter together in a bowl.",
    },
    {
      unit: 5,
      word: "bake",
      meaning: "v. 烘焙",
      exp: "To bake means to cook food in an oven using dry heat.",
      example: "She baked a cake for her mum's birthday.",
    },
    {
      unit: 5,
      word: "oven",
      meaning: "n. 烤箱；烤炉",
      exp: "An oven is a box-shaped cooking device with heating elements inside.",
      example: "Preheat the oven before putting in the bread.",
    },
    {
      unit: 5,
      word: "pour sth into sth",
      meaning: "将……倒入……",
      exp: "To pour something into something means to make liquid flow from one container into another.",
      example: "Pour the milk into the bowl and stir.",
    },
    {
      unit: 5,
      word: "flour",
      meaning: "n. 面粉",
      exp: "Flour is a white powder made from grain, used to make bread and cakes.",
      example: "She measured out two cups of flour for the cake.",
    },
    {
      unit: 5,
      word: "boil",
      meaning: "v. 煮沸；烧开 n. 沸腾",
      exp: "To boil means to heat liquid until it reaches 100 degrees and bubbles.",
      example: "Boil the water before adding the pasta.",
    },
    {
      unit: 5,
      word: "butter",
      meaning: "n. 黄油",
      exp: "Butter is a yellow food made from cream, used on bread or in cooking.",
      example: "She spread butter on her toast.",
    },
    {
      unit: 5,
      word: "cheese",
      meaning: "n. 奶酪；干酪",
      exp: "Cheese is a solid food made from milk.",
      example: "He put slices of cheese in his sandwich.",
    },
    {
      unit: 5,
      word: "cut sth in",
      meaning: "into sth 将……切成……",
      exp: "To cut something in or into means to divide it into smaller pieces.",
      example: "Cut the apple in half and share it with your friend.",
    },
    {
      unit: 5,
      word: "tablespoon",
      meaning: "n. 一汤匙；餐匙",
      exp: "A tablespoon is a large spoon used for measuring in cooking.",
      example: "Add one tablespoon of oil to the pan.",
    },
    {
      unit: 5,
      word: "mash",
      meaning: "v. 捣烂；捣碎",
      exp: "To mash means to crush soft food into a smooth paste.",
      example: "He mashed the potatoes until they were smooth.",
    },
    {
      unit: 5,
      word: "mashed potatoes",
      meaning: "土豆泥",
      exp: "Mashed potatoes are cooked potatoes that have been crushed until soft and smooth.",
      example: "She made mashed potatoes to go with the chicken.",
    },
    {
      unit: 5,
      word: "stir-fry",
      meaning: "v. 翻炒；炒",
      exp: "To stir-fry means to cook food quickly in hot oil while stirring constantly.",
      example: "She stir-fried the vegetables with garlic and soy sauce.",
    },
    {
      unit: 5,
      word: "do with",
      meaning: "处理",
      exp: "Do with means to deal with or use something in a certain way.",
      example: "What shall we do with the leftover food?",
    },
    {
      unit: 5,
      word: "bowl",
      meaning: "n. 碗；钵；盆",
      exp: "A bowl is a round, deep dish used to hold food or liquid.",
      example: "She ate a bowl of hot noodles for dinner.",
    },
    {
      unit: 5,
      word: "heat",
      meaning: "v. 加热；变热 n. 热；温度",
      exp: "To heat something means to make it warm or hot. Heat is the feeling of warmth.",
      example: "Heat the oil in the pan before adding the vegetables.",
    },
    {
      unit: 5,
      word: "oil",
      meaning: "n. 食用油；石油",
      exp: "Oil is a liquid used for cooking or in machines.",
      example: "Pour a little oil into the pan before frying.",
    },
    {
      unit: 5,
      word: "pan",
      meaning: "n. 平底锅；烤盘",
      exp: "A pan is a flat metal container used for cooking on a stove.",
      example: "She heated the pan before adding the oil.",
    },
    {
      unit: 5,
      word: "put sth back",
      meaning: "将……放回",
      exp: "To put something back means to return it to the place where it was.",
      example: "Please put the book back on the shelf when you finish.",
    },
    {
      unit: 5,
      word: "mix ... with ...",
      meaning: "（使）……和……混合",
      exp: "To mix something with something means to combine them together.",
      example: "Mix the flour with the eggs to make the dough.",
    },
    {
      unit: 5,
      word: "simple",
      meaning: "adj. 简单的；朴素的",
      exp: "Simple means easy to understand or do, with nothing extra added.",
      example: "The recipe is simple and only needs five ingredients.",
    },
    {
      unit: 5,
      word: "ingredient",
      meaning: "n. 食材；成分",
      exp: "An ingredient is one of the foods used to make a dish or recipe.",
      example: "Flour is the main ingredient in bread.",
    },
    {
      unit: 5,
      word: "instruction",
      meaning: "n. 用法说明；操作指南",
      exp: "An instruction is a direction that tells you how to do something.",
      example: "Follow the instructions carefully when cooking.",
    },
    {
      unit: 5,
      word: "steamed fish",
      meaning: "清蒸鱼",
      exp: "Steamed fish is a dish where fish is cooked using steam.",
      example: "Steamed fish is a healthy and delicious dish.",
    },
    {
      unit: 5,
      word: "sour",
      meaning: "adj. 酸的；有酸味的",
      exp: "Sour means having a sharp taste like lemon or vinegar.",
      example: "The lemon was too sour to eat on its own.",
    },
    {
      unit: 5,
      word: "hot and sour soup",
      meaning: "酸辣汤",
      exp: "Hot and sour soup is a traditional Chinese soup that is both spicy and sour.",
      example: "She ordered hot and sour soup at the restaurant.",
    },
    {
      unit: 5,
      word: "mess",
      meaning: "n. 脏乱；凌乱",
      exp: "A mess is when things are untidy or dirty.",
      example: "After the party, the kitchen was a mess.",
    },
    {
      unit: 5,
      word: "pretty",
      meaning: "adj. 漂亮的 adv. 相当；非常",
      exp: "Pretty means pleasant to look at. It also means quite or fairly.",
      example: "She drew a pretty picture of a garden.",
    },
    {
      unit: 5,
      word: "Christmas",
      meaning: "n. 圣诞节",
      exp: "Christmas is the holiday on December 25th when Christians celebrate the birth of Jesus.",
      example: "We put up decorations for Christmas.",
    },
    {
      unit: 5,
      word: "pancake",
      meaning: "n. 烙饼；薄饼",
      exp: "A pancake is a thin, flat food made from flour, eggs, and milk and cooked in a pan.",
      example: "She made pancakes for breakfast with syrup.",
    },
    {
      unit: 5,
      word: "dream",
      meaning: "n. 梦想；梦 v. 做梦；梦想",
      exp: "A dream is the images you see when you sleep. A dream is also something you hope for.",
      example: "My dream is to become a scientist.",
    },
    {
      unit: 5,
      word: "university",
      meaning: "n. 大学；高等学府",
      exp: "A university is a place of higher education where students study for degrees.",
      example: "She was accepted to a famous university to study medicine.",
    },
    {
      unit: 5,
      word: "go boating",
      meaning: "去划船",
      exp: "To go boating means to travel on water for pleasure in a small boat.",
      example: "We went boating on the lake last weekend.",
    },
    {
      unit: 5,
      word: "memory",
      meaning: "n. 回忆；记忆",
      exp: "A memory is something from the past that you remember.",
      example: "She has happy memories of summer holidays at the beach.",
    },
    {
      unit: 5,
      word: "visible",
      meaning: "adj. 看得见的；可见的",
      exp: "Visible means able to be seen.",
      example: "The stars are only visible on a clear night.",
    },
    {
      unit: 5,
      word: "along with sb",
      meaning: "sth 除……以外（还）",
      exp: "Along with someone means together with, in addition to.",
      example: "She came to the party along with her friends.",
    },
    {
      unit: 5,
      word: "pumpkin",
      meaning: "n. 南瓜",
      exp: "A pumpkin is a large, round, orange vegetable.",
      example: "They carved a pumpkin for Halloween.",
    },
    {
      unit: 5,
      word: "pie",
      meaning: "n. 果馅饼；肉馅饼",
      exp: "A pie is a food with a pastry covering filled with sweet fruit or meat.",
      example: "She made an apple pie from scratch.",
    },
    {
      unit: 5,
      word: "warm up",
      meaning: "（使）活跃起来；热身；预热",
      exp: "To warm up means to do gentle exercise before a harder workout, or to make something hotter.",
      example: "We always warm up before football training.",
    },
    {
      unit: 5,
      word: "cinnamon",
      meaning: "n. 肉桂皮；桂皮香料",
      exp: "Cinnamon is a warm, sweet spice from the bark of a tree.",
      example: "She sprinkled cinnamon on her hot apple pie.",
    },
    {
      unit: 5,
      word: "fill ... with ...",
      meaning: "（使）充满；（使）填满",
      exp: "To fill something with something means to put enough of it inside to make it full.",
      example: "She filled the bottle with fresh water.",
    },
    {
      unit: 5,
      word: "sweetness",
      meaning: "n. 甜；芬芳；愉悦",
      exp: "Sweetness is the quality of tasting sweet or being kind and pleasant.",
      example: "The sweetness of the mango was wonderful.",
    },
    {
      unit: 5,
      word: "college",
      meaning: "n. 学院；大学",
      exp: "A college is a place of higher education, often for vocational or academic courses.",
      example: "He plans to study at college after finishing school.",
    },
    {
      unit: 5,
      word: "host",
      meaning: "n. 主人；东道主 v. 主办",
      exp: "A host is a person who invites guests to their home or organises an event.",
      example: "The host welcomed all the guests at the door.",
    },
    {
      unit: 5,
      word: "hostess",
      meaning: "n. 女主人；女房东",
      exp: "A hostess is a woman who welcomes and looks after guests.",
      example: "The hostess served drinks to everyone at the party.",
    },
    {
      unit: 5,
      word: "recipe",
      meaning: "n. 食谱；烹饪法",
      exp: "A recipe is a list of ingredients and instructions for cooking a dish.",
      example: "She found a great recipe for chocolate cake online.",
    },
    {
      unit: 5,
      word: "cream",
      meaning: "n. 奶油；护肤霜",
      exp: "Cream is the thick, rich part of milk. It is also used in cooking and desserts.",
      example: "She added cream to make the soup richer.",
    },
    {
      unit: 5,
      word: "crust",
      meaning: "n. 糕饼酥皮；面包皮",
      exp: "A crust is the hard outer part of bread or pie.",
      example: "She made a golden crust for the apple pie.",
    },
    {
      unit: 5,
      word: "mixture",
      meaning: "n. 混合物；结合体",
      exp: "A mixture is a combination of different things.",
      example: "Stir the mixture until it is smooth.",
    },
    {
      unit: 5,
      word: "least",
      meaning: "adv. & pron. 最小；最少",
      exp: "Least means the smallest amount. At least means not less than a certain amount.",
      example: "This is the least difficult of all the exercises.",
    },
    {
      unit: 5,
      word: "at least",
      meaning: "至少",
      exp: "At least means not less than a given number or amount.",
      example: "You need to sleep at least eight hours a night.",
    },
    {
      unit: 5,
      word: "secret",
      meaning: "n. 诀窍；秘密 adj. 秘密的",
      exp: "A secret is something that only a few people know and should not tell others.",
      example: "Can you keep a secret? I have a surprise for you.",
    },
    {
      unit: 5,
      word: "according to",
      meaning: "根据；依照",
      exp: "According to means based on what someone says or a source of information.",
      example: "According to the weather forecast, it will snow tomorrow.",
    },
    {
      unit: 5,
      word: "whenever",
      meaning: "adv. & conj. 每当",
      exp: "Whenever means at any time, or every time something happens.",
      example: "You can call me whenever you need help.",
    },
    {
      unit: 5,
      word: "item",
      meaning: "n. 项目；条",
      exp: "An item is a single thing in a list or a group.",
      example: "Please check each item on the shopping list.",
    },
    {
      unit: 5,
      word: "spaghetti",
      meaning: "n. 意大利细面条",
      exp: "Spaghetti is a type of long, thin Italian pasta.",
      example: "She made spaghetti with tomato sauce for dinner.",
    },
    {
      unit: 5,
      word: "spoon",
      meaning: "n. 一勺的量；勺",
      exp: "A spoon is a tool with a round hollow part and a handle, used for eating liquid food.",
      example: "She stirred her coffee with a spoon.",
    },
    {
      unit: 5,
      word: "slice",
      meaning: "n. 薄片 v. 切成薄片",
      exp: "A slice is a thin, flat piece cut from something. To slice means to cut.",
      example: "He cut a slice of bread from the loaf.",
    },
    {
      unit: 5,
      word: "couple",
      meaning: "n. 夫妻；情侣；两人",
      exp: "A couple is two people, especially two people in a relationship. A couple also means two.",
      example: "We waited a couple of minutes for the bus.",
    },
    {
      unit: 5,
      word: "island",
      meaning: "n. 岛",
      exp: "An island is a piece of land completely surrounded by water.",
      example: "They went on holiday to a small island in the south.",
    },
    {
      unit: 5,
      word: "wife",
      meaning: "n. 妻子",
      exp: "A wife is a married woman.",
      example: "He cooked dinner for his wife.",
    },
    {
      unit: 5,
      word: "separate adj.",
      meaning: "（使）分开",
      exp: "Separate means not connected or together. To separate means to move things apart.",
      example: "They sat in separate rooms to study.",
    },
    {
      unit: 5,
      word: "born",
      meaning: "v. 出生 adj. 天生的",
      exp: "Born means having come into the world at birth.",
      example: "She was born in a small town in the north.",
    },
    {
      unit: 5,
      word: "one by one",
      meaning: "逐个地；逐一地",
      exp: "One by one means each person or thing separately, in turn.",
      example: "The students answered the question one by one.",
    },
    {
      unit: 6,
      word: "yourself",
      meaning: "pron. 你自己；您自己",
      exp: "Yourself means your own person, used when you and the person doing the action are the same.",
      example: "You made this all by yourself — well done!",
    },
    {
      unit: 6,
      word: "engineer",
      meaning: "n. 工程师；技师",
      exp: "An engineer is a person who designs or builds machines, roads, or systems.",
      example: "She wants to become a software engineer.",
    },
    {
      unit: 6,
      word: "fashion",
      meaning: "n. 时装业；时尚",
      exp: "Fashion is the popular style of clothing and appearance at a certain time.",
      example: "She is very interested in fashion and design.",
    },
    {
      unit: 6,
      word: "designer",
      meaning: "n. 设计师",
      exp: "A designer is a person who plans and creates things like clothes or buildings.",
      example: "He is a graphic designer at a well-known company.",
    },
    {
      unit: 6,
      word: "director",
      meaning: "n. 导演；主任",
      exp: "A director is a person who manages a film or organisation.",
      example: "The film director won many awards for his work.",
    },
    {
      unit: 6,
      word: "musician",
      meaning: "n. 音乐家；乐师",
      exp: "A musician is a person who plays or writes music.",
      example: "She is a talented musician who plays the violin.",
    },
    {
      unit: 6,
      word: "fireman",
      meaning: "n. 消防队员",
      exp: "A fireman is a person whose job is to put out fires and rescue people.",
      example: "The fireman rescued the child from the burning building.",
    },
    {
      unit: 6,
      word: "AI",
      meaning: "人工智能",
      exp: "AI stands for Artificial Intelligence — computers that can think and learn.",
      example: "AI is being used to help doctors find diseases.",
    },
    {
      unit: 6,
      word: "essay",
      meaning: "n. 小品文；文章",
      exp: "An essay is a piece of writing about a particular topic.",
      example: "She wrote an essay about protecting the environment.",
    },
    {
      unit: 6,
      word: "classic",
      meaning: "n. 经典作品 adj. 最优秀的；古典的",
      exp: "A classic is something considered to be among the best of its type.",
      example: "Romeo and Juliet is a classic by Shakespeare.",
    },
    {
      unit: 6,
      word: "keep on doing sth",
      meaning: "继续做；反复做",
      exp: "To keep on doing something means to continue doing it without stopping.",
      example: "She kept on practising until she got it right.",
    },
    {
      unit: 6,
      word: "make sure",
      meaning: "确保；保证",
      exp: "To make sure means to check that something is done or is true.",
      example: "Make sure you lock the door when you leave.",
    },
    {
      unit: 6,
      word: "try one's best",
      meaning: "尽最大努力",
      exp: "To try your best means to make as much effort as you can.",
      example: "Always try your best, even if the task is hard.",
    },
    {
      unit: 6,
      word: "literature",
      meaning: "n. 文学；文献",
      exp: "Literature is written works, especially novels, plays, and poetry, that are considered good.",
      example: "She loves reading world literature.",
    },
    {
      unit: 6,
      word: "athlete",
      meaning: "n. 运动员",
      exp: "An athlete is a person who trains and competes in sport.",
      example: "She is a young athlete training for the Olympics.",
    },
    {
      unit: 6,
      word: "photographer",
      meaning: "n. 摄影师",
      exp: "A photographer is a person who takes photographs.",
      example: "The photographer took beautiful pictures of the mountains.",
    },
    {
      unit: 6,
      word: "painter",
      meaning: "n. 画家；油漆匠",
      exp: "A painter is an artist who paints pictures, or a person who paints buildings.",
      example: "The painter spent all day working on his new picture.",
    },
    {
      unit: 6,
      word: "businessman",
      meaning: "n. 商界人士；企业家",
      exp: "A businessman is a man who works in business or trade.",
      example: "He is a successful businessman who owns three companies.",
    },
    {
      unit: 6,
      word: "actress",
      meaning: "n. 女演员",
      exp: "An actress is a woman who acts in films or plays.",
      example: "She is a famous actress who has been in many films.",
    },
    {
      unit: 6,
      word: "lawyer",
      meaning: "n. 律师",
      exp: "A lawyer is a person who gives legal advice and represents people in court.",
      example:
        "She became a lawyer and works to help people with their rights.",
    },
    {
      unit: 6,
      word: "law",
      meaning: "n. 法律；法规",
      exp: "Law is the set of rules that a country or community must follow.",
      example: "It is against the law to steal.",
    },
    {
      unit: 6,
      word: "bath",
      meaning: "n. 洗澡；浴缸",
      exp: "A bath is when you wash your body in a bathtub filled with water. A bath is also the tub.",
      example: "She had a warm bath before going to bed.",
    },
    {
      unit: 6,
      word: "miss",
      meaning: "v. 想念；错过",
      exp: "To miss means to feel sad that someone or something is not there. To miss also means to not hit.",
      example: "I miss my old friends from primary school.",
    },
    {
      unit: 6,
      word: "be tired of",
      meaning: "对……感到厌倦",
      exp: "To be tired of something means to no longer enjoy it because you have had too much.",
      example: "She was tired of eating the same food every day.",
    },
    {
      unit: 6,
      word: "able",
      meaning: "adj. 能够；有才能的",
      exp: "Able means having the skill or power to do something.",
      example: "She is able to speak three languages.",
    },
    {
      unit: 6,
      word: "stick",
      meaning: "v. 粘贴；将……刺入 n. 枝条；棍",
      exp: "A stick is a long, thin piece of wood. To stick means to attach with glue or to hold firmly.",
      example: "She used tape to stick the photo to the wall.",
    },
    {
      unit: 6,
      word: "stick to sth",
      meaning: "坚持；维持",
      exp: "To stick to something means to continue doing it without giving up.",
      example: "Stick to your plan and you will succeed.",
    },
    {
      unit: 6,
      word: "resolution",
      meaning: "n. 决定；决议",
      exp: "A resolution is a firm decision to do or not do something.",
      example: "Her New Year's resolution is to read one book each month.",
    },
    {
      unit: 6,
      word: "have (...) to do with sb",
      meaning: "sth 与……有关系",
      exp: "To have something to do with someone or something means to be related to it.",
      example: "This problem has nothing to do with you.",
    },
    {
      unit: 6,
      word: "mini-goal",
      meaning: "n. 小目标",
      exp: "A mini-goal is a small, achievable step towards a bigger goal.",
      example: "She set a mini-goal to do ten minutes of reading every day.",
    },
    {
      unit: 6,
      word: "achieve",
      meaning: "v. 达到；完成",
      exp: "To achieve something means to successfully reach a goal after working for it.",
      example: "She achieved her dream of studying at a top university.",
    },
    {
      unit: 6,
      word: "physical",
      meaning: "adj. 身体的；物质的",
      exp: "Physical means relating to the body, or things you can touch and feel.",
      example: "Regular physical activity keeps you healthy.",
    },
    {
      unit: 6,
      word: "health",
      meaning: "n. 健康",
      exp: "Health is the condition of being well in body and mind.",
      example: "Good sleep is important for your health.",
    },
    {
      unit: 6,
      word: "healthily",
      meaning: "adv. 健康地",
      exp: "Healthily means in a way that is good for your health.",
      example: "Try to eat healthily and exercise regularly.",
    },
    {
      unit: 6,
      word: "take up",
      meaning: "开始学；开始从事",
      exp: "To take up something means to start a new hobby or activity.",
      example: "She decided to take up painting in her spare time.",
    },
    {
      unit: 6,
      word: "photography",
      meaning: "n. 照相术；摄影",
      exp: "Photography is the art or hobby of taking photos.",
      example: "He has a great eye for photography.",
    },
    {
      unit: 6,
      word: "self-improvement",
      meaning: "n. 自我改进",
      exp: "Self-improvement means working to become a better person in some way.",
      example: "Reading is a great way to achieve self-improvement.",
    },
    {
      unit: 6,
      word: "confident",
      meaning: "adj. 自信的；肯定的",
      exp: "Confident means feeling sure of yourself and your abilities.",
      example: "She was confident and spoke clearly in front of the class.",
    },
    {
      unit: 6,
      word: "organized",
      meaning: "adj. 有条理的；有组织的",
      exp: "Organized means arranging things in a neat and efficient way.",
      example: "He is very organized and never loses his things.",
    },
    {
      unit: 6,
      word: "wisely",
      meaning: "adv. 聪明地；明智地",
      exp: "Wisely means in a way that shows good judgement.",
      example: "She spent her money wisely.",
    },
    {
      unit: 6,
      word: "possible",
      meaning: "adj. 可能的；合理的",
      exp: "Possible means able to happen or be done.",
      example: "With hard work, anything is possible.",
    },
    {
      unit: 6,
      word: "paragraph",
      meaning: "n. 段；段落",
      exp: "A paragraph is a section of writing that deals with one main idea.",
      example: "Each paragraph in the essay should start on a new line.",
    },
    {
      unit: 6,
      word: "introduce",
      meaning: "v. 介绍；引见；引进",
      exp: "To introduce means to present someone to others for the first time, or to bring something new.",
      example: "Let me introduce you to my friend.",
    },
    {
      unit: 6,
      word: "meaning",
      meaning: "n. 意义；含义",
      exp: "Meaning is what a word or phrase stands for or represents.",
      example: "What is the meaning of this new word?",
    },
    {
      unit: 6,
      word: "fail",
      meaning: "v. 未能（做到）；失败",
      exp: "To fail means to not succeed at something.",
      example: "She did not fail — she got up and tried again.",
    },
    {
      unit: 6,
      word: "ahead",
      meaning: "adv. 提前；在前面",
      exp: "Ahead means further forward in time or space.",
      example: "Look ahead and plan for your future.",
    },
    {
      unit: 6,
      word: "put out",
      meaning: "扑灭；把……摆好",
      exp: "To put out means to stop something burning, or to place something outside.",
      example: "The firefighters put out the fire quickly.",
    },
    {
      unit: 6,
      word: "design",
      meaning: "v. 设计；计划 n. 设计",
      exp: "To design means to plan and create something. A design is the plan itself.",
      example: "She designed a beautiful poster for the school event.",
    },
    {
      unit: 6,
      word: "bridge",
      meaning: "n. 桥",
      exp: "A bridge is a structure built over a river or road so people can cross.",
      example: "They walked across the old stone bridge.",
    },
    {
      unit: 6,
      word: "final",
      meaning: "adj. 最后的 n. 决赛",
      exp: "Final means the last one, or a deciding competition.",
      example: "This is the final chance to sign up for the trip.",
    },
    {
      unit: 6,
      word: "confidence",
      meaning: "n. 信心；信任",
      exp: "Confidence is the belief that you can do things well.",
      example: "With practice, your confidence will grow.",
    },
    {
      unit: 6,
      word: "draw to a close",
      meaning: "即将结束",
      exp: "To draw to a close means to come near the end of something.",
      example: "As the year draws to a close, we reflect on what we learned.",
    },
    {
      unit: 6,
      word: "form",
      meaning: "v. 形成；组成 n. 类型；形式",
      exp: "A form is a type or kind of something. To form means to make or shape something.",
      example: "Clouds form when warm air rises and cools.",
    },
    {
      unit: 6,
      word: "relationship",
      meaning: "n. 关系；联系",
      exp: "A relationship is the way two people or things are connected to each other.",
      example: "She has a good relationship with her teacher.",
    },
    {
      unit: 6,
      word: "push-up",
      meaning: "n. 俯卧撑",
      exp: "A push-up is an exercise where you lower and raise your body using your arms.",
      example: "He does twenty push-ups every morning.",
    },
    {
      unit: 6,
      word: "energetic",
      meaning: "adj. 精力充沛的",
      exp: "Energetic means having a lot of energy and enthusiasm.",
      example: "The teacher was energetic and made the lesson fun.",
    },
    {
      unit: 6,
      word: "last but not least",
      meaning: "最后但同等重要的",
      exp: "Last but not least means the final item mentioned is just as important as the others.",
      example: "Last but not least, I want to thank all the volunteers.",
    },
    {
      unit: 7,
      word: "prediction",
      meaning: "n. 预测；预言",
      exp: "A prediction is a statement about what you think will happen in the future.",
      example: "Her prediction that it would rain was correct.",
    },
    {
      unit: 7,
      word: "outer",
      meaning: "adj. 外围的；外表的",
      exp: "Outer means on the outside, or farther from the centre.",
      example: "The outer walls of the castle were very thick.",
    },
    {
      unit: 7,
      word: "outer space",
      meaning: "太空；外层空间",
      exp: "Outer space is the area beyond Earth's atmosphere where the stars and planets are.",
      example: "Astronauts travel to outer space in rockets.",
    },
    {
      unit: 7,
      word: "worse",
      meaning: "adj. 更差的 adv. 更差",
      exp: "Worse means more bad than before.",
      example: "The weather got worse in the afternoon.",
    },
    {
      unit: 7,
      word: "take over",
      meaning: "接替；接管",
      exp: "To take over means to get control of something or start doing something someone else was doing.",
      example: "She took over the project when her partner was ill.",
    },
    {
      unit: 7,
      word: "sci-fi",
      meaning: "n. 科幻小说",
      exp: "Sci-fi, or science fiction, is a type of story about the future, space, or technology.",
      example: "He loves reading sci-fi books about space travel.",
    },
    {
      unit: 7,
      word: "ticket",
      meaning: "n. 票；券",
      exp: "A ticket is a small piece of paper that lets you enter a place or travel.",
      example: "She bought a ticket for the concert.",
    },
    {
      unit: 7,
      word: "positive",
      meaning: "adj. 乐观的；积极的",
      exp: "Positive means hopeful and optimistic, or certain and sure.",
      example: "Try to stay positive even when things are difficult.",
    },
    {
      unit: 7,
      word: "traffic",
      meaning: "n. 交通；运输",
      exp: "Traffic is the cars and vehicles moving on roads.",
      example: "There was heavy traffic on the road this morning.",
    },
    {
      unit: 7,
      word: "technology",
      meaning: "n. 科技；工艺",
      exp: "Technology is the use of science to create tools and systems to solve problems.",
      example: "New technology makes our lives easier.",
    },
    {
      unit: 7,
      word: "video",
      meaning: "n. 视频 v. 录视频",
      exp: "A video is a recording of moving pictures and sound.",
      example: "She watched a video about science online.",
    },
    {
      unit: 7,
      word: "transport n.",
      meaning: "交通运输系统",
      exp: "Transport means the system of vehicles used to move people or goods.",
      example: "Public transport in the city is very convenient.",
    },
    {
      unit: 7,
      word: "system",
      meaning: "n. 系统",
      exp: "A system is a set of connected parts that work together.",
      example: "The school has a good library system.",
    },
    {
      unit: 7,
      word: "efficient",
      meaning: "adj. 效率高的",
      exp: "Efficient means doing something well without wasting time or energy.",
      example: "She is an efficient worker who always finishes tasks on time.",
    },
    {
      unit: 7,
      word: "education",
      meaning: "n. 教育",
      exp: "Education is the process of learning and teaching.",
      example: "Good education is important for a better future.",
    },
    {
      unit: 7,
      word: "length",
      meaning: "n. 时长；长度",
      exp: "Length is the measurement of how long something is.",
      example: "What is the length of the swimming pool?",
    },
    {
      unit: 7,
      word: "topic",
      meaning: "n. 话题；题目",
      exp: "A topic is the subject that is being discussed or written about.",
      example: "The topic of our essay is climate change.",
    },
    {
      unit: 7,
      word: "partner",
      meaning: "n. 搭档；同伴",
      exp: "A partner is a person you do something together with.",
      example: "She worked on the project with her partner.",
    },
    {
      unit: 7,
      word: "shall",
      meaning: "modal v. 将要；将会",
      exp: "Shall is used to say something will happen in the future, or to make a suggestion.",
      example: "Shall we go for a walk?",
    },
    {
      unit: 7,
      word: "pass",
      meaning: "v. 及格；通过 n. 及格",
      exp: "To pass a test means to succeed at it. To pass means to go past something.",
      example: "She worked hard and passed all her exams.",
    },
    {
      unit: 7,
      word: "winner",
      meaning: "n. 优胜者；成功者",
      exp: "A winner is a person who wins a competition or game.",
      example: "The winner of the race received a gold medal.",
    },
    {
      unit: 7,
      word: "cure",
      meaning: "n. 药物；疗法 v. 治愈",
      exp: "A cure is a treatment that makes a sick person healthy again. To cure means to heal.",
      example: "Scientists are working on a cure for cancer.",
    },
    {
      unit: 7,
      word: "cancer",
      meaning: "n. 癌症",
      exp: "Cancer is a serious illness where cells in the body grow in an uncontrolled way.",
      example: "Regular check-ups can help doctors find cancer early.",
    },
    {
      unit: 7,
      word: "concert",
      meaning: "n. 音乐会",
      exp: "A concert is a live performance of music in front of an audience.",
      example: "We went to a classical music concert last night.",
    },
    {
      unit: 7,
      word: "cash",
      meaning: "n. 现金 v. 兑现",
      exp: "Cash is physical money — coins and notes.",
      example: "She paid for the book with cash.",
    },
    {
      unit: 7,
      word: "wallet",
      meaning: "n. 钱包",
      exp: "A wallet is a small, flat holder for cards and paper money.",
      example: "He left his wallet at home by mistake.",
    },
    {
      unit: 7,
      word: "guest",
      meaning: "n. 客人；宾客",
      exp: "A guest is a person who is invited to visit somewhere.",
      example: "We had ten guests at our dinner party.",
    },
    {
      unit: 7,
      word: "chief",
      meaning: "adj. 首席的 n. 首领",
      exp: "A chief is the leader of a group. Chief also means most important.",
      example: "The chief reason for success is hard work.",
    },
    {
      unit: 7,
      word: "researcher",
      meaning: "n. 研究者",
      exp: "A researcher is a person who studies a topic carefully to find new information.",
      example: "She is a researcher at a science institute.",
    },
    {
      unit: 7,
      word: "research",
      meaning: "n. & v. 研究；调查",
      exp: "Research is careful study to find out new information about something.",
      example: "He did a lot of research before writing his report.",
    },
    {
      unit: 7,
      word: "futurist",
      meaning: "n. 未来学家",
      exp: "A futurist is a person who thinks about and predicts what life will be like in the future.",
      example: "The futurist predicted that robots would do many jobs.",
    },
    {
      unit: 7,
      word: "everywhere",
      meaning: "adv. 到处",
      exp: "Everywhere means in all places or all parts of a place.",
      example: "She looked everywhere for her missing keys.",
    },
    {
      unit: 7,
      word: "robotics",
      meaning: "n. 机器人学",
      exp: "Robotics is the branch of science and engineering that deals with building and using robots.",
      example: "He studies robotics at university.",
    },
    {
      unit: 7,
      word: "industry",
      meaning: "n. 行业；工业",
      exp: "An industry is a group of businesses that make or sell similar things.",
      example: "The car industry employs many thousands of people.",
    },
    {
      unit: 7,
      word: "service",
      meaning: "n. 服务",
      exp: "A service is work done for others, or a system that provides something needed.",
      example: "The restaurant provides excellent service.",
    },
    {
      unit: 7,
      word: "disaster",
      meaning: "n. 灾难",
      exp: "A disaster is a sudden, terrible event that causes great harm.",
      example: "The earthquake was a natural disaster.",
    },
    {
      unit: 7,
      word: "emergency",
      meaning: "n. 突发事件；紧急情况",
      exp: "An emergency is a sudden dangerous situation that needs immediate action.",
      example: "Call the emergency number if someone is in danger.",
    },
    {
      unit: 7,
      word: "disappear",
      meaning: "v. 消失",
      exp: "To disappear means to stop being visible or to not be found.",
      example: "The sun disappeared behind the clouds.",
    },
    {
      unit: 7,
      word: "challenging",
      meaning: "adj. 挑战性的",
      exp: "Challenging means difficult but interesting and worth doing.",
      example: "Learning a new language is challenging but very rewarding.",
    },
    {
      unit: 7,
      word: "pilot",
      meaning: "n. 飞行员",
      exp: "A pilot is a person who flies an aircraft.",
      example: "She trained for years to become a commercial pilot.",
    },
    {
      unit: 7,
      word: "expert",
      meaning: "n. 专家 adj. 熟练的",
      exp: "An expert is a person who has great knowledge or skill in a subject.",
      example: "He is an expert in computer science.",
    },
    {
      unit: 7,
      word: "replace",
      meaning: "v. 代替；取代",
      exp: "To replace something means to use a new thing in the place of an old one.",
      example: "She replaced the broken light bulb.",
    },
    {
      unit: 7,
      word: "creativity",
      meaning: "n. 创造力",
      exp: "Creativity is the ability to think of new and original ideas.",
      example: "Art lessons help develop children's creativity.",
    },
    {
      unit: 7,
      word: "emotional",
      meaning: "adj. 情感的；情绪的",
      exp: "Emotional means relating to feelings and emotions.",
      example: "She gave an emotional speech at the ceremony.",
    },
    {
      unit: 7,
      word: "intelligence",
      meaning: "n. 智力；智慧",
      exp: "Intelligence is the ability to understand things and solve problems.",
      example: "She showed great intelligence in solving the puzzle.",
    },
    {
      unit: 7,
      word: "emotional intelligence",
      meaning: "情绪智力",
      exp: "Emotional intelligence is the ability to understand and manage your own feelings and others'.",
      example: "Emotional intelligence helps people work well with others.",
    },
    {
      unit: 7,
      word: "mention",
      meaning: "v. 提到；写到",
      exp: "To mention something means to say or write a little about it.",
      example: "Did he mention where he was going?",
    },
    {
      unit: 7,
      word: "refrigerator",
      meaning: "n. 冰箱",
      exp: "A refrigerator is a machine that keeps food cold to keep it fresh.",
      example: "She put the leftovers in the refrigerator.",
    },
    {
      unit: 7,
      word: "low",
      meaning: "adv. 低 adj. 低的 n. 低谷",
      exp: "Low means not high, or small in amount. Run low means to be nearly used up.",
      example: "Please speak in a low voice in the library.",
    },
    {
      unit: 7,
      word: "run low (on sth)",
      meaning: "即将用尽",
      exp: "To run low on something means to have almost none left.",
      example: "We are running low on milk — please buy some.",
    },
    {
      unit: 7,
      word: "accept",
      meaning: "v. 接受；相信",
      exp: "To accept something means to take it or agree to it.",
      example: "She accepted the award with a big smile.",
    },
    {
      unit: 7,
      word: "influence",
      meaning: "v. 影响 n. 影响",
      exp: "To influence means to have an effect on how someone thinks or acts.",
      example: "Good books can influence the way you think.",
    },
    {
      unit: 7,
      word: "creative",
      meaning: "adj. 创造性的",
      exp: "Creative means having the ability to make new and original things.",
      example: "She is a very creative student who loves art.",
    },
    {
      unit: 7,
      word: "impossible",
      meaning: "adj. 不可能的",
      exp: "Impossible means not able to happen or be done.",
      example: "Nothing is impossible if you work hard enough.",
    },
    {
      unit: 7,
      word: "quality",
      meaning: "n. 素质；质量 adj. 优质的",
      exp: "Quality is how good something is, or a characteristic of a person or thing.",
      example: "She always does work of high quality.",
    },
    {
      unit: 7,
      word: "develop",
      meaning: "v. 增强；发展",
      exp: "To develop means to grow, change, and improve over time.",
      example: "She developed her English skills by reading every day.",
    },
    {
      unit: 7,
      word: "German",
      meaning: "n. 德语；德国人 adj. 德国的",
      exp: "German means belonging to Germany, or the language spoken in Germany.",
      example: "She is learning German at school.",
    },
    {
      unit: 7,
      word: "valuable",
      meaning: "adj. 很有用的；宝贵的",
      exp: "Valuable means worth a lot of money, or very useful and important.",
      example: "Time is the most valuable thing we have.",
    },
    {
      unit: 7,
      word: "public",
      meaning: "adj. 公共的；公众的",
      exp: "Public means for everyone, or relating to the people in general.",
      example: "There is a public library near our school.",
    },
    {
      unit: 7,
      word: "medical",
      meaning: "adj. 医学的；医疗的",
      exp: "Medical means relating to medicine and the treatment of illness.",
      example: "She wants to work in the medical field.",
    },
    {
      unit: 7,
      word: "challenge",
      meaning: "n. 挑战 v. 挑战",
      exp: "A challenge is something difficult that tests your ability. To challenge means to compete.",
      example: "Climbing the mountain was a great challenge.",
    },
    {
      unit: 7,
      word: "task",
      meaning: "n. 任务；工作",
      exp: "A task is a piece of work you need to do.",
      example: "Her task was to write a one-page report.",
    },
    {
      unit: 7,
      word: "depend",
      meaning: "v. 取决于；依靠",
      exp: "To depend means to need something or someone.",
      example: "The result will depend on how hard we work.",
    },
    {
      unit: 7,
      word: "depend on",
      meaning: "upon 取决于；依靠",
      exp: "To depend on means to rely on or need something or someone.",
      example: "You can always depend on her to help.",
    },
    {
      unit: 7,
      word: "come over",
      meaning: "来访；拜访",
      exp: "To come over means to visit someone at their home.",
      example: "Come over to my house this afternoon.",
    },
    {
      unit: 7,
      word: "as long as",
      meaning: "只要",
      exp: "As long as means on the condition that, or provided that.",
      example: "You can go out as long as you finish your homework.",
    },
    {
      unit: 8,
      word: "communication",
      meaning: "n. 表达；交流",
      exp: "Communication is the process of sharing information with others.",
      example: "Good communication is important in a team.",
    },
    {
      unit: 8,
      word: "face to face",
      meaning: "面对面",
      exp: "Face to face means in person, with both people present.",
      example: "Let's talk face to face rather than by text.",
    },
    {
      unit: 8,
      word: "text message",
      meaning: "短信息；短信",
      exp: "A text message is a short written message sent by phone.",
      example: "She sent me a text message to say she was late.",
    },
    {
      unit: 8,
      word: "sign",
      meaning: "n. 手势；迹象 v. 签（名）",
      exp: "A sign is a mark or gesture that gives information. To sign means to write your name.",
      example: "He used sign language to communicate with his friend.",
    },
    {
      unit: 8,
      word: "speaker",
      meaning: "n. 说话者；发言者",
      exp: "A speaker is a person who talks to an audience, or a device that produces sound.",
      example: "The guest speaker talked about environmental protection.",
    },
    {
      unit: 8,
      word: "rehearsal",
      meaning: "n. 排演；排练",
      exp: "A rehearsal is a practice of a play, concert, or speech before the real performance.",
      example: "The actors had a rehearsal the night before the show.",
    },
    {
      unit: 8,
      word: "show sb around",
      meaning: "领某人参观",
      exp: "To show someone around means to take them to see a place and explain it.",
      example: "She showed the new student around the school.",
    },
    {
      unit: 8,
      word: "local",
      meaning: "adj. 当地的 n. 当地人",
      exp: "Local means relating to the area where you live or near where you are.",
      example: "We eat at a local restaurant every Friday.",
    },
    {
      unit: 8,
      word: "face-to-face adj.",
      meaning: "面对面的",
      exp: "Face-to-face means done in person, with both people present.",
      example: "A face-to-face conversation is often better than texting.",
    },
    {
      unit: 8,
      word: "professor",
      meaning: "n. 教授",
      exp: "A professor is a senior teacher at a university.",
      example: "The professor explained the research to the students.",
    },
    {
      unit: 8,
      word: "speech",
      meaning: "n. 演说；发言",
      exp: "A speech is a talk given to an audience.",
      example: "She gave an excellent speech at the graduation ceremony.",
    },
    {
      unit: 8,
      word: "argue",
      meaning: "v. 争论；争吵",
      exp: "To argue means to strongly disagree with someone and give your reasons.",
      example: "They began to argue about whose idea it was.",
    },
    {
      unit: 8,
      word: "make up (with sb)",
      meaning: "与……言归于好",
      exp: "To make up with someone means to end a disagreement and be friends again.",
      example: "After their argument, they made up and shook hands.",
    },
    {
      unit: 8,
      word: "in person",
      meaning: "亲自；亲身",
      exp: "In person means physically present, not on a screen or phone.",
      example: "She met her favourite author in person at the book fair.",
    },
    {
      unit: 8,
      word: "prefer",
      meaning: "v. 较喜欢",
      exp: "To prefer means to like one thing more than another.",
      example: "She prefers tea to coffee.",
    },
    {
      unit: 8,
      word: "calm",
      meaning: "adj. 镇静的 v. 使平静",
      exp: "Calm means peaceful and relaxed, without worry or strong emotion.",
      example: "He spoke in a calm voice to settle the argument.",
    },
    {
      unit: 8,
      word: "worry about",
      meaning: "为……担心",
      exp: "To worry about something means to feel nervous or anxious about it.",
      example: "Don't worry about the test — you have studied well.",
    },
    {
      unit: 8,
      word: "expression",
      meaning: "n. 表达方式",
      exp: "An expression is the way you show a feeling on your face, or a phrase or word.",
      example: "She had a happy expression on her face.",
    },
    {
      unit: 8,
      word: "chance",
      meaning: "n. 机会；可能性",
      exp: "A chance is an opportunity or a possibility.",
      example: "This is your chance to show what you can do.",
    },
    {
      unit: 8,
      word: "meeting",
      meaning: "n. 会面；会议",
      exp: "A meeting is when a group of people come together to talk about something.",
      example: "We had a class meeting to plan the school trip.",
    },
    {
      unit: 8,
      word: "difficulty",
      meaning: "n. 困难；难题",
      exp: "A difficulty is something that is hard to do or deal with.",
      example: "She had some difficulty understanding the question.",
    },
    {
      unit: 8,
      word: "right away",
      meaning: "立即；马上",
      exp: "Right away means immediately, without any delay.",
      example: "Come here right away — it is important!",
    },
    {
      unit: 8,
      word: "line",
      meaning: "n. 字行；便条；线",
      exp: "A line is a long, thin mark. A line of writing is a sentence. Drop a line means to write.",
      example: "Write your name on the top line of the paper.",
    },
    {
      unit: 8,
      word: "drop sb a line",
      meaning: "给……写信",
      exp: "To drop someone a line means to send them a short letter or message.",
      example: "Drop me a line when you arrive so I know you are safe.",
    },
    {
      unit: 8,
      word: "detail",
      meaning: "n. 细节；详情",
      exp: "A detail is a small but important piece of information.",
      example: "Please give me all the details of the event.",
    },
    {
      unit: 8,
      word: "reunion",
      meaning: "n. 团聚；重逢",
      exp: "A reunion is a meeting of people who have not seen each other for a long time.",
      example: "The family had a happy reunion at the New Year dinner.",
    },
    {
      unit: 8,
      word: "seriously",
      meaning: "adv. 严肃地；认真地",
      exp: "Seriously means in a way that is serious and not joking, or very much.",
      example: "She takes her studies seriously.",
    },
    {
      unit: 8,
      word: "training",
      meaning: "n. 训练；培训",
      exp: "Training is the process of learning skills for a job or sport.",
      example: "She went through months of training before the race.",
    },
    {
      unit: 8,
      word: "nervous",
      meaning: "adj. 担忧的；焦虑的",
      exp: "Nervous means feeling worried and anxious, especially before something important.",
      example: "She was nervous before her first performance.",
    },
    {
      unit: 8,
      word: "stranger",
      meaning: "n. 陌生人",
      exp: "A stranger is a person you do not know.",
      example: "Don't accept gifts from strangers.",
    },
    {
      unit: 8,
      word: "tip",
      meaning: "n. 指点；提示 v. 倾斜",
      exp: "A tip is a piece of useful advice. To tip means to tilt.",
      example: "The teacher gave us some tips for the exam.",
    },
    {
      unit: 8,
      word: "carefully",
      meaning: "adv. 认真地；仔细地",
      exp: "Carefully means with a lot of attention and caution.",
      example: "She read the instructions carefully before starting.",
    },
    {
      unit: 8,
      word: "show interest in sth",
      meaning: "对……表现出兴趣",
      exp: "To show interest in something means to act in a way that shows you care about it.",
      example: "He showed great interest in learning about science.",
    },
    {
      unit: 8,
      word: "listener",
      meaning: "n. 听者",
      exp: "A listener is a person who listens to what others say.",
      example: "A good listener makes people feel understood.",
    },
    {
      unit: 8,
      word: "point",
      meaning: "n. 观点；重点 v. 指向",
      exp: "A point is an idea in an argument, or a sharp end of something.",
      example: "That is a good point — I had not thought of that.",
    },
    {
      unit: 8,
      word: "surely",
      meaning: "adv. 想必；必定",
      exp: "Surely means certainly or without doubt.",
      example: "Surely you know the answer to that question!",
    },
    {
      unit: 8,
      word: "continue",
      meaning: "v. 持续；继续做",
      exp: "To continue means to go on doing something without stopping.",
      example: "She continued reading even though it was late.",
    },
    {
      unit: 8,
      word: "impolite",
      meaning: "adj. 不礼貌的",
      exp: "Impolite means rude and not showing respect for others.",
      example: "It is impolite to interrupt someone when they are speaking.",
    },
    {
      unit: 8,
      word: "personal",
      meaning: "adj. 个人的；私人的",
      exp: "Personal means private and relating to a particular person.",
      example: "She keeps a personal diary that no one else reads.",
    },
    {
      unit: 8,
      word: "argue with sb",
      meaning: "与某人争论",
      exp: "To argue with someone means to disagree with them strongly and discuss it.",
      example: "It is not nice to argue with your friends over small things.",
    },
    {
      unit: 8,
      word: "move on (to sth)",
      meaning: "换话题",
      exp: "To move on means to stop thinking about something and start something new.",
      example: "After the topic was clear, we moved on to the next question.",
    },
    {
      unit: 8,
      word: "sincere",
      meaning: "adj. 真诚的；诚实的",
      exp: "Sincere means honest and genuine, meaning what you say.",
      example: "She was sincere in her apology.",
    },
    {
      unit: 8,
      word: "find out",
      meaning: "查明；弄清",
      exp: "To find out means to discover or learn information.",
      example: "I need to find out what time the film starts.",
    },
    {
      unit: 8,
      word: "pay",
      meaning: "v. 付费；交纳 n. 工资",
      exp: "To pay means to give money in exchange for something.",
      example: "She paid for the lunch with her pocket money.",
    },
    {
      unit: 8,
      word: "attention",
      meaning: "n. 注意；专心",
      exp: "Attention is the act of focusing your mind on something.",
      example: "Please give your full attention to the lesson.",
    },
    {
      unit: 8,
      word: "pay attention (to ...)",
      meaning: "注意；关注",
      exp: "To pay attention means to focus carefully on something.",
      example: "Pay attention to the teacher and you will understand.",
    },
    {
      unit: 8,
      word: "be yourself",
      meaning: "行为自然；不做作",
      exp: "Be yourself means to act naturally and not pretend to be different.",
      example: "Just be yourself and people will like you.",
    },
    {
      unit: 8,
      word: "offer",
      meaning: "v. 提供；主动提出 n. 提议",
      exp: "To offer means to say you will give or do something for someone.",
      example: "She offered to help carry the heavy bags.",
    },
    {
      unit: 8,
      word: "reasonable",
      meaning: "adj. 公平的；合理的",
      exp: "Reasonable means fair, sensible, and not extreme.",
      example: "That is a reasonable price for the book.",
    },
    {
      unit: 8,
      word: "social",
      meaning: "adj. 社会的；社交的",
      exp: "Social means relating to people and how they live together.",
      example: "She has good social skills and makes friends easily.",
    },
    {
      unit: 8,
      word: "medium",
      meaning: "n. 媒介 adj. 中等的",
      exp: "A medium is a way of communicating. Medium also means middle-sized.",
      example: "Television is a popular medium for sharing news.",
    },
    {
      unit: 8,
      word: "social media",
      meaning: "社交媒体",
      exp: "Social media are websites and apps where people share information and messages.",
      example: "She posts photos on social media every week.",
    },
    {
      unit: 8,
      word: "trust",
      meaning: "n. & v. 信任；相信",
      exp: "To trust someone means to believe they are honest and will not hurt you.",
      example: "I trust my best friend completely.",
    },
    {
      unit: 8,
      word: "keep (...) away from ...",
      meaning: "（使）远离",
      exp: "To keep something away from means to prevent it from being near something.",
      example: "Keep sharp objects away from small children.",
    },
    {
      unit: 8,
      word: "misunderstanding",
      meaning: "n. 误解",
      exp: "A misunderstanding is when someone gets the wrong idea about something.",
      example: "The argument was just a misunderstanding.",
    },
    {
      unit: 8,
      word: "event",
      meaning: "n. 公开活动；重要事情",
      exp: "An event is something that happens, especially something planned and public.",
      example: "The school sports event is on Saturday.",
    },
    {
      unit: 8,
      word: "take place",
      meaning: "发生；进行",
      exp: "To take place means to happen at a particular time or location.",
      example: "The concert will take place in the school hall.",
    },
    {
      unit: 8,
      word: "cost",
      meaning: "n. 费用 v. 价格为",
      exp: "Cost is the amount of money you need to pay for something. To cost means to have a price.",
      example: "How much does the ticket cost?",
    },
    {
      unit: 8,
      word: "opportunity",
      meaning: "n. 机会；时机",
      exp: "An opportunity is a chance to do something good or helpful.",
      example: "Learning English is a great opportunity for the future.",
    },
    {
      unit: 8,
      word: "benefit",
      meaning: "v. 使受益 n. 益处",
      exp: "A benefit is a good result from something. To benefit means to get a good result.",
      example: "Exercise has many benefits for your health.",
    },
    {
      unit: 8,
      word: "benefit ... from ...",
      meaning: "从……获益",
      exp: "To benefit from something means to get something useful or good from it.",
      example: "You will benefit from reading more books.",
    },
    {
      unit: 8,
      word: "reply",
      meaning: "n. & v. 回答；回复",
      exp: "To reply means to answer someone who has spoken or written to you.",
      example: "She replied to the email the same day.",
    },
    {
      unit: 8,
      word: "honour",
      meaning: "n. 荣幸；尊敬 v. 表彰",
      exp: "Honour is great respect. An honour is something that makes you feel proud.",
      example: "It was an honour to meet such a kind and wise teacher.",
    },
    {
      unit: 8,
      word: "sincerely",
      meaning: "adv. 真诚地",
      exp: "Sincerely means in an honest and genuine way. It is used to end a formal letter.",
      example: "Yours sincerely is a common way to end a formal letter.",
    },
    {
      unit: 8,
      word: "opening",
      meaning: "adj. 开篇的 n. 开始",
      exp: "An opening is the beginning of something, like a letter or story.",
      example: "The opening sentence of the story was very exciting.",
    },
    {
      unit: 8,
      word: "closing",
      meaning: "adj. 结尾的 n. 关闭",
      exp: "A closing is the end of something, like the end of a letter.",
      example: "She signed off with a friendly closing line.",
    },
    {
      unit: 8,
      word: "sentence",
      meaning: "n. 句子 v. 判决",
      exp: "A sentence is a group of words that makes a complete thought.",
      example: "Write one sentence about your favourite animal.",
    },
    {
      unit: 8,
      word: "date",
      meaning: "n. 日期；约会 v. 注明日期",
      exp: "A date is the day, month, and year. A date is also a meeting with someone.",
      example: "Please write today's date at the top of your paper.",
    },
    {
      unit: 8,
      word: "clause",
      meaning: "n. 从句；分句",
      exp: "A clause is a group of words with a subject and a verb, often part of a longer sentence.",
      example: "In this sentence, 'when I was young' is a clause.",
    },
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
  const unitCbs = [
    ...els.k12Units.querySelectorAll('input:not([value="all"])'),
  ];

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
  const checkedUnits = [
    ...els.k12Units.querySelectorAll('input:not([value="all"]):checked'),
  ].map((cb) => parseInt(cb.value, 10));

  const filtered = data.filter((item) => checkedUnits.includes(item.unit));
  k12State.vocabulary = k12State.isSequential
    ? filtered.slice()
    : shuffle(filtered.slice());
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
    els.k12Flashcard.style.transition =
      "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)";
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
  return item.example || "";
}

function k12RenderHighlightedSentence(container, sentence, targetWord) {
  const lower = sentence.toLowerCase();
  const target = targetWord.toLowerCase();
  const idx = lower.indexOf(target);
  if (idx === -1) {
    container.textContent = sentence;
    return;
  }
  if (idx > 0)
    container.appendChild(document.createTextNode(sentence.slice(0, idx)));
  const mark = document.createElement("span");
  mark.className = "k12-word-highlight";
  mark.textContent = sentence.slice(idx, idx + target.length);
  container.appendChild(mark);
  if (idx + target.length < sentence.length) {
    container.appendChild(
      document.createTextNode(sentence.slice(idx + target.length)),
    );
  }
}

bindK12Events();
k12UpdatePool();

/* ========== SPC 1368 口语单词 ========== */

const SPC_MODS = [
  { name: "出行与落地", en: "Travel & Arrival", cls: "spc-m0" },
  { name: "校园与研究", en: "Campus & Research", cls: "spc-m1" },
  { name: "日常生活", en: "Daily Life", cls: "spc-m2" },
  { name: "社交与文化", en: "Social & Culture", cls: "spc-m3" },
  { name: "学术合作", en: "Academic Collab", cls: "spc-m4" },
  { name: "拓展场景", en: "Extended Scenes", cls: "spc-m5" },
];

const SPC_PATS = [
  { name: "存在与描述", hint: "There is/are... · The ... is/are ..." },
  { name: "位置与空间", hint: "... near/inside/on/under/between/across ..." },
  {
    name: "时间表达",
    hint: "... tomorrow/yesterday/next week/at ... /starts/lasts",
  },
  { name: "动作表达", hint: "I work/study/analyze/build/process/test ..." },
  {
    name: "交流表达",
    hint: "I want to/think/suggest/agree/believe/confirm ...",
  },
  {
    name: "请求与允许",
    hint: "Can you.../Could you.../Please.../You should/must ...",
  },
  {
    name: "原因与结果",
    hint: "... because .../This works/The result changed/improved",
  },
  {
    name: "比较与评价",
    hint: "... better/more accurate/faster/similar/different than ...",
  },
  {
    name: "计划与未来",
    hint: "We plan/will start/will develop/will submit ...",
  },
  {
    name: "经验表达",
    hint: "I have experience.../I learned/visited/worked/completed ...",
  },
  {
    name: "情绪与态度",
    hint: "I am happy/excited/curious/worried/proud/grateful ...",
  },
  {
    name: "社交与日常",
    hint: "Nice to meet you./Where are you from?/See you ...",
  },
];

const SPC_SC = [
  {
    id: 1,
    m: 0,
    name: "机场出发",
    prompt:
      "The visiting scholar is about to fly to your city. Describe the full departure process at the airport: where to check in, how to go through security, how to find the gate, and what happens when boarding.",
    vocab: [
      "airport",
      "plane",
      "seat",
      "ticket",
      "passport",
      "security",
      "gate",
      "travel",
    ],
    pats: [0, 1, 2],
  },
  {
    id: 2,
    m: 0,
    name: "飞机上交流",
    prompt:
      "You are sitting next to the visiting scholar on the plane. Introduce yourself, ask about their research visit, describe the flight time and in-flight service, and offer help with anything they need.",
    vocab: [
      "seat",
      "food",
      "drink",
      "coffee",
      "passenger",
      "flight",
      "time",
      "service",
    ],
    pats: [0, 4, 10],
  },
  {
    id: 3,
    m: 0,
    name: "入境检查",
    prompt:
      "You are guiding the scholar through airport immigration and customs. Explain what questions the officer might ask, what documents to prepare, what the form requires, and what to do at baggage claim.",
    vocab: [
      "passport",
      "visa",
      "officer",
      "question",
      "form",
      "information",
      "document",
      "country",
    ],
    pats: [3, 4, 5],
  },
  {
    id: 4,
    m: 0,
    name: "打车去城市",
    prompt:
      "You just cleared immigration and need a taxi to the university. Describe the route to the driver, the roads and bridges you pass, how long the trip takes, and what the city looks like from the window.",
    vocab: [
      "car",
      "driver",
      "road",
      "street",
      "bridge",
      "traffic",
      "map",
      "city",
      "station",
    ],
    pats: [1, 2, 6],
  },
  {
    id: 5,
    m: 0,
    name: "酒店入住",
    prompt:
      "Help the scholar check in at the hotel. Describe the room location, explain where everything is (floor, window, desk, bathroom), and mention the key services available at the hotel.",
    vocab: [
      "hotel",
      "room",
      "floor",
      "key",
      "window",
      "door",
      "desk",
      "bed",
      "shower",
      "service",
    ],
    pats: [1, 2, 4],
  },
  {
    id: 6,
    m: 0,
    name: "熟悉城市",
    prompt:
      "Give the scholar a verbal tour of your city. Mention key landmarks — the river, park, museum, local shops, markets, famous streets, and important buildings near the university.",
    vocab: [
      "city",
      "river",
      "park",
      "museum",
      "shop",
      "market",
      "street",
      "bridge",
      "building",
    ],
    pats: [0, 1, 2],
  },
  {
    id: 7,
    m: 0,
    name: "公共交通",
    prompt:
      "Explain how to use public transportation in your city. Describe the bus and train network, how to buy tickets, which platform to use, how to read the map, and where the nearest stop is.",
    vocab: [
      "bus",
      "train",
      "station",
      "ticket",
      "platform",
      "map",
      "line",
      "stop",
      "travel",
    ],
    pats: [1, 3, 5],
  },
  {
    id: 8,
    m: 0,
    name: "租房找住处",
    prompt:
      "The scholar needs temporary housing for their stay. Describe the available options — apartments, rooms, rental prices, contract requirements, the owner, and what furniture is usually included.",
    vocab: [
      "house",
      "apartment",
      "room",
      "rent",
      "price",
      "contract",
      "owner",
      "furniture",
    ],
    pats: [0, 7, 8],
  },
  {
    id: 9,
    m: 1,
    name: "初到校园",
    prompt:
      "Welcome the scholar to your university campus on their first day. Describe the key buildings, where the lab is located, where the offices are, and introduce the main staff they will work with.",
    vocab: [
      "university",
      "campus",
      "office",
      "building",
      "lab",
      "room",
      "student",
      "staff",
    ],
    pats: [0, 1, 3],
  },
  {
    id: 10,
    m: 1,
    name: "认识导师",
    prompt:
      "Introduce the visiting scholar to your professor or supervisor. Describe the professor's research background, the current project they are leading, the main study topic, and the research team.",
    vocab: [
      "professor",
      "teacher",
      "researcher",
      "project",
      "study",
      "research",
      "topic",
      "team",
    ],
    pats: [0, 4, 9],
  },
  {
    id: 11,
    m: 1,
    name: "实验室介绍",
    prompt:
      "Give the scholar a tour of your lab. Describe all the equipment, computers, cameras, devices, and data systems. Explain what experiments are currently running and what results you are tracking.",
    vocab: [
      "lab",
      "equipment",
      "computer",
      "camera",
      "device",
      "system",
      "data",
      "experiment",
    ],
    pats: [0, 3, 7],
  },
  {
    id: 12,
    m: 1,
    name: "研究项目",
    prompt:
      "Explain your research project to the visiting scholar. Describe the original plan, the central idea, the problem you are solving, the method you use, and what results you expect to find.",
    vocab: [
      "project",
      "plan",
      "idea",
      "problem",
      "method",
      "result",
      "test",
      "experiment",
    ],
    pats: [3, 4, 6],
  },
  {
    id: 13,
    m: 1,
    name: "学术讨论",
    prompt:
      "Have an academic discussion with the scholar about your research area. Share your view, present your analysis, describe the theory behind it, and ask about the evidence supporting their work.",
    vocab: [
      "question",
      "answer",
      "theory",
      "idea",
      "view",
      "analysis",
      "argument",
      "evidence",
    ],
    pats: [4, 5, 7],
  },
  {
    id: 14,
    m: 1,
    name: "数据分析",
    prompt:
      "Walk the scholar through your latest data analysis. Describe the data you collected, the model you built, the results you got, the key figures, and what the information shows so far.",
    vocab: [
      "data",
      "model",
      "result",
      "number",
      "figure",
      "sample",
      "information",
      "system",
    ],
    pats: [3, 6, 7],
  },
  {
    id: 15,
    m: 1,
    name: "写报告",
    prompt:
      "Discuss a written report or paper with the scholar. Describe the structure of the document: the main text, the ideas covered, the conclusion you reached, and the argument the paper makes.",
    vocab: [
      "report",
      "document",
      "text",
      "paper",
      "article",
      "note",
      "idea",
      "conclusion",
    ],
    pats: [3, 4, 8],
  },
  {
    id: 16,
    m: 1,
    name: "会议准备",
    prompt:
      "Prepare the scholar for an upcoming team meeting or talk. Explain the topic of the meeting, who the audience is, how to present the slides effectively, and what questions might come up.",
    vocab: [
      "meeting",
      "talk",
      "presentation",
      "slide",
      "topic",
      "audience",
      "question",
    ],
    pats: [2, 4, 5],
  },
  {
    id: 17,
    m: 1,
    name: "学术会议",
    prompt:
      "Describe an academic conference that you both will attend. Talk about the research being discussed, the network opportunities, the projects being introduced, and how collaboration might grow from it.",
    vocab: [
      "conference",
      "discussion",
      "research",
      "topic",
      "network",
      "project",
      "collaboration",
    ],
    pats: [9, 4, 8],
  },
  {
    id: 18,
    m: 1,
    name: "项目合作",
    prompt:
      "Propose a formal collaboration project with the scholar. Describe the team structure, the group goals, a concrete plan, the strategy for moving forward, and the expected outcomes of the program.",
    vocab: [
      "team",
      "group",
      "partner",
      "project",
      "plan",
      "strategy",
      "policy",
      "program",
    ],
    pats: [8, 4, 6],
  },
  {
    id: 19,
    m: 2,
    name: "餐厅点餐",
    prompt:
      "Take the scholar to a local restaurant. Describe the menu, recommend your favorite food and drinks, explain how to order, and chat about the bill and tipping customs.",
    vocab: [
      "menu",
      "table",
      "food",
      "drink",
      "coffee",
      "tea",
      "meat",
      "vegetable",
      "bill",
    ],
    pats: [0, 4, 5],
  },
  {
    id: 20,
    m: 2,
    name: "超市购物",
    prompt:
      "Go grocery shopping with the scholar at a supermarket. Describe where to find fruit, bread, milk, and other items. Explain how prices work, how to pay, and what to put in the bag.",
    vocab: [
      "shop",
      "market",
      "food",
      "fruit",
      "milk",
      "bread",
      "price",
      "money",
      "bag",
    ],
    pats: [1, 5, 3],
  },
  {
    id: 21,
    m: 2,
    name: "做饭生活",
    prompt:
      "Invite the scholar to cook a meal together. Describe the kitchen setup, the dishes and utensils you need, the steps to prepare the food, and what the finished meal will look like.",
    vocab: [
      "kitchen",
      "dish",
      "bowl",
      "plate",
      "knife",
      "spoon",
      "cook",
      "food",
      "meal",
    ],
    pats: [1, 3, 2],
  },
  {
    id: 22,
    m: 2,
    name: "健身运动",
    prompt:
      "Invite the scholar to join a sports activity with you. Describe the sport options available, the benefits of regular exercise, how the game or competition works, and where to go.",
    vocab: [
      "sport",
      "game",
      "football",
      "basketball",
      "run",
      "exercise",
      "team",
      "competition",
    ],
    pats: [3, 10, 8],
  },
  {
    id: 23,
    m: 2,
    name: "健康与医疗",
    prompt:
      "The scholar is not feeling well and needs to visit a hospital or clinic. Help them by describing how the process works: talking to the doctor, seeing the nurse, getting medicine, and what the health issue might be.",
    vocab: [
      "hospital",
      "doctor",
      "nurse",
      "medicine",
      "drug",
      "pill",
      "health",
      "disease",
    ],
    pats: [0, 5, 10],
  },
  {
    id: 24,
    m: 2,
    name: "日常作息",
    prompt:
      "Describe your typical daily routine to the scholar. Explain what you do in the morning, afternoon, evening, and night, including your work schedule, rest habits, and sleep patterns.",
    vocab: [
      "morning",
      "afternoon",
      "evening",
      "night",
      "work",
      "rest",
      "sleep",
      "schedule",
    ],
    pats: [2, 3, 9],
  },
  {
    id: 25,
    m: 2,
    name: "天气与季节",
    prompt:
      "Discuss the local weather and four seasons with the scholar. Describe what rain, snow, wind, heat, and cold are like here, and explain which season is the best time to visit.",
    vocab: [
      "weather",
      "rain",
      "snow",
      "wind",
      "hot",
      "cold",
      "season",
      "temperature",
    ],
    pats: [0, 2, 10],
  },
  {
    id: 26,
    m: 2,
    name: "网络与通讯",
    prompt:
      "Help the scholar set up their internet and mobile connection. Explain how to connect to wifi, use email, send messages, update apps on the phone, and manage communication.",
    vocab: [
      "internet",
      "email",
      "message",
      "phone",
      "information",
      "update",
      "connection",
    ],
    pats: [3, 4, 5],
  },
  {
    id: 27,
    m: 3,
    name: "认识新朋友",
    prompt:
      "Introduce the scholar to your group of friends and colleagues at a social event. Describe each person's role, their study or work background, how you know each other, and the group dynamic.",
    vocab: [
      "friend",
      "person",
      "people",
      "group",
      "student",
      "visitor",
      "colleague",
    ],
    pats: [0, 4, 9],
  },
  {
    id: 28,
    m: 3,
    name: "介绍自己",
    prompt:
      "Introduce yourself fully to the visiting scholar at a first meeting. Talk about your name, your current job or study, where you are from, your city background, family situation, and research experience.",
    vocab: [
      "name",
      "job",
      "country",
      "city",
      "family",
      "study",
      "work",
      "experience",
    ],
    pats: [0, 9, 4],
  },
  {
    id: 29,
    m: 3,
    name: "兴趣爱好",
    prompt:
      "Share your personal hobbies and interests with the scholar in a casual conversation. Talk about music, movies, sports, books, travel, and any games or creative hobbies you enjoy in your free time.",
    vocab: ["music", "movie", "sport", "book", "travel", "hobby", "game"],
    pats: [3, 10, 9],
  },
  {
    id: 30,
    m: 3,
    name: "周末活动",
    prompt:
      "Plan a fun weekend activity with the scholar. Suggest a day trip, a park visit, a museum tour, a picnic, or a barbecue. Describe what you will do, where you will go, and what to bring.",
    vocab: [
      "trip",
      "park",
      "museum",
      "picnic",
      "party",
      "barbecue",
      "travel",
      "photo",
    ],
    pats: [8, 5, 2],
  },
  {
    id: 31,
    m: 3,
    name: "城市文化",
    prompt:
      "Tell the scholar about the local culture of your city or country. Describe the history, traditional art forms, famous buildings, local festivals, and the cultural customs that visitors should know.",
    vocab: [
      "history",
      "culture",
      "art",
      "building",
      "tradition",
      "local",
      "festival",
    ],
    pats: [0, 2, 9],
  },
  {
    id: 32,
    m: 3,
    name: "礼仪与习惯",
    prompt:
      "Explain local customs and social etiquette to the scholar. Describe what counts as polite behavior here, cultural rules around communication, what to respect, and any habits that might be surprising.",
    vocab: [
      "custom",
      "rule",
      "polite",
      "behavior",
      "culture",
      "respect",
      "communication",
    ],
    pats: [5, 4, 7],
  },
  {
    id: 33,
    m: 3,
    name: "情绪表达",
    prompt:
      "Talk with the scholar about how you feel about the visit so far. Express your happiness, excitement, curiosity, and pride about the research work. Also mention any worries or surprises you have experienced.",
    vocab: [
      "happy",
      "excited",
      "nervous",
      "worried",
      "proud",
      "surprised",
      "curious",
    ],
    pats: [10, 4, 6],
  },
  {
    id: 34,
    m: 3,
    name: "冲突与误会",
    prompt:
      "Describe a small misunderstanding or confusion that happened during the visit. Explain the original problem, what mistake was made, why the confusion occurred, and how it was eventually resolved.",
    vocab: [
      "problem",
      "mistake",
      "misunderstanding",
      "explanation",
      "solution",
      "help",
    ],
    pats: [6, 4, 11],
  },
  {
    id: 35,
    m: 4,
    name: "学术报告",
    prompt:
      "Describe a research presentation you or the scholar will give. Talk about the research method, the main results, how to structure the talk, how to handle questions, and what discussion points to prepare.",
    vocab: [
      "presentation",
      "research",
      "method",
      "result",
      "question",
      "discussion",
    ],
    pats: [3, 4, 7],
  },
  {
    id: 36,
    m: 4,
    name: "研究反馈",
    prompt:
      "Give the scholar constructive feedback on their research. Suggest improvements, discuss the experiment results and data quality, share your analysis, and offer new ideas to strengthen the work.",
    vocab: [
      "suggestion",
      "improvement",
      "idea",
      "experiment",
      "data",
      "result",
      "analysis",
    ],
    pats: [4, 7, 6],
  },
  {
    id: 37,
    m: 4,
    name: "申请项目",
    prompt:
      "Discuss applying for a joint research grant together. Explain the grant proposal process, outline the project plan, describe the application requirements, and talk through the budget you will need.",
    vocab: [
      "fund",
      "grant",
      "proposal",
      "plan",
      "project",
      "application",
      "budget",
    ],
    pats: [8, 5, 3],
  },
  {
    id: 38,
    m: 4,
    name: "教学交流",
    prompt:
      "Discuss a teaching exchange opportunity with the scholar. Describe the course content, the students involved, the teaching methods you use, lesson planning, and the education goals for the program.",
    vocab: [
      "course",
      "class",
      "student",
      "teaching",
      "lesson",
      "education",
      "training",
    ],
    pats: [3, 4, 8],
  },
  {
    id: 39,
    m: 4,
    name: "职业发展",
    prompt:
      "Have a candid conversation with the scholar about career development in academia. Discuss job opportunities, different positions available, the experience required, important skills to build, and future directions.",
    vocab: ["career", "job", "position", "experience", "skill", "opportunity"],
    pats: [8, 9, 4],
  },
  {
    id: 40,
    m: 4,
    name: "告别与未来",
    prompt:
      "It is the last day of the visit. Say a warm farewell to the scholar. Talk about the experience you shared, the memories you made, the friendship that grew, future cooperation plans, and your hopes going forward.",
    vocab: [
      "experience",
      "memory",
      "friendship",
      "future",
      "cooperation",
      "plan",
    ],
    pats: [9, 8, 10],
  },
  {
    id: 41,
    m: 5,
    name: "自然旅行",
    prompt:
      "Take the scholar on a nature trip outside the city. Describe the mountains, rivers, forest, sky, and open fields. Talk about the plants and animals you see, the weather conditions, and the overall atmosphere.",
    vocab: [
      "mountain",
      "air",
      "light",
      "water",
      "river",
      "field",
      "forest",
      "sky",
      "stone",
    ],
    pats: [0, 1, 2],
  },
  {
    id: 42,
    m: 5,
    name: "公园动物观察",
    prompt:
      "Visit a park or nature reserve with the scholar to observe animals. Describe the birds, cats, dogs, insects, butterflies, and other creatures you spot together. Share what interests you most.",
    vocab: [
      "animal",
      "bird",
      "cat",
      "dog",
      "insect",
      "bee",
      "butterfly",
      "spider",
      "plant",
    ],
    pats: [0, 1, 10],
  },
  {
    id: 43,
    m: 5,
    name: "身体健康检查",
    prompt:
      "Go with the scholar for a routine health checkup at a clinic. Describe the body parts that are examined, what the test process involves, what the doctor checks, and what the results show.",
    vocab: [
      "body",
      "head",
      "eye",
      "ear",
      "heart",
      "lung",
      "muscle",
      "bone",
      "health",
    ],
    pats: [0, 3, 10],
  },
  {
    id: 44,
    m: 5,
    name: "家庭聊天",
    prompt:
      "Chat with the scholar about your families in a relaxed conversation. Describe your parents, siblings, husband or wife, children, and grandparents. Ask about their family background too.",
    vocab: [
      "parent",
      "daughter",
      "son",
      "father",
      "mother",
      "brother",
      "sister",
      "husband",
      "wife",
    ],
    pats: [0, 9, 4],
  },
  {
    id: 45,
    m: 5,
    name: "宿舍整理",
    prompt:
      "Help the scholar organize and settle into their dorm room. Describe the furniture — bed, chair, desk, table — where to put their belongings, and how to keep the space clean and comfortable.",
    vocab: [
      "room",
      "floor",
      "wall",
      "window",
      "door",
      "furniture",
      "bed",
      "chair",
      "desk",
      "table",
    ],
    pats: [1, 3, 5],
  },
  {
    id: 46,
    m: 5,
    name: "城市新闻讨论",
    prompt:
      "Discuss a recent news story about your city with the scholar. Describe the event, the people involved, the cause of what happened, the result, and share your opinion on the issue.",
    vocab: [
      "news",
      "event",
      "information",
      "fact",
      "evidence",
      "report",
      "update",
      "notice",
    ],
    pats: [6, 4, 7],
  },
  {
    id: 47,
    m: 5,
    name: "社会问题讨论",
    prompt:
      "Have a thoughtful discussion with the scholar about a current social issue. Explain the problem clearly, describe its cause, present different views that people hold, and suggest possible solutions.",
    vocab: [
      "problem",
      "people",
      "government",
      "policy",
      "change",
      "society",
      "future",
      "reason",
    ],
    pats: [6, 7, 4],
  },
  {
    id: 48,
    m: 5,
    name: "文化博物馆",
    prompt:
      "Visit a cultural or history museum with the scholar. Describe the history section, the art on display, traditional objects in the collection, the architecture of the building, and what you both find most interesting.",
    vocab: [
      "museum",
      "history",
      "culture",
      "art",
      "building",
      "tradition",
      "collection",
      "guide",
    ],
    pats: [0, 1, 9],
  },
];

const spcState = {
  view: "home",
  module: null,
  scene: null,
  cdNum: 3,
  timeLeft: 60,
  transcript: "",
  interim: "",
  feedback: null,
  apiKey: (() => {
    try {
      return localStorage.getItem("spc_key") || "";
    } catch (e) {
      return "";
    }
  })(),
};

let spcRecognition = null,
  spcTimerInt = null,
  spcCdInt = null;

function spcRender() {
  const app = document.getElementById("spc-app");
  if (!app) return;
  const views = {
    home: spcVHome,
    module: spcVModule,
    detail: spcVDetail,
    countdown: spcVCountdown,
    recording: spcVRecording,
    analyzing: spcVAnalyzing,
    feedback: spcVFeedback,
  };
  app.innerHTML = views[spcState.view]();
}

function spcVHome() {
  const cnt = SPC_SC.length;
  const keySaved = spcState.apiKey ? "✓ Key saved" : "Enter API Key";
  return `
  <div>
    <div style="margin-bottom:20px">
      <div class="spc-label" style="margin-bottom:6px">60s · ${cnt} scenes · AI feedback</div>
      <p style="margin-top:8px;color:var(--muted)">选一个场景，限时60秒说英语，AI用中文反馈你的词汇覆盖、句型多样性和语法。</p>
    </div>

    <button class="spc-btn spc-btn-fire spc-btn-block" onclick="spcRandomScene()">⚡ 随机挑战一个场景</button>

    <div style="margin:18px 0 8px" class="spc-label">按模块练习</div>
    <div class="spc-module-grid">
      ${SPC_MODS.map((m, i) => {
        const n = SPC_SC.filter((s) => s.m === i).length;
        return `<div class="spc-module-card ${m.cls}" onclick="spcGoModule(${i})">
          <div class="spc-mc-name">${m.name}</div>
          <div class="spc-mc-num">${String(n).padStart(2, "0")}</div>
          <div class="spc-mc-sub">${m.en}</div>
        </div>`;
      }).join("")}
    </div>

    <div class="spc-apikey-section">
      <div class="spc-label">${keySaved}</div>
      <div style="display:flex;gap:8px;align-items:flex-end">
        <div style="flex:1">
          <input type="password" id="spc-apikey-input" placeholder="sk-ant-api..." value="${spcState.apiKey}">
        </div>
        <button class="spc-btn spc-btn-ghost spc-btn-sm" onclick="spcSaveKey()" style="margin-top:6px;white-space:nowrap">保存</button>
      </div>
      <p style="margin-top:6px;font-size:11px;color:var(--muted)">输入 Anthropic API Key 获取 AI 反馈，否则将使用本地评分。</p>
    </div>
  </div>`;
}

function spcVModule() {
  const mi = spcState.module,
    m = SPC_MODS[mi];
  const scenes = SPC_SC.filter((s) => s.m === mi);
  return `
  <div class="${m.cls}">
    <button class="spc-back-btn" onclick="spcBack()">← 返回</button>
    <div style="margin-bottom:16px">
      <div class="spc-label" style="margin-bottom:4px">${m.en}</div>
      <h3>${m.name}</h3>
      <p style="margin-top:4px;color:var(--muted)">${scenes.length} 个场景 · 每次60秒</p>
    </div>
    ${scenes
      .map(
        (s) => `
    <div class="spc-scene-item ${m.cls}" onclick="spcGoDetail(${s.id})">
      <div>
        <div class="spc-scene-item-name">${s.name}</div>
        <div class="spc-scene-item-vocab">${s.vocab.slice(0, 5).join(" · ")}</div>
      </div>
      <span class="spc-scene-item-arrow">›</span>
    </div>`,
      )
      .join("")}
  </div>`;
}

function spcVDetail() {
  const s = spcState.scene,
    m = SPC_MODS[s.m];
  const rp = s.pats.map((i) => SPC_PATS[i]);
  return `
  <div class="${m.cls}">
    <button class="spc-back-btn" onclick="spcBack()">← 返回</button>
    <div style="margin-bottom:16px">
      <div class="spc-label" style="margin-bottom:4px">${m.name} · ${m.en}</div>
      <h3>${s.name}</h3>
    </div>

    <div class="spc-card spc-card-accent">
      <div class="spc-label" style="margin-bottom:8px">📋 任务说明</div>
      <p style="color:var(--ink);line-height:1.75">${s.prompt}</p>
    </div>

    <div class="spc-card">
      <div class="spc-label" style="margin-bottom:8px">🎯 目标词汇 — 尽量覆盖这些词</div>
      <div class="spc-pills">
        ${s.vocab.map((w) => `<span class="spc-chip spc-chip-fire">${w}</span>`).join("")}
      </div>
    </div>

    <div class="spc-card">
      <div class="spc-label" style="margin-bottom:10px">💬 建议句型结构</div>
      ${rp
        .map(
          (p) => `
      <div class="spc-pat-hint">
        <div class="spc-pat-hint-name">${p.name}</div>
        <div class="spc-pat-hint-text">${p.hint}</div>
      </div>`,
        )
        .join("")}
    </div>

    <button class="spc-btn spc-btn-fire spc-btn-block" onclick="spcStartCountdown()" style="margin-top:4px">
      ▶ 开始 60 秒挑战
    </button>
  </div>`;
}

function spcVCountdown() {
  const s = spcState.scene,
    m = SPC_MODS[s.m];
  return `
  <div class="spc-countdown-display ${m.cls}">
    <div class="spc-label" style="margin-bottom:8px">${s.name}</div>
    <div id="spc-cd-num" class="spc-cd-num">${spcState.cdNum}</div>
    <p style="margin-top:16px;color:var(--muted)">深呼吸，准备开口！</p>
  </div>`;
}

function spcVRecording() {
  const s = spcState.scene,
    m = SPC_MODS[s.m];
  const t = spcState.timeLeft;
  const circ = 2 * Math.PI * 52;
  const offset = circ * (1 - t / 60);
  const ringColor = t > 20 ? "var(--accent)" : "var(--bad)";
  return `
  <div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <div style="flex:1">
        <div class="spc-label ${m.cls}" style="margin-bottom:2px">${m.name}</div>
        <h3>${s.name}</h3>
      </div>
    </div>

    <div class="spc-timer-container">
      <svg class="spc-timer-svg" width="120" height="120" viewBox="0 0 120 120">
        <circle class="spc-ring-bg" cx="60" cy="60" r="52"/>
        <circle id="spc-ring" class="spc-ring-fill" cx="60" cy="60" r="52"
          stroke="${ringColor}"
          stroke-dasharray="${circ.toFixed(2)}"
          stroke-dashoffset="${offset.toFixed(2)}"/>
      </svg>
      <div id="spc-tnum" class="spc-timer-num" style="color:${ringColor}">${t}</div>
      <div class="spc-label" style="margin-top:10px">🎙 正在录音...</div>
    </div>

    <div class="spc-transcript" id="spc-tbox">
      <span id="spc-ft">${spcState.transcript}</span><span class="spc-interim" id="spc-it">${spcState.interim}</span>${!spcState.transcript && !spcState.interim ? '<span class="spc-placeholder">开口说英语，文字会出现在这里...</span>' : ""}
    </div>

    <div style="display:flex;gap:8px">
      <button class="spc-btn spc-btn-ghost" style="flex:1" onclick="spcStopRec()">⏹ 提前结束</button>
    </div>

    <div class="spc-card" style="margin-top:12px">
      <div class="spc-label" style="margin-bottom:6px">词汇提示</div>
      <div class="spc-pills">${s.vocab.map((w) => `<span class="spc-chip">${w}</span>`).join("")}</div>
    </div>
  </div>`;
}

function spcVAnalyzing() {
  return `
  <div style="text-align:center;padding:60px 20px">
    <div class="spc-spinner"></div>
    <h3 style="margin-top:4px">AI 正在分析...</h3>
    <p style="margin-top:8px;color:var(--muted)">评估词汇覆盖率 · 句型多样性 · 语法准确度</p>
  </div>`;
}

function spcVFeedback() {
  const s = spcState.scene,
    m = SPC_MODS[s.m],
    f = spcState.feedback;
  if (!f) return `<p>分析失败，请重试。</p>`;
  const sc = (n) =>
    n >= 8 ? "var(--ok)" : n >= 5 ? "var(--accent-2)" : "var(--bad)";
  const totalC = sc(f.totalScore);
  return `
  <div>
    <div class="spc-feedback-header">
      <div>
        <div class="spc-label ${m.cls}" style="margin-bottom:4px">${m.name} · ${s.name}</div>
        <h3>练习反馈</h3>
      </div>
      <div style="text-align:center">
        <div class="spc-total-score" style="color:${totalC}">${f.totalScore}</div>
        <div class="spc-label">/ 10 综合分</div>
      </div>
    </div>

    <div class="spc-card">
      ${[
        ["词汇覆盖率", f.vocabScore, "#14b8a6"],
        ["句型多样性", f.patternScore, "#8b5cf6"],
        ["语法准确度", f.grammarScore, "#3b82f6"],
      ]
        .map(
          ([lb, sc2, c]) => `
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px">
          <span style="font-size:13px">${lb}</span>
          <span style="font-size:13px;font-weight:700;color:${c}">${sc2}/10</span>
        </div>
        <div class="spc-bar-wrap"><div class="spc-bar-fill" style="width:${sc2 * 10}%;background:${c}"></div></div>
      </div>`,
        )
        .join("")}
    </div>

    <div class="spc-card">
      <div class="spc-label" style="margin-bottom:8px">🎯 词汇覆盖情况</div>
      <div class="spc-pills">
        ${(f.vocabUsed || []).map((w) => `<span class="spc-chip spc-fw-used">✓ ${w}</span>`).join("")}
        ${(f.vocabMissed || []).map((w) => `<span class="spc-chip spc-fw-missed">${w}</span>`).join("")}
      </div>
    </div>

    ${
      f.bestSentence
        ? `
    <div class="spc-card" style="border-color:rgba(22,101,52,.3);background:rgba(22,101,52,.05)">
      <div class="spc-label" style="color:var(--ok);margin-bottom:6px">⭐ 说得最好的句子</div>
      <p style="color:var(--ok);font-style:italic;font-size:14px">"${f.bestSentence}"</p>
    </div>`
        : ""
    }

    ${
      f.grammarTips && f.grammarTips.length > 0
        ? `
    <div class="spc-card">
      <div class="spc-label" style="margin-bottom:8px">📝 语法提示</div>
      ${f.grammarTips.map((t) => `<div style="padding:8px 0;border-bottom:1px solid var(--line);font-size:13px;color:var(--muted)">⚠ ${t}</div>`).join("")}
    </div>`
        : ""
    }

    ${
      f.patternComment
        ? `
    <div class="spc-card" style="border-color:rgba(139,92,246,.3);background:rgba(139,92,246,.05)">
      <div class="spc-label" style="color:#8b5cf6;margin-bottom:6px">💬 句型分析</div>
      <p style="color:#8b5cf6;font-size:14px">${f.patternComment}</p>
    </div>`
        : ""
    }

    <div class="spc-card" style="border-color:rgba(217,119,6,.3);background:rgba(217,119,6,.05)">
      <div class="spc-label" style="color:var(--accent-2);margin-bottom:6px">💡 最重要的改进建议</div>
      <p style="color:var(--accent-2);font-size:14px">${f.suggestion || ""}</p>
    </div>

    ${
      f.encouragement
        ? `
    <div style="text-align:center;padding:12px;font-size:13px;color:var(--muted)">🎉 ${f.encouragement}</div>`
        : ""
    }

    <div class="spc-card" style="margin-top:4px">
      <div class="spc-label" style="margin-bottom:6px">📄 你说的内容</div>
      <p style="font-size:13px;color:var(--muted);line-height:1.8">${spcState.transcript || "（未检测到语音内容）"}</p>
    </div>

    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="spc-btn spc-btn-ghost" style="flex:1" onclick="spcRetry()">🔄 重新挑战</button>
      <button class="spc-btn spc-btn-fire" style="flex:1" onclick="spcNextRandom()">⚡ 随机下一个</button>
    </div>
  </div>`;
}

function spcBack() {
  if (spcState.view === "module") spcState.view = "home";
  else if (spcState.view === "detail")
    spcState.view = spcState.module != null ? "module" : "home";
  else spcState.view = "home";
  spcRender();
}

function spcGoModule(i) {
  spcState.module = i;
  spcState.view = "module";
  spcRender();
}

function spcGoDetail(id) {
  spcState.scene = SPC_SC.find((s) => s.id === id);
  spcState.view = "detail";
  spcRender();
}

function spcRandomScene() {
  const s = SPC_SC[Math.floor(Math.random() * SPC_SC.length)];
  spcState.scene = s;
  spcState.module = s.m;
  spcState.view = "detail";
  spcRender();
}

function spcSaveKey() {
  const val = document.getElementById("spc-apikey-input").value.trim();
  spcState.apiKey = val;
  try {
    localStorage.setItem("spc_key", val);
  } catch (e) {}
  spcRender();
}

function spcStartCountdown() {
  spcState.cdNum = 3;
  spcState.transcript = "";
  spcState.interim = "";
  spcState.feedback = null;
  spcState.view = "countdown";
  spcRender();
  spcCdInt = setInterval(() => {
    spcState.cdNum--;
    const el = document.getElementById("spc-cd-num");
    if (el) {
      el.textContent = spcState.cdNum;
      el.style.animation = "none";
      void el.offsetWidth;
      el.style.animation = "";
    }
    if (spcState.cdNum <= 0) {
      clearInterval(spcCdInt);
      spcStartRec();
    }
  }, 1000);
}

function spcStartRec() {
  spcState.timeLeft = 60;
  spcState.view = "recording";
  spcRender();

  spcTimerInt = setInterval(() => {
    spcState.timeLeft--;
    const tn = document.getElementById("spc-tnum");
    const rg = document.getElementById("spc-ring");
    if (tn) tn.textContent = spcState.timeLeft;
    if (rg) {
      const circ = 2 * Math.PI * 52;
      rg.setAttribute(
        "stroke-dashoffset",
        (circ * (1 - spcState.timeLeft / 60)).toFixed(2),
      );
      const c = spcState.timeLeft > 20 ? "var(--accent)" : "var(--bad)";
      rg.setAttribute("stroke", c);
      if (tn) tn.style.color = c;
    }
    if (spcState.timeLeft <= 0) spcStopRec();
  }, 1000);

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    spcRecognition = new SR();
    spcRecognition.lang = "en-US";
    spcRecognition.continuous = true;
    spcRecognition.interimResults = true;
    spcRecognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal)
          spcState.transcript += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      spcState.interim = interim;
      const ft = document.getElementById("spc-ft"),
        it = document.getElementById("spc-it");
      if (ft) ft.textContent = spcState.transcript;
      if (it) it.textContent = interim;
      const tb = document.getElementById("spc-tbox");
      if (tb) tb.scrollTop = tb.scrollHeight;
    };
    spcRecognition.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted")
        console.warn(e.error);
    };
    spcRecognition.onend = () => {
      if (spcState.view === "recording" && spcState.timeLeft > 0) {
        try {
          spcRecognition.start();
        } catch (e) {}
      }
    };
    try {
      spcRecognition.start();
    } catch (e) {}
  } else {
    const tb = document.getElementById("spc-tbox");
    if (tb)
      tb.innerHTML = `<textarea id="spc-manual" style="width:100%;background:transparent;border:none;outline:none;resize:none;min-height:80px;font-size:14px;color:var(--ink)" placeholder="浏览器不支持语音识别（请用 Chrome），可在此手动输入英文..."></textarea>`;
    document
      .getElementById("spc-manual")
      ?.addEventListener("input", function () {
        spcState.transcript = this.value;
      });
  }
}

function spcStopRec() {
  clearInterval(spcTimerInt);
  if (spcRecognition) {
    try {
      spcRecognition.stop();
    } catch (e) {}
    spcRecognition = null;
  }
  if (spcState.interim) {
    spcState.transcript += spcState.interim;
    spcState.interim = "";
  }
  const m = document.getElementById("spc-manual");
  if (m) spcState.transcript = m.value;
  spcGetAIFeedback();
}

function spcRetry() {
  spcState.view = "detail";
  spcRender();
}
function spcNextRandom() {
  spcRandomScene();
}

async function spcGetAIFeedback() {
  spcState.view = "analyzing";
  spcRender();
  const s = spcState.scene;
  const tx = spcState.transcript.trim();

  if (!tx) {
    spcState.feedback = spcLocalFeedback(s, "");
    spcState.view = "feedback";
    spcRender();
    return;
  }

  const patNames = s.pats.map((i) => SPC_PATS[i].name).join("、");
  const prompt = `你是一位专业的英语口语教练，正在评估学习者的学术访问场景口语练习。

【场景名称】${s.name}
【场景任务】${s.prompt}
【目标词汇（共${s.vocab.length}个）】${s.vocab.join(", ")}
【建议句型模块】${patNames}
【学习者的口语内容】
"""
${tx}
"""

请用中文给出专业的口语评估反馈。只返回以下JSON格式，不要有任何其他文字、解释或markdown标记：
{
  "totalScore": 数字1-10,
  "vocabScore": 数字1-10,
  "patternScore": 数字1-10,
  "grammarScore": 数字1-10,
  "vocabUsed": ["已使用的目标词"],
  "vocabMissed": ["未使用的目标词"],
  "bestSentence": "说得最自然流利的一句原话（英文）",
  "grammarTips": ["具体语法问题1（中文）", "具体语法问题2（中文）"],
  "patternComment": "句型多样性点评（中文，1-2句）",
  "suggestion": "最重要的一条改进建议（中文，一句话，具体可操作）",
  "encouragement": "一句鼓励的话（中文，真诚不浮夸）"
}`;

  try {
    const headers = {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    };
    if (spcState.apiKey) headers["x-api-key"] = spcState.apiKey;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const raw = data.content?.find((c) => c.type === "text")?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    spcState.feedback = JSON.parse(clean);
  } catch (err) {
    console.warn("SPC API error:", err);
    spcState.feedback = spcLocalFeedback(s, tx);
  }
  spcState.view = "feedback";
  spcRender();
}

function spcLocalFeedback(s, tx) {
  const lower = tx.toLowerCase();
  const used = s.vocab.filter((w) => lower.includes(w.toLowerCase()));
  const missed = s.vocab.filter((w) => !lower.includes(w.toLowerCase()));
  const vs = Math.round((used.length / s.vocab.length) * 10);
  const words = tx.split(/\s+/).filter(Boolean).length;
  const sents = (tx.match(/[.!?]+/g) || []).length || 1;
  const avgLen = words / sents;
  const ps = Math.min(
    10,
    Math.round(
      3 +
        (sents > 3 ? 2 : 0) +
        (avgLen > 8 ? 2 : 0) +
        (tx.includes("because") ? 1 : 0) +
        (tx.includes("however") || tx.includes("but") ? 1 : 0),
    ),
  );
  return {
    totalScore: Math.round((vs + ps + 6) / 3),
    vocabScore: vs,
    patternScore: ps || 5,
    grammarScore: 6,
    vocabUsed: used,
    vocabMissed: missed,
    bestSentence: tx.split(/[.!?]/)[0]?.trim() || "",
    grammarTips: tx ? ["（需要 API Key 才能获取详细语法分析）"] : [],
    patternComment: tx
      ? `检测到 ${sents} 句话，使用了 ${used.length}/${s.vocab.length} 个目标词。`
      : "未检测到语音内容。",
    suggestion: spcState.apiKey
      ? "请检查 API Key 是否正确。"
      : "配置 Anthropic API Key 可获得完整 AI 语法分析和句型反馈。",
    encouragement: tx
      ? "每次开口练习都是进步，继续加油！"
      : "下次开口试试，语言只有说出来才会进步！",
  };
}

spcRender();
