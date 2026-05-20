# Plano Certo

Sistema web local para organizar estudos de concurso: edital, banca, data da prova, materias, ciclo semanal, calendario mensal, revisoes, modo foco, Pomodoro, registro de sessoes e musica ambiente.

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

O app salva tudo no `localStorage` do navegador. Use os botoes de exportar e importar no topo para fazer backup em JSON.

## Arquivos

- `index.html`: entrada do app.
- `styles.css`: layout responsivo e identidade visual.
- `app.js`: regras do sistema, armazenamento, calendario, revisoes, Pomodoro e audio ambiente.
