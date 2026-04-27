# Guia Rapido - Rede da Festa

Este arquivo foi feito para voce achar tudo sem complicacao.

## 1. Onde esta o projeto

Pasta principal:

[C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos)

Dentro dela existem duas pastas principais:

- [client](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\client) = parte visual do app
- [server](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\server) = parte do QR Code, metricas e apoio do sistema

## 2. Arquivos mais importantes

- [README.md](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\README.md) = explicacao geral
- [.env.example](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\.env.example) = modelo das configuracoes
- [client/src/pages](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\client\src\pages) = telas do aplicativo
- [server/src](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\server\src) = arquivos do back-end

## 3. O que cada tela faz

As telas do app estao aqui:

[client/src/pages](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\client\src\pages)

Arquivos principais:

- [LoginPage.tsx](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\client\src\pages\LoginPage.tsx) = entrar e criar conta
- [ProfilePage.tsx](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\client\src\pages\ProfilePage.tsx) = criar perfil com foto
- [EventsPage.tsx](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\client\src\pages\EventsPage.tsx) = lista de eventos
- [CheckInPage.tsx](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\client\src\pages\CheckInPage.tsx) = entrar no evento com codigo ou QR Code
- [EventRoomPage.tsx](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\client\src\pages\EventRoomPage.tsx) = lista de pessoas e chat
- [OrganizerDashboardPage.tsx](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\client\src\pages\OrganizerDashboardPage.tsx) = painel do organizador

## 4. O que voce precisa fazer agora

Para o app funcionar de verdade, ainda faltam 3 coisas:

### Passo 1 - Instalar as dependencias

Voce vai precisar rodar os comandos dentro das pastas `client` e `server`.

### Passo 2 - Criar o arquivo .env

Use este arquivo como modelo:

[.env.example](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\.env.example)

Voce deve copiar esse arquivo e criar um `.env` com as chaves reais do Firebase.

### Passo 3 - Criar o Firebase

No Firebase, voce precisa ativar:

- Authentication com e-mail e senha
- Firestore
- Storage

Sem isso o cadastro, perfil, chat e eventos nao vao funcionar de verdade.

## 5. Ordem simples para testar

Quando tudo estiver ligado, a ordem de teste sera:

1. Criar conta
2. Salvar perfil com foto
3. Criar evento no painel do organizador
4. Gerar codigo ou QR Code
5. Fazer check-in no evento
6. Entrar na sala do evento
7. Testar participantes e chat

## 6. Onde fica a configuracao do Firebase no codigo

Front-end:

[client/src/lib/firebase.ts](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\client\src\lib\firebase.ts)

Back-end:

[server/src/firebaseAdmin.ts](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\server\src\firebaseAdmin.ts)

## 7. Onde fica o chat

[client/src/components/ChatPanel.tsx](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\client\src\components\ChatPanel.tsx)

## 8. Onde fica o QR Code

Tela do organizador:

[client/src/pages/OrganizerDashboardPage.tsx](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\client\src\pages\OrganizerDashboardPage.tsx)

Geracao no servidor:

[server/src/services/qrService.ts](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\server\src\services\qrService.ts)

## 9. Resumo mais curto ainda

Se voce quiser olhar so o essencial:

- app visual: [client](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\client)
- servidor: [server](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\server)
- configuracao: [.env.example](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\.env.example)
- guia geral: [README.md](C:\Users\Mariana\Documents\Codex\2026-04-22-vc-consegue-miontar-aplicativos-complexos\README.md)

## 10. Proximo passo ideal

O proximo passo mais util agora e este:

1. instalar as dependencias
2. ligar Firebase
3. rodar o app localmente

Depois disso voce ja consegue ver a primeira versao funcionando.

## 11. Como liberar o painel do organizador no teste

O painel `/organizador` so abre para usuarios com `role` igual a:

- `organizer`
- `admin`

Usuarios comuns ficam com:

- `user`

### Onde mudar isso no teste

No Firebase Console:

1. abra o Firestore
2. entre na colecao `profiles`
3. abra o documento do usuario
4. altere o campo `role`

Exemplo:

```text
role: organizer
```

Se o campo ainda nao existir, voce pode criar manualmente.
