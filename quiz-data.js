const PLAN_KEYS = ["exames", "active", "veloz", "black", "bitfut"];
const SAFE_TIEBREAK_ORDER = ["exames", "black", "active", "veloz", "bitfut"];

const plans = {
  exames: {
    name: "Exame",
    tag: "plano_exames",
    short: "Entrada mais leve para começar gastando pouco.",
    headline: "Seu caminho mais coerente agora é o Exame.",
    description:
      "Pelo seu momento, o Exame parece ser o caminho mais adequado. Ele combina com quem quer começar gastando menos, entender as regras com mais orientação e avançar sem entrar no escuro.",
    nextTitle: "Opções de Exame",
    cta: "Ver opções de Exame",
    image: "/assets/plan-exames.png",
    videoUrl: "https://www.youtube.com/watch?v=qdt8HNLkZeI",
    options: [
      {
        name: "Exame Conservador",
        detail: "Caminho mais controlado para validação.",
        url: "https://checkout.grupomide.com.br/?product_id=672a8d145fbb0200c0816008&utm_source=quiz_mide&utm_medium=quiz&utm_campaign=exame",
      },
      {
        name: "Exame Arrojado",
        detail: "Mais espaço para quem já aceita um pouco mais de exposição.",
        url: "https://checkout.grupomide.com.br/?product_id=672a8ce95fbb0200c0815fee&utm_source=quiz_mide&utm_medium=quiz&utm_campaign=exame",
      },
      {
        name: "Exame Agressivo",
        detail: "Perfil mais intenso dentro da linha de Exames.",
        url: "https://checkout.grupomide.com.br/?product_id=672a8ca65fbb0200c0815fd4&utm_source=quiz_mide&utm_medium=quiz&utm_campaign=exame",
      },
      {
        name: "Exame MIDE Plus",
        detail: "Variação com condições específicas da linha.",
        url: "https://checkout.grupomide.com.br/?product_id=672bae2139939b00c15faa7b&utm_source=quiz_mide&utm_medium=quiz&utm_campaign=exame",
      },
    ],
  },
  active: {
    name: "Active",
    tag: "plano_active",
    short: "Flexibilidade para escolher o caminho.",
    headline: "Seu caminho mais coerente agora é o Active.",
    description:
      "Pelo seu perfil, você parece buscar flexibilidade para escolher o caminho que mais combina com seu momento, sem ficar preso a uma única possibilidade.",
    nextTitle: "Opções Active",
    cta: "Ver opções do Active",
    image: "/assets/plan-active.png",
    videoUrl: "https://www.youtube.com/watch?v=f1vanPWMZFs",
    options: [
      {
        name: "Active 2",
        detail: "Opção de entrada com ativação mais leve.",
        url: "https://checkout.grupomide.com.br/?product_id=672a65e5c3d77000c01512d0&utm_source=quiz_mide&utm_medium=quiz&utm_campaign=exame",
      },
      {
        name: "Active 4",
        detail: "Equilíbrio entre margem e taxa de ativação.",
        url: "https://checkout.grupomide.com.br/?product_id=672a6663c3d77000c01512ea&utm_source=quiz_mide&utm_medium=quiz&utm_campaign=exame",
      },
      {
        name: "Active 8",
        detail: "Mais margem para quem quer ampliar o plano.",
        url: "https://checkout.grupomide.com.br/?product_id=672a66e7c3d77000c0151304&utm_source=quiz_mide&utm_medium=quiz&utm_campaign=exame",
      },
      {
        name: "Active 12",
        detail: "Maior margem dentro da linha Active.",
        url: "https://checkout.grupomide.com.br/?product_id=672a652bc3d77000c01512a5&utm_source=quiz_mide&utm_medium=quiz&utm_campaign=exame",
      },
    ],
  },
  veloz: {
    name: "Veloz",
    tag: "plano_veloz",
    short: "Caminho mais ágil até o saque.",
    headline: "Seu caminho mais coerente agora é o Veloz.",
    description:
      "Pelo seu perfil, você demonstra buscar um caminho mais ágil, com foco em avançar mais rápido até o primeiro saque. O Veloz combina com quem quer acelerar a jornada e conferir uma opção mais direta. A disponibilidade pode variar conforme a campanha: acesse o site do plano para ver as informações atualizadas.",
    nextTitle: "Plano Veloz",
    cta: "Acessar site do Veloz",
    ctaUrl: "https://grupomide.com.br/planos/veloz",
    image: "/assets/plan-veloz.png",
    videoUrl: "https://www.youtube.com/watch?v=XkFhKVeBQyY&t",
    options: [
      {
        name: "Acessar site do Veloz",
        detail: "Confira disponibilidade, regras e informações atualizadas da campanha.",
        url: "https://grupomide.com.br/planos/veloz",
      },
    ],
  },
  black: {
    name: "Black",
    tag: "plano_black",
    short: "Mais margem, menos fases e desafio direto.",
    headline: "Seu caminho mais coerente agora é o Black.",
    description:
      "Pelo seu perfil, você parece aberto a investir mais para ter mais margem, menos fases e um desafio mais direto. Esse caminho faz sentido para quem quer uma estrutura maior e aceita uma decisão mais robusta.",
    nextTitle: "Opções Black",
    cta: "Ver opções do Black",
    image: "/assets/plan-black.png",
    videoUrl: "https://www.youtube.com/watch?v=yl79P-xJBrQ&t",
    options: [
      {
        name: "Black 5",
        detail: "10 contratos | Meta e stop: R$ 5.000,00",
        url: "https://checkout.grupomide.com.br/?product_id=69cbbc86799698d4e314c572&utm_source=quiz_mide&utm_medium=quiz&utm_campaign=exame",
      },
      {
        name: "Black 10 Ilimitado",
        detail: "20 contratos | Meta e stop: R$ 10.000,00",
        url: "https://checkout.grupomide.com.br/?product_id=69cbbd54799698d4e314de55&utm_source=quiz_mide&utm_medium=quiz&utm_campaign=exame",
      },
      {
        name: "Black 10 Plus",
        detail: "50 contratos | Meta e stop: R$ 10.000,00",
        url: "https://checkout.grupomide.com.br/?product_id=69cbbe12799698d4e314e617&utm_source=quiz_mide&utm_medium=quiz&utm_campaign=exame",
      },
      {
        name: "Black 20",
        detail: "30 contratos | Meta e stop: R$ 20.000,00",
        url: "https://checkout.grupomide.com.br/?product_id=69cbbeb1799698d4e314edb6&utm_source=quiz_mide&utm_medium=quiz&utm_campaign=exame",
      },
      {
        name: "Black 20 Plus",
        detail: "100 contratos | Meta e stop: R$ 20.000,00",
        url: "https://checkout.grupomide.com.br/?product_id=69cbbf2b799698d4e314f276&utm_source=quiz_mide&utm_medium=quiz&utm_campaign=exame",
      },
    ],
  },
  bitfut: {
    name: "BitFut",
    tag: "plano_bitfut",
    short: "Bitcoin com estrutura definida.",
    headline: "Seu caminho mais coerente agora é o BitFut.",
    description:
      "Pelo seu perfil, o interesse em Bitcoin apareceu de forma clara. Esse caminho faz sentido para quem quer validar uma operação focada nesse mercado com estrutura definida.",
    nextTitle: "Opções BitFut",
    cta: "Ver opções BitFut",
    image: "/assets/plan-bitfut.png",
    videoUrl: "https://www.youtube.com/watch?v=gSYc4SlMGNs",
    options: [
      {
        name: "Bit Conservador",
        detail: "Opção BitFut para quem quer operar Bitcoin com perfil mais controlado.",
        url: "https://checkout.grupomide.com.br/?product_id=68f0e789623dd3880962287f&utm_source=quiz_mide&utm_medium=quiz&utm_campaign=exame",
      },
      {
        name: "Bit Arrojado",
        detail: "Opção BitFut para quem aceita mais intensidade na operação de Bitcoin.",
        url: "https://checkout.grupomide.com.br/?product_id=68f0e87e623dd38809622ec7&utm_source=quiz_mide&utm_medium=quiz&utm_campaign=exame",
      },
    ],
  },
};

