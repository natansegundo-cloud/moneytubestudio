Project: Faceless Long-Form YouTube Channel (English) with MoneyPrinterTurbo
1. Objetivo

Montar uma "fábrica" de vídeos longos (8–10 min, 16:9, 1920x1080) para um canal de YouTube em inglês (canal: MINDTRACE), usando o MoneyPrinterTurbo (MPT) como motor de produção.

Fluxo desejado:

tema/roteiro (EN) → narração TTS (EN) → clipes de VÍDEO do Pexels/Pixabay → montagem (FFmpeg) → MP4 final

Meta imediata: gerar e publicar o primeiro vídeo ainda hoje, sem alterar o código do MPT.

Repositório do motor: https://github.com/harry0703/MoneyPrinterTurbo

Idiomas:

Conteúdo do vídeo (roteiro, narração, título, descrição, tags, termos de busca): inglês.
Conversa com o usuário: português do Brasil, curto e direto.
Código, nomes de arquivos e comandos: inglês.
2. Ambiente do usuário
Notebook: ~8 GB RAM, GPU integrada (Intel Iris Xe). Sem GPU dedicada.
Não usar GPU local, Whisper local pesado, nem modelos locais grandes.
Renderizar 1 vídeo por vez, poucas threads (2) para não travar a máquina.
Custo alvo: R$ 0 (Edge TTS, Pexels, Pixabay, FFmpeg, MPT open source).
Sistema padrão: Windows, a menos que o ambiente detectado seja outro. Adaptar os comandos ao sistema real.
3. Regras de ouro (leia antes de agir)
NÃO altere código do MPT na Fase 0. Só instalar, configurar e rodar.
NÃO mexa em app/services/video.py, voice.py, material.py, task.py sem um problema concreto e sem avisar o usuário antes.
Mudanças de comportamento vão em arquivos novos (ex.: app/services/longform.py), nunca reescrevendo o núcleo.
Nunca inventar nomes de opções, campos ou arquivos. Sempre verificar no repositório real (README, config.example.toml, schema.py, WebUI) antes de afirmar ou editar.
Nunca commitar chaves de API. Chaves ficam só no config.toml local (conferir o .gitignore).
Mudanças pequenas e testáveis. Um passo por vez. Reportar o resultado de cada passo.
Se um comando falhar: mostrar o log, diagnosticar a causa, corrigir e tentar de novo. Não pular a etapa.
4. Fase 0 — Instalar e rodar o MPT sem alterar código
4.1 Instalação
Clonar o repositório oficial.
Usar o caminho de instalação mais simples que o README oferecer para o sistema do usuário (pacote pronto, Docker ou venv). Escolher o de menor atrito.
Instalar dependências e FFmpeg (conferir no PATH: ffmpeg -version).
Criar config.toml a partir de config.example.toml.
4.2 Configuração (config.toml / WebUI)

Verificar os nomes reais das opções no repositório e aplicar:

Item	Valor
Fonte de vídeo	Pexels (chave gratuita do usuário) e/ou Pixabay
Tipo de material	Clipes de vídeo (não imagens estáticas)
Formato	16:9 (1920x1080)
Idioma da narração	English (en-US)
TTS	Edge TTS (gratuito, sem API key)
Voz	en-US-AndrewNeural (padrão). Alternativas: en-US-GuyNeural, en-US-AriaNeural, en-US-ChristopherNeural
Legendas	Desligadas (long-form)
Whisper	Desligado
Música de fundo	Arquivo local, volume baixo
Duração máxima por clipe	~5 s
Ordem dos clipes	Sequencial
match_materials_to_script	Ligado, se existir na versão instalada
Quantidade de vídeos	1
Threads	2
Pedir ao usuário apenas a chave do Pexels (e Pixabay, se quiser) quando necessário. Explicar onde colar.
Subir o WebUI e informar a URL local.
4.3 Teste de sanidade

Gerar primeiro um vídeo curto (~30–60 s) para validar: voz EN, download dos clipes, montagem e áudio sincronizado. Só depois rodar o vídeo completo.

