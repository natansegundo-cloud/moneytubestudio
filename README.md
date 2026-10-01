# MINDTRACE

Máquina local para produzir documentários faceless em inglês sobre psicologia, cérebro e comportamento humano.

## Direção fechada

- Canal: `MINDTRACE`
- Formato principal: documentário long-form de 8–10 minutos, 16:9, 1920×1080
- Idioma: inglês
- Voz inicial: Edge TTS com uma voz inglesa consistente
- Footage: Pexels/Pixabay, em ordem narrativa
- Legendas: desligadas no long-form
- Shorts: derivados depois, em pipeline separado
- Primeiro tema: `Why Your Brain Replays Embarrassing Memories`

## Estrutura

```text
engine/MoneyPrinterTurbo/   motor de referência, preservado sem alterações
interface/                   interface própria do MINDTRACE
mindtrace/                   contrato e futura camada de orquestração
config/                     configuração local e exemplo sem segredos
projects/mindtrace/         vídeos e roteiros do canal, organizados por produção
scripts/                    comandos operacionais
```

O MPT é um componente interno. A interface do MINDTRACE não depende do WebUI original e não edita o núcleo do motor.

## Estado atual

A base do projeto foi criada, a interface funciona como painel de configuração e a ponte própria já conversa com a API real do MPT. O render continua protegido até configurarmos footage e aprovamos o primeiro teste curto.

## Executar a interface

```powershell
.\scripts\start-mpt-api.ps1       # API do motor, porta 8080
.\scripts\start-mindtrace-api.ps1 # ponte MINDTRACE, porta 8090
.\scripts\start-interface.ps1   # interface, porta 4173
```

Abra `http://127.0.0.1:4173`. A interface consulta a ponte própria em `/api`; a ponte consulta o MPT em `http://127.0.0.1:8080`.

Para instalar/reinstalar somente a interface:

```powershell
cd interface
npm install
npm run build
```

## Regras operacionais

- Não colocar chaves de API no Git.
- Não editar `engine/MoneyPrinterTurbo/app/services/video.py`, `voice.py`, `material.py` ou `task.py` para resolver problemas da camada MINDTRACE.
- Renderizar um vídeo por vez e validar primeiro um teste curto.
- O custo, a duração e os provedores ficam configuráveis; não devem ser hardcoded no motor.

## O que falta para o primeiro render

O fluxo de rascunho e a ponte já estão operacionais. Cada vídeo mantém registro, roteiro, narração e MP4 final juntos em `projects/mindtrace/videos/<slug>/`. Para enfileirar um vídeo com footage online, configure a chave Pexels no `config.toml` local do MPT.
