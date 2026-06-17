const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();

const openaiApiKey = defineSecret("OPENAI_API_KEY");

function compactFinanceContext(context = {}) {
  return {
    mesAtual: context.mesAtual || "",
    rendaMensal: Number(context.rendaMensal) || 0,
    saldoAtual: Number(context.saldoAtual) || 0,
    totalDoMes: Number(context.totalDoMes) || 0,
    contasPagas: Number(context.contasPagas) || 0,
    contasPendentes: Number(context.contasPendentes) || 0,
    pendencias: Array.isArray(context.pendencias) ? context.pendencias.slice(0, 8) : [],
    desejos: Array.isArray(context.desejos) ? context.desejos.slice(0, 6) : [],
  };
}

function extractResponseText(payload) {
  if (payload.output_text) return payload.output_text;

  const parts = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
      if (content.type === "text" && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

exports.financeAiChat = onCall(
  {
    region: "us-central1",
    secrets: [openaiApiKey],
    timeoutSeconds: 60,
    memory: "512MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Entre no app para usar a IA.");
    }

    const message = String(request.data?.message || "").trim();
    const imageDataUrl = request.data?.imageDataUrl ? String(request.data.imageDataUrl) : "";
    const imageName = request.data?.imageName ? String(request.data.imageName).slice(0, 120) : "";
    const financeContext = compactFinanceContext(request.data?.financeContext);

    if (!message && !imageDataUrl) {
      throw new HttpsError("invalid-argument", "Envie uma pergunta ou uma foto.");
    }

    if (message.length > 1400) {
      throw new HttpsError("invalid-argument", "Mensagem muito longa.");
    }

    if (imageDataUrl && !imageDataUrl.startsWith("data:image/")) {
      throw new HttpsError("invalid-argument", "A imagem precisa ser enviada como data URL.");
    }

    const userContent = [
      {
        type: "input_text",
        text: [
          `Pergunta do usuario: ${message || "Analise a foto enviada."}`,
          imageName ? `Nome do arquivo: ${imageName}` : "",
          `Contexto financeiro cadastrado no app: ${JSON.stringify(financeContext)}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ];

    if (imageDataUrl) {
      userContent.push({
        type: "input_image",
        image_url: imageDataUrl,
        detail: "auto",
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey.value()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.5",
        max_output_tokens: 900,
        input: [
          {
            role: "developer",
            content: [
              {
                type: "input_text",
                text:
                  "Voce e uma IA financeira para um casal no Brasil. Responda em portugues do Brasil, de forma pratica, curta e cuidadosa. " +
                  "Analise contas, compras, parcelas, comprovantes e fotos quando houver. Use os dados financeiros do app como contexto. " +
                  "Nao prometa retorno financeiro, nao de consultoria legal/tributaria definitiva, e recomende conferir valores importantes.",
              },
            ],
          },
          {
            role: "user",
            content: userContent,
          },
        ],
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = payload.error?.message || "Falha ao chamar a OpenAI.";
      throw new HttpsError("internal", detail);
    }

    const answer = extractResponseText(payload);
    return {
      answer: answer || "Nao consegui gerar uma resposta para essa pergunta.",
    };
  },
);