4.4 Primeiro vídeo completo
O roteiro será fornecido pelo usuário (~1.200–1.500 palavras em inglês, ~150 palavras/min). Não gerar roteiro via LLM nesta fase.
Colar o roteiro no campo de roteiro do MPT.
Termos de busca em inglês (Pexels/Pixabay). Se o MPT permitir informar os termos manualmente, usar a lista fornecida pelo usuário. Se ele gerar os termos via LLM, garantir termos concretos e visuais (ex.: "person walking alone city night"), não abstratos.
Medir e reportar: tempo total de renderização, pico de RAM, duração final do MP4, erros/avisos.
4.5 Critérios de aceite da Fase 0
 MP4 em 1920x1080, 8–10 min.
 Áudio em inglês claro, sem cortes estranhos.
 Duração do vídeo ≈ duração da narração (sem vídeo terminando antes).
 Clipes coerentes com o assunto e sem repetição excessiva (não repetir os mesmos poucos clipes por minutos).
 Sem legendas, música baixa, sem travamentos.
 Arquivo final em pasta de saída conhecida; informar o caminho ao usuário.
5. Fase 1 — Qualidade visual (só se a Fase 0 mostrar repetição)

Antes de mexer no código, tentar apenas por configuração:

Aumentar a quantidade de termos de busca (12–20 grupos visuais para 8–10 min).
Reduzir a duração máxima do clipe.
Usar duas fontes (Pexels + Pixabay) para ampliar o pool.

Se ainda houver repetição, propor ao usuário a Fase 2.

6. Fase 2 — Camada long-form (novo arquivo, sem quebrar o núcleo)

Só iniciar com aprovação do usuário, depois do primeiro vídeo aprovado.

Criar app/services/longform.py como adaptador sobre o MPT:

tema → roteiro por blocos (10–14) → plano visual (termos EN por bloco) → VideoParams → pipeline normal do MPT

Estrutura de dados sugerida:

json
{
  "section": 1,
  "narration": "narration text for this block",
  "search_terms": ["search term 1", "search term 2", "search term 3"]
}

Regras:

Estrutura narrativa fixa: Hook → Context → Points 1–3 → Example → Deeper explanation → Twist/revelation → Conclusion.
2–4 clipes candidatos por bloco; evitar repetir clipes já usados.
Funções novas em arquivo novo (ex.: generate_longform_script(), generate_longform_visual_plan()), sem reescrever o llm.py existente.
Só adicionar campos em schema.py se for indispensável; preferir reaproveitar os campos existentes.
Opcional: modo "Long-form" no WebUI (English, 16:9, legendas off, BGM local).
Escrever testes simples e rodar um vídeo de ponta a ponta para validar.
7. Fase 3 — Shorts derivados (script separado)

Criar shorts_generator.py fora do núcleo do MPT:

Entrada: roteiro, áudio e MP4 longo.
Saída: 3–5 Shorts verticais (9:16) de até ~60 s, com legendas ligadas.
Se o Shorts quebrar, o gerador de vídeos longos não pode quebrar.
8. Fase 4 — Metadados e publicação
Gerar título, descrição e tags em inglês a partir do roteiro.
Automação de upload só depois de tudo estável. Por enquanto o upload é manual.
9. Conformidade e monetização (YouTube)

O objetivo é reduzir o risco de "conteúdo repetitivo/produzido em massa". Usar vídeos prontos do Pexels/Pixabay não elimina esse risco sozinho. Ao preparar conteúdo:

Incentivar roteiro original com ponto de vista e exemplos concretos, nunca texto genérico sem revisão.
Clipes coerentes com a narração e variados.
Ritmo de publicação humano (sem produzir em massa no início).
Confirmar que a música local tem licença para uso no YouTube.
Verificar a licença vigente do Pexels/Pixabay para uso comercial e as regras atuais do YouTube antes de publicar. Não assumir.
Avisar o usuário se alguma configuração puder criar risco de política.
10. Formato de resposta esperado do agente

A cada etapa, responder ao usuário em português, em poucas linhas:

O que foi feito
Resultado / evidência (saída do comando, caminho do arquivo, métricas)
Próximo passo e o que, se algo, o usuário precisa fornecer (ex.: chave do Pexels, roteiro)

Se faltar informação, fazer uma pergunta objetiva e continuar o que for possível enquanto isso.

11. Definição de pronto (hoje)
MPT rodando localmente com a configuração da seção 4.2.
Primeiro MP4 em inglês, de 8–10 min, gerado e validado pelos critérios da seção 4.5.
Usuário informado do caminho do arquivo e do tempo de renderização, pronto para subir no YouTube.