const questions = [
  {
    id: "q1",
    kicker: "Momento",
    title: "Hoje, qual frase descreve melhor seu momento?",
    helper: "Escolha a resposta que mais representa sua fase atual.",
    answers: [
      { id: "q1a", code: "A", text: "Nunca operei, só tenho curiosidade", scores: { exames: 5, active: 3, black: 1 }, tendency: "Puxa para Exame" },
      { id: "q1b", code: "B", text: "Já tentei ou estudo, mas quero mais consistência", scores: { exames: 3, active: 5, veloz: 1 }, tendency: "Puxa para Active" },
      { id: "q1c", code: "C", text: "Tenho experiência e quero algo maior", scores: { bitfut: 1, black: 6, exames: 1 }, tendency: "Puxa para Black" },
    ],
  },
  {
    id: "q2",
    kicker: "Objetivo",
    title: "O que você mais quer conquistar agora?",
    helper: "Pense no resultado prático que você busca neste momento.",
    answers: [
      { id: "q2a", code: "A", text: "Aprender do zero, sem começar no escuro", scores: { exames: 5, active: 3, black: 1 }, tendency: "Puxa para Exame" },
      { id: "q2b", code: "B", text: "Chegar mais rápido ao primeiro saque", scores: { black: 1, active: 3, veloz: 5 }, tendency: "Puxa para Veloz" },
      { id: "q2c", code: "C", text: "Operar com mais dinheiro, margem e contratos", scores: { black: 6, exames: 1 }, tendency: "Puxa para Black" },
    ],
  },
  {
    id: "q3",
    kicker: "Regras e fases",
    title: "Sobre regras e fases, o que você prefere?",
    helper: "Essa resposta ajuda a separar um caminho mais guiado de um desafio mais direto.",
    answers: [
      { id: "q3a", code: "A", text: "Quero passo a passo e regras claras", scores: { exames: 5, active: 3, black: 1 }, tendency: "Puxa para Exame" },
      { id: "q3b", code: "B", text: "Aceito regras, mas quero flexibilidade", scores: { active: 5, veloz: 3 }, tendency: "Puxa para Active" },
      { id: "q3c", code: "C", text: "Quero menos etapas e menos burocracia", scores: { veloz: 6, black: 2, bitfut: 1 }, tendency: "Puxa para Veloz" },
    ],
  },
  {
    id: "q4",
    kicker: "Caminho",
    title: "Qual caminho combina mais com você?",
    helper: "Escolha pelo tipo de jornada que parece mais natural para você.",
    answers: [
      { id: "q4a", code: "A", text: "Devagar e seguro", scores: { exames: 5, active: 3, black: 1 }, tendency: "Puxa para Exame" },
      { id: "q4b", code: "B", text: "Quero um caminho mais rápido", scores: { black: 1, veloz: 6 }, tendency: "Puxa para Veloz" },
      { id: "q4c", code: "C", text: "Direto ao ponto", scores: { veloz: 3, black: 6, bitfut: 1 }, tendency: "Puxa para Black" },
    ],
  },
  {
    id: "q5",
    kicker: "Decisão",
    title: "O que mais pesa na sua decisão?",
    helper: "Agora pense no critério que mais influencia sua escolha.",
    answers: [
      { id: "q5a", code: "A", text: "Começar gastando pouco", scores: { exames: 6, active: 2, veloz: 1 }, tendency: "Puxa para Exame" },
      { id: "q5b", code: "B", text: "Buscar melhor custo-benefício", scores: { exames: 5, active: 3, black: 1 }, tendency: "Puxa para Exame" },
      { id: "q5c", code: "C", text: "Ter maior margem para operar", scores: { black: 6, active: 1 }, tendency: "Puxa para Black" },
    ],
  },
  {
    id: "q6",
    kicker: "Próximo passo",
    title: "Qual próximo passo combina com seu momento?",
    helper: "Essa última resposta ajuda a fechar a recomendação principal sem excluir caminhos específicos.",
    answers: [
      { id: "q6a", code: "A", text: "Começar com orientação e segurança", scores: { exames: 5, active: 3, black: 1 }, tendency: "Puxa para Exame" },
      { id: "q6b", code: "B", text: "Focar em novas possibilidades", scores: { veloz: 2, active: 2, bitfut: 3 }, tendency: "Puxa para BitFut", signal: "bitfut" },
      { id: "q6c", code: "C", text: "Provar meu nível de forma direta", scores: { veloz: 2, black: 6, bitfut: 1 }, tendency: "Puxa para Black" },
    ],
  },
];

