# Plano Certo

Sistema web local para organizar estudos: edital, banca, data da prova, materias, ciclo semanal, calendario mensal, revisoes, modo foco, Pomodoro, registro de sessoes e musica ambiente.

## Como abrir

Na pasta do projeto:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Depois acesse:

```text
http://127.0.0.1:8080/
```

## Dados

O app sincroniza os dados no Cloud Firestore quando o usuario autorizado esta logado. O `localStorage` continua como cache local e fallback offline. Use os botoes de exportar e importar no topo para fazer backup em JSON.

Estrutura usada no Firestore:

```text
users/{firebaseAuthUid}/studyState/main
```

As regras em `firestore.rules` permitem leitura e escrita apenas para o usuario autenticado cujo GitHub provider ID e `73147319`.

## Autenticacao por GitHub

O projeto ja esta preparado para Firebase Authentication com GitHub e allowlist do usuario `TheodoroFreitas`.

1. No Firebase Console, va em Authentication > Metodo de login > GitHub.
2. No GitHub, crie um OAuth App em Developer settings > OAuth Apps.
3. Use este callback no GitHub OAuth App:

```text
https://study-d421f.firebaseapp.com/__/auth/handler
```

4. Copie o Client ID e Client Secret do GitHub para o provedor GitHub no Firebase e salve.
5. No Firebase Console, va em Configuracoes do projeto > Seus apps > Web app.
6. Copie `apiKey`, `appId`, `authDomain` e `projectId` para `firebase-config.js`.
7. Troque `enabled: false` para `enabled: true` em `firebase-config.js`.

O ID publico do GitHub autorizado esta configurado em `allowedGithubProviderUids` como `73147319`.

## Arquivos

- `index.html`: entrada do app.
- `styles.css`: layout responsivo e identidade visual.
- `app.js`: regras do sistema, armazenamento, calendario, revisoes, Pomodoro e audio ambiente.
- `auth.js`: login GitHub via Firebase Authentication.
- `firebase-config.js`: configuracao do Firebase e allowlist.
- `firestore.rules`: regras de seguranca do Cloud Firestore.
