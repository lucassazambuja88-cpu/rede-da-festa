# Rede da Festa no Celular

Este app ja pode rodar como pagina web em qualquer celular.

## Melhor caminho agora

Use **Vercel** e publique apenas a pasta `client`.

## Passo a passo

1. Suba o projeto para um repositorio Git.
2. Entre em [https://vercel.com](https://vercel.com).
3. Clique em `Add New Project`.
4. Importe o repositorio.
5. Em `Root Directory`, escolha:

```text
client
```

6. Adicione as variaveis abaixo no painel da Vercel:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

7. Clique em `Deploy`.

## Muito importante no Firebase

Depois do deploy, copie o dominio da Vercel e adicione em:

```text
Firebase Console > Authentication > Settings > Authorized domains
```

Sem isso, o login pode falhar no celular.

## Como testar no celular

1. Abra a URL publicada no navegador do celular.
2. Crie login ou entre com uma conta existente.
3. Teste os 3 modos:
   - user
   - organizer
   - admin

## Como instalar como app

### Android

1. Abra no Chrome.
2. Toque em `Adicionar a tela inicial`.

### iPhone

1. Abra no Safari.
2. Toque em `Compartilhar`.
3. Toque em `Adicionar à Tela de Início`.

## Arquivos que ja ficaram prontos para isso

- `client/public/site.webmanifest`
- `client/public/icon.svg`
- `client/public/_redirects`
- `client/vercel.json`

## Observacao

O build de producao esta funcionando. Existe apenas um aviso de bundle grande, mas isso nao impede a publicacao da primeira versao web.
