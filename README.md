# Financeiro do Casal

Sistema simples para controlar contas, compras, Pix, acordos, parcelas e desejos de compra de um casal.

## O que ele faz

- Grafico mensal com contas pagas e pendentes.
- Cadastro de conta, compra, Pix, acordo ou outro gasto.
- Projecao automatica de parcelas futuras.
- Historico de movimentacoes.
- Simulador de risco local para novas compras e parcelamentos.
- Lista de coisas que voces querem comprar.
- Pergunta inicial diaria para lembrar de registrar conta nova.
- Banco compartilhado em nuvem com Firebase/Firestore quando configurado.

## Como publicar no GitHub Pages

1. Crie um repositorio no GitHub.
2. Envie estes arquivos para a branch `main`.
3. No GitHub, entre em `Settings > Pages`.
4. Em `Build and deployment`, escolha `GitHub Actions`.
5. O workflow `.github/workflows/pages.yml` vai publicar o site.

## Como configurar o banco compartilhado

1. Crie um projeto no Firebase.
2. Ative o Firestore Database.
3. Copie a configuracao Web do Firebase.
4. Preencha o arquivo `firebase-config.js`.
5. Publique as regras de `firestore.rules` no Firestore.

Exemplo de `firebase-config.js` preenchido:

```js
window.FINANCEIRO_FIREBASE_CONFIG = {
  apiKey: "SUA_API_KEY_PUBLICA",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000",
};

window.FINANCEIRO_FAMILY_ID = "casal-principal";
```

Enquanto o Firebase nao estiver preenchido, o app usa cache local do navegador. Depois que o Firebase estiver configurado, os dados passam a sincronizar entre os aparelhos.

## Observacao de seguranca

Esta etapa ainda nao tem login. As regras atuais sao simples para facilitar o uso de voces dois. Na proxima fase, o ideal e adicionar usuarios fixos para proteger melhor os dados.