const leadColumns = [
  "created_at",
  "updated_at",
  "lead_key",
  "nome",
  "telefone",
  "email",
  "submissoes",
  "plano_resultado",
  "ultimo_plano",
  "plano_alternativo",
  "resultado_original",
  "score_resultado",
  "ranking_planos",
  "travas_aplicadas",
  "tags_planos",
  "count_black",
  "count_exames",
  "count_active",
  "count_veloz",
  "count_bitfut",
  "score_black",
  "score_exames",
  "score_active",
  "score_veloz",
  "score_bitfut",
  "score_total_black",
  "score_total_exames",
  "score_total_active",
  "score_total_veloz",
  "score_total_bitfut",
  "ultima_resposta",
  "respostas",
  "historico",
  "caminhos_feitos",
  "todas_respostas",
  "total_cliques",
  "ultimo_clique_tipo",
  "ultimo_clique_plano",
  "ultimo_clique_opcao",
  "ultimo_clique_url",
  "ultimo_clique_at",
  "cliques_links",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];

const locks = {
  bitfutSignals: ["q6b"],
  bitfutMustIncludeOneOf: ["q6b"],
  bitfutSupportSignals: ["q1c", "q3c", "q4b", "q4c", "q6b"],
  bitfutMinimumSupport: 4,
  bitfutCompetitiveGap: 5,
  blackSignals: ["q1c", "q2c", "q3c", "q4c", "q5c", "q6c"],
};

