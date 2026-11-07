# Áudio — O Despertar

O desenho sonoro usa Web Audio: ambiência doméstica original e a frase da mãe carregada de um WAV local. O projeto é independente e não reutiliza código, gravações ou recursos de outros jogos da área de trabalho.

A chamada tem o texto exato **“Ei, vem tomar café pra não se atrasar!”**, em português brasileiro. O arquivo atual é **voz sintética provisória e substituível**, feita com eSpeak NG `pt-br+f3`; não atende à qualidade de uma gravação feminina adulta natural. O roteiro permite essa substituição provisória. A legenda e a identificação MÃE devem continuar funcionais. Consulte o [inventário e instruções para a gravação final](../public/audio/README.md).

O emissor fica no andar inferior, em `OBJECTS.mother` do layout. PannerNode HRTF define a direção e a redução por distância; filtro passa-baixas suaviza as frequências altas conforme a distância e a diferença de andar. O efeito de paredes é aproximado por essas duas medidas, sem simulação acústica complexa.

Babylon.js usa coordenadas com +Z para a frente e Web Audio usa um espaço de mão direita. O módulo reflete o eixo Z de todas as fontes e da posição, direção e vetor vertical do ouvinte ao atribuí-los a Web Audio. Os cálculos de distância e os registros principais de diagnóstico permanecem nas coordenadas do jogo. Isso conserva o lado esquerdo/direito em relação ao movimento da câmera; `diagnostics.webAudio` expõe as atribuições reais para os testes.

Os sons de vento, pássaros, relógio e cozinha distante usam poucos osciladores e um buffer de ruído compartilhado. Eventos são espaçados; não há geração de um novo arquivo por quadro. Roupa, cama, passos, porta, maçaneta e apresentação do objetivo têm efeitos curtos e discretos.

`src/game/audio.ts` separa o áudio do controle e da sequência inicial. `prepare()` busca o WAV; `unlock()` cria e retoma o contexto a partir do gesto de início, sem aguardar uma operação assíncrona antes de o controlador pedir Pointer Lock. `updateListener(camera)` recebe a câmera já atualizada pelo controlador. `pause()` conserva o tempo da fala; `reset()` interrompe a fala anterior e permite uma nova chamada na sequência reiniciada; `dispose()` encerra fontes, temporizadores e contexto.

Se o arquivo ou Web Audio falhar, `voiceInfo.error` identifica a limitação para a interface. O módulo não substitui a fala por uma mensagem que finja dublagem nem usa o sintetizador do navegador, serviços externos ou APIs pagas.

O WAV foi decodificado offline e tem 3,1766 segundos, 140.132 bytes e sinal não vazio. A checagem de tipos do módulo foi executada separadamente. A validação sonora final no navegador e em alto-falantes/fones físicos deve ser descrita somente após o teste correspondente.
