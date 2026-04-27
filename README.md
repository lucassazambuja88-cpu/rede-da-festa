# Rede da Festa

MVP funcional de uma rede social temporaria para eventos e casas noturnas. Cada usuario possui um perfil unico com foto obrigatoria, faz check-in em um evento via codigo ou QR Code e passa a aparecer apenas para quem tambem esta presente naquele evento. Ao encerrar o evento, a rede privada e fechada.

## Modos de acesso

- `user`: usuario comum que cria perfil, entra em eventos, visita perfis e conversa.
- `organizer`: casas noturnas, produtores e equipes aprovadas para criar e operar eventos.
- `admin`: voce, socios e pessoas de confianca que aprovam organizadores e protegem a operacao.

## Estrutura

```text
client/   Front-end React + TypeScript + Tailwind CSS
server/   API Node.js/Express para QR Codes, metricas e utilidades de evento
```

## Requisitos

- Node.js 20+
- npm 10+
- Projeto Firebase com:
  - Authentication por e-mail e senha
  - Cloud Firestore

## Configuracao

1. Copie [`.env.example`](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\.env.example) para `.env`.
2. Preencha as chaves `VITE_FIREBASE_*` com as credenciais do Firebase Web App.
3. Se preferir separar, crie `client/.env` e `server/.env` usando os mesmos valores necessarios.

## Como instalar

Instale as dependencias de cada projeto:

```bash
cd client
npm install

cd ../server
npm install
```

## Como rodar localmente

Front-end:

```bash
cd client
npm run dev
```

Back-end:

```bash
cd server
npm run dev
```

O front-end sera aberto em `http://localhost:5173` e a API em `http://localhost:4000`.

## Como colocar no celular como pagina web

O jeito mais simples de usar em qualquer celular agora e publicar **somente o front-end** como um site web.

### Opcao recomendada: Vercel

1. Suba este projeto para um repositorio Git privado ou publico.
2. Entre em [Vercel](https://vercel.com/).
3. Importe o repositorio.
4. Na configuracao do projeto, defina a pasta raiz como:

```text
client
```

5. Em variaveis de ambiente da Vercel, adicione:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

6. Clique em Deploy.
7. Quando a URL publica sair, abra o Firebase Console e adicione esse dominio em:

```text
Authentication > Settings > Authorized domains
```

8. Abra a URL no celular.

### Opcao alternativa: Netlify

Se preferir Netlify, a pasta `client/public/_redirects` ja foi criada para o React Router funcionar no refresh das paginas.

### Instalar na tela inicial

Depois de publicar:

- no Android: abra o site no Chrome e use `Adicionar a tela inicial`
- no iPhone: abra no Safari e use `Compartilhar > Adicionar a Tela de Inicio`

O projeto ja inclui:

- `manifest` web
- icone simples do app
- `theme-color`
- fallback de rotas para deploy como SPA

## Regras de seguranca do Firestore

Este projeto ja inclui:

- [firestore.rules](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\firestore.rules)
- [firebase.json](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\firebase.json)

Essas regras sao essenciais para producao. Elas foram pensadas para:

- impedir que usuario comum vire organizer ou admin sozinho;
- permitir que apenas `admin` aprove organizadores;
- permitir que apenas `organizer` aprovado crie eventos;
- limitar conversas a participantes autenticados.

Para publicar as regras no seu projeto Firebase:

```bash
firebase deploy --only firestore:rules
```

## Fluxo recomendado para testes locais

1. Crie um usuario por e-mail e senha.
2. Complete o perfil com foto de rosto obrigatoria.
3. Crie um evento pelo dashboard do organizador.
4. Gere um codigo ou QR Code.
5. Faça check-in no evento pela lista de eventos.
6. Abra a sala do evento para ver participantes e testar chats.

## Como configurar o Firebase

### Authentication

- Ative o provedor `Email/Password`.
- Adicione o dominio publicado em `Authorized domains`.

### Firestore

Colecoes esperadas:

- `profiles`
- `events`
- `eventParticipants`
- `conversations`
- `messages`
- `reports`
- `blocks`

### Fotos de perfil

Neste momento as fotos estao sendo redimensionadas no navegador e salvas em Base64 no Firestore para reduzir custo e simplificar a demo. O codigo ja esta preparado para trocar isso por Firebase Storage depois.

## Como gerar QR Codes

O painel do organizador gera automaticamente:

- codigo curto do evento;
- link `/entrar/CODIGO`;
- QR Code com esse link.

O QR Code nao faz login. Ele apenas leva o usuario para a tela de entrada da festa.

## Acessibilidade

- Tema escuro sem usar preto absoluto
- Contraste alto para textos e labels
- Estados de foco visiveis
- Alvos interativos com tamanho minimo confortavel

## Observacoes importantes

- O app inclui moderacao basica por palavras ofensivas no envio de mensagens.
- Sem foto de rosto o perfil nao e publicado nem mostrado em eventos.
- O encerramento do evento e tratado tanto na UI quanto no servidor utilitario. Para producao, recomenda-se Cloud Functions ou um cron job para consolidar o fechamento.

## Scripts uteis

Cliente:

```bash
npm run dev
npm run build
npm run lint
npx tsc -b --pretty false
```

Servidor:

```bash
npm run dev
npm run build
```

## Diagnostico rapido de admin

O script abaixo faz uma checagem leve no Firebase e mostra quantos perfis `admin` existem no banco:

```bash
node client/scripts/smoke-test.mjs
```

Se quiser semear dados de teste (usuarios e evento), rode:

```bash
node client/scripts/smoke-test.mjs --seed
```