function emptyScores() {
  return PLAN_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
}

function answerPlan(questionId, answerId) {
  const map = {
    q1a: "exames",
    q1b: "active",
    q1c: "black",
    q2a: "exames",
    q2b: "veloz",
    q2c: "black",
    q3a: "exames",
    q3b: "active",
    q3c: "veloz",
    q4a: "exames",
    q4b: "veloz",
    q4c: "black",
    q5a: "exames",
    q5b: "exames",
    q5c: "black",
    q6a: "exames",
    q6b: "bitfut",
    q6c: "black",
  };
  return map[answerId] || null;
}

function hasAny(answerIds, ids) {
  return ids.some((id) => Object.values(answerIds).includes(id));
}

function bitfutEligible(answerIds) {
  const selected = Object.values(answerIds);
  const signalCount = locks.bitfutSignals.filter((id) => selected.includes(id)).length;
  return signalCount >= 1;
}

function bitfutProfileWinner(scores, answerIds, currentWinner) {
  if (!bitfutEligible(answerIds) || currentWinner.key === "bitfut") return null;
  const selected = Object.values(answerIds);
  const supportCount = locks.bitfutSupportSignals.filter((id) => selected.includes(id)).length;
  const gap = Number(currentWinner.score || 0) - Number(scores.bitfut || 0);
  const strictBitfutPath = supportCount >= locks.bitfutMinimumSupport && !selected.includes("q5c");
  if (strictBitfutPath || (supportCount >= locks.bitfutMinimumSupport && gap <= locks.bitfutCompetitiveGap)) {
    return scoreObject("bitfut", scores);
  }
  return null;
}

