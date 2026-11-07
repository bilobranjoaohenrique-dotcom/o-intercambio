# Áudio do Protótipo 01 — O Despertar

`mother-provisional.wav` é um arquivo **real, provisório e substituível de voz sintética**. Não é gravação de uma atriz nem dublagem natural final. A voz por formantes `pt-br+f3` foi gerada offline com eSpeak NG; o modificador é identificado como feminino pelo próprio sintetizador.

Texto exato:

> Ei, vem tomar café pra não se atrasar!

Formato: WAV PCM, mono, 22.050 Hz, 16 bits, **3,1766 segundos**, 140.132 bytes. O inventário `voice-info.json` registra origem da ferramenta, descrição provisória e SHA-256. O motor e seus dados de pronúncia não são distribuídos no jogo.

## Substituir pela gravação final

Grave uma voz feminina adulta em português brasileiro, com tom cotidiano e carinhoso, pronunciando a mesma frase. Substitua `mother-provisional.wav` por um WAV mono; o mesmo caminho continua sendo carregado. Atualize o inventário e a informação `voiceInfo` em `src/game/audio.ts` para identificar honestamente a gravação, sua origem e duração. O jogo usa a duração decodificada do arquivo em execução.

A voz passa por um PannerNode HRTF fixo no ponto da mãe no andar inferior, definido em `OBJECTS.mother`. Um filtro passa-baixas varia com a distância e o andar do ouvinte. Isso simula a voz abafada pelas paredes; não usa traçado acústico das paredes. O volume geral pode ser ajustado nas configurações.

## Demais sons

Vento, pássaros, relógio, movimentação doméstica distante e efeitos de roupa, cama, passos, porta, maçaneta e objetivo são síntese original em Web Audio. Não usam gravações ou pacotes de outros jogos. Não há música de susto nesta cena.

`prepare()` apenas busca o arquivo local. O contexto sonoro é desbloqueado pelo gesto do botão de início; não há áudio antes dele. A pausa suspende o contexto, conservando a reprodução da fala, e o reinício cancela a fala anterior e os efeitos pendentes. A mãe só é disparada uma vez por sequência, salvo após reiniciar.

## Ferramenta de autoria opcional

O WAV já acompanha o projeto. **Não instale o sintetizador para jogar.** Para reproduzir apenas o arquivo provisório, instale `espeakng-loader==0.2.4` em uma pasta local e execute:

```bash
python3 scripts/generate-audio.py --tool-path CAMINHO_DA_FERRAMENTA
```

Fontes da ferramenta: [eSpeak NG](https://github.com/espeak-ng/espeak-ng), sob GPLv3, e [espeakng-loader](https://github.com/thewh1teagle/espeakng-loader). O [texto GPLv3 preservado](ESPEAK-NG-AUTHORING-LICENSE.txt) veio da revisão oficial `1.52.0/COPYING` e se refere à ferramenta. São ferramentas offline; nenhum programa, biblioteca, arquivo de voz ou dicionário do sintetizador é copiado para o runtime. O material falado é a frase fornecida no roteiro deste projeto.

O manifesto também registra hashes dos dados de pronúncia e formantes usados na autoria: `lang/roa/pt-BR`, `voices/!v/f3`, `phontab`, `phondata`, `phonindex` e `pt_dict`, provenientes da distribuição eSpeak NG empacotada pelo loader. Esses dados não são arquivos carregados pelo navegador.

Verificações de arquivo: o WAV foi decodificado com FFmpeg; contém 70.044 amostras, pico de −4,1 dBFS e média de −20,3 dBFS. Essas medidas comprovam sinal não vazio e margem antes de saturar; não comprovam naturalidade, interpretação ou mixagem final nos aparelhos. A reprodução e a espacialização no navegador precisam ser verificadas no fluxo real do protótipo.
