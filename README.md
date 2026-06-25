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
- Login por e-mail e senha com Firebase Authentication.
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
3. Ative `Authentication > Sign-in method > Email/Password`.
4. Copie a configuracao Web do Firebase.
5. Preencha o arquivo `firebase-config.js`.
6. Publique as regras de `firestore.rules` no Firestore.

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
window.FINANCEIRO_REQUIRE_LOGIN = true;
window.FINANCEIRO_ALLOW_SIGNUP = true;
window.FINANCEIRO_ALLOWED_EMAILS = [];
```

Enquanto o Firebase nao estiver preenchido, o app usa cache local do navegador. Depois que o Firebase estiver configurado, os dados passam a sincronizar entre os aparelhos.

## Login

Com `FINANCEIRO_ALLOW_SIGNUP = true`, a tela de login permite criar o primeiro acesso. Depois de criar o seu login e o da sua esposa, voce pode trocar para `false` para esconder o botao de cadastro inicial.

Se quiser limitar a tela do app para e-mails especificos, preencha:

```js
window.FINANCEIRO_ALLOWED_EMAILS = ["seu@email.com", "email-da-esposa@email.com"];
```

## Observacao de seguranca

As regras atuais exigem login no Firebase. Para fechar o acesso somente ao casal, edite `firestore.allowed-emails.rules`, troque `email-da-esposa@gmail.com` pelo e-mail real e publique essas regras no Firestore.

A IA ficou fora desta versao para evitar custos do Firebase Blaze e da API externa.