function blackUnlocked(answerIds) {
  return hasAny(answerIds, locks.blackSignals);
}

function scoreObject(key, scores) {
  return { key, name: plans[key].name, score: scores[key] || 0 };
}

function resolveWinner(scores, answerIds, availableKeys = PLAN_KEYS) {
  const available = availableKeys.filter((key) => PLAN_KEYS.includes(key));
  const max = Math.max(...available.map((key) => scores[key] || 0));
  const tied = available.filter((key) => (scores[key] || 0) === max);

  if (tied.length === 1) return scoreObject(tied[0], scores);

  for (const questionId of ["q6", "q5", "q4", "q3", "q2", "q1"]) {
    const plan = answerPlan(questionId, answerIds[questionId]);
    if (plan && tied.includes(plan) && (plan !== "bitfut" || bitfutEligible(answerIds))) {
      return scoreObject(plan, scores);
    }
  }

  if (tied.includes("black") && blackUnlocked(answerIds)) {
    return scoreObject("black", scores);
  }

  const safeWinner = SAFE_TIEBREAK_ORDER.find((key) => tied.includes(key));
  return scoreObject(safeWinner || tied[0], scores);
}

function rankScores(scores, finalWinnerKey) {
  return PLAN_KEYS.map((key) => scoreObject(key, scores)).sort((a, b) => {
    if (a.key === finalWinnerKey) return -1;
    if (b.key === finalWinnerKey) return 1;
    if (b.score !== a.score) return b.score - a.score;
    return SAFE_TIEBREAK_ORDER.indexOf(a.key) - SAFE_TIEBREAK_ORDER.indexOf(b.key);
  });
}

function calculateResult(answerIds) {
  const scores = emptyScores();
  const answers = [];

  questions.forEach((question) => {
    const answerId = answerIds[question.id];
    const answer = question.answers.find((item) => item.id === answerId);
    if (!answer) return;
    answers.push({
      questionId: question.id,
      question: question.title,
      answerId: answer.id,
      code: answer.code,
      answer: answer.text,
      scores: answer.scores,
    });
    Object.entries(answer.scores || {}).forEach(([plan, value]) => {
      scores[plan] += value;
    });
  });

  const locksApplied = [];
  const originalWinner = resolveWinner(scores, answerIds);
  let availableKeys = [...PLAN_KEYS];
  let lockedAlternative = null;

  if (originalWinner.key === "bitfut" && !bitfutEligible(answerIds)) {
    locksApplied.push("bitfut_coerencia");
    lockedAlternative = originalWinner;
    availableKeys = availableKeys.filter((key) => key !== "bitfut");
  }

  let winner = resolveWinner(scores, answerIds, availableKeys);
  const profileWinner = bitfutProfileWinner(scores, answerIds, winner);
  if (profileWinner) {
    locksApplied.push("bitfut_perfil_competitivo");
    winner = profileWinner;
  }
  const ranked = rankScores(scores, winner.key);
  const runnerUp =
    lockedAlternative && lockedAlternative.key !== winner.key
      ? lockedAlternative
      : ranked.find((item) => item.key !== winner.key) || null;
  const close = runnerUp ? Math.abs(winner.score - runnerUp.score) <= 2 : false;

  return {
    scores,
    ranked,
    winner,
    runnerUp,
    close,
    originalWinner,
    resultadoOriginal: originalWinner.key,
    locksApplied,
    travasAplicadas: locksApplied,
    bitfutEligible: bitfutEligible(answerIds),
    blackUnlocked: blackUnlocked(answerIds),
    answers,
  };
}

module.exports = {
  PLAN_KEYS,
  plans,
  questions,
  leadColumns,
  calculateResult,
  locks,
};
