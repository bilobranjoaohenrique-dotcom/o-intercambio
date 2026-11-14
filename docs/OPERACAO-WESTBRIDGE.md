# Operação INTERCÂMBIO — Westbridge jogável

## Etapa 1 — auditoria e restauração

Ponto estável: tag `restore/pre-westbridge-playable`, commit `6cefec0`. O bairro está em `public/models/westbridge.glb`, validado apenas em `tools/westbridge-review.*`. A fase `town` atual é o terminal de chegada; a fala de boas-vindas termina o capítulo em `src/main.ts`. Portanto a integração jogável ainda precisa ser construída.

Ampliação necessária: acrescentar Westbridge como região com carregamento seletivo, duas missões de continuação (`westbridge-ride` e `westbridge-explore`) e navegação local. A fala existente e todos os ambientes anteriores serão preservados. O deslocamento do contêiner do bairro para X=500 separa seus limites dos cenários anteriores, mantendo intactas as transformações locais de todas as casas.

O controlador atual já possui aceleração, desaceleração, piso, head bob discreto, arraste de mouse e limites para assentos. Será reutilizado com um provedor de navegação por região. A direção Z do movimento será validada contra a orientação real da câmera Babylon. O carro fornecido possui somente exterior opaco; a vista traseira exige um interior específico, sem substituir o exterior aprovado. Daniel e Helen serão os modelos já usados no terminal.

Arquivos previstos: `src/main.ts`, `src/scene/chapterWorld.ts`, `src/scene/arrival.ts`, `src/game/narrative.ts`, `src/game/parentsDeparture.ts`, `src/game/player.ts`, `src/game/audio.ts`; módulos novos `westbridge*` para cenário, luzes, decoração, navegação, percurso e áudio. Testes focais e este relatório acompanharão cada etapa. Os GLBs anteriores e a história dos pais permanecem como estão.

Etapas seguintes: rua dos anfitriões com luz de fim de tarde; viagem e estacionamento; exploração e interações; áudio não verbal; medição e acabamento. Metas de 60 FPS desktop/30 FPS móvel serão metas de hardware, nunca resultados presumidos a partir do renderizador por software deste ambiente.

## Etapa 2 — rua dos anfitriões

`src/scene/westbridge.ts`, `westbridgeLighting.ts` e `westbridgeProps.ts` carregam o GLB aprovado sem reexportar ou substituir suas casas. A casa `HOST_FAMILY_HOUSE_DANIEL_HELEN` continua sendo o marco da chegada. O bairro recebe céu local, sol baixo, sombras estáticas, névoa moderada e luz de varanda. O preset noturno acende postes e algumas janelas; ele é acessível para inspeção por `?westbridgeLighting=night`, sem criar um novo acontecimento ou relógio narrativo.

Lixeiras, bicicleta, jornal, grelhas e folhas foram distribuídos na área focal. Peças de decoração são agrupadas por material e folhas usam thin instances. As três saídas da rua têm sinalização física; a exploração desta etapa não é uma cidade inteira aberta. Referências de porta e caixa de correio são registradas no sistema existente de interação antes do carregamento do modelo.

## Etapa 3 — viagem e estacionamento

`src/game/westbridgeDrive.ts` amostra um trajeto de 32 segundos com distância suavizada, curva contínua e velocidade nula nos extremos. O jogador ocupa o banco traseiro e conserva o olhar relativo ao carro, inclusive com arraste quando Pointer Lock é negado. Pausar interrompe o relógio da viagem. Sair com E só funciona após estacionar; uma transição curta esconde a mudança do assento para a posição segura ao lado do carro.

`src/scene/westbridgeVehicle.ts` conserva o exterior do GLB fornecido. Como esse arquivo possui uma única superfície externa opaca, sem cabine, foi criado um interior separado, texturizado e agrupado em sete malhas. Isso evita olhar através de janelas opacas pelo lado interno. O exterior reaparece na exploração.

`src/scene/arrivalVehicleHosts.ts` transfere os mesmos modelos, materiais e rigs de Daniel e Helen do terminal. Daniel usa a pose sentada existente; Helen recebe rotações compatíveis, preservando seus comprimentos ósseos. Atores e hierarquias são restaurados ao reiniciar. Os pais do protagonista permanecem no aeroporto brasileiro.

## Etapa 4 — exploração, navegação e salvamento

`src/game/westbridgeLayout.ts` registra medidas extraídas do GLB: ruas, passeios, entrada de garagem, degraus, varanda, casas, troncos e cercas da área focal. Dez trechos de cercas vizinhas também foram medidos em seus 190 componentes, mantendo abertas suas extremidades e o acesso aos anfitriões. `westbridgeNavigation.ts` faz colisão circular com subpassos e deslizamento, piso e escolha de superfície. Os objetos novos e o carro estacionado participam da colisão. O controlador original recebe o provedor de navegação da região; sua aceleração, sensibilidade, head bob discreto e controles são mantidos. Ao sair de Westbridge, volta ao provedor anterior.

O raycast existente continua tratando alcance e oclusão. E permite consultar a caixa de correio e concluir a chegada junto à porta. A casa não ganhou um interior fictício; a entrada é a referência para a próxima etapa da história.

As missões novas são `westbridge-ride` e `westbridge-explore`. A retomada durante a viagem reinicia o percurso na entrada do bairro sob fade; a retomada da exploração estaciona o carro e coloca o jogador ao lado dele. A escolha da conversa com os pais é mantida. Checkpoints antigos que encerravam logo após a recepção no terminal migram para a viagem, sem repetir o capítulo inteiro. Reaplicar a missão ativa apenas persiste o checkpoint normalizado, sem marcá-la como concluída prematuramente.

## Etapa 5 — áudio e atmosfera

`src/game/westbridgeAudio.ts` utiliza o mesmo contexto e volume do áudio existente: vento, trânsito distante, pássaros esparsos, insetos, interior abafado, motor e pneus por velocidade, porta do carro e passos por superfície. Panners acompanham posição e orientação da câmera. Pausa, volume zero, troca de região e descarte são respeitados. Não há vozes, TTS ou música comercial.

Os efeitos novos são **síntese procedural própria e provisória**, identificada nos diagnósticos. A instrumentação disponibiliza RMS real e ganhos para testar silêncio, pausa e fontes; isso não substitui uma revisão humana de mixagem em fones e caixas.

## Etapa 6 — custo, preservação e acabamento

O bairro de 18,63 MB só é solicitado após a recepção no terminal. As malhas usam culling normal e os materiais existentes; não foi introduzida uma biblioteca nova nem um LOD destrutivo. O interior do carro reúne suas peças por material. Sombras do cenário são renderizadas uma vez, com 1024² no perfil equilibrado e 2048² no alto; o perfil baixo as desliga. Carro e atores recebem as sombras do cenário, mas não geram mapas dinâmicos adicionais. O céu não recebe névoa, evitando que o gradiente desapareça.

Ao trocar de cenário, o estado anterior de névoa, image processing, alcance de câmera e visibilidade é restaurado. Reiniciar restaura também FOV e navegação do quarto. O contador de desempenho considera os frames lentos durante o jogo, em vez de descartá-los por excederem 500 ms.

O primeiro `npm test` completo expôs quatro expectativas antigas já incompatíveis com a planta e o texto aprovados. A mesma falha foi reproduzida no ponto de restauração `6cefec0`. Foram atualizados somente os três arquivos de testes correspondentes, sem alterar a cozinha, lavanderia ou colisões anteriores. A suíte final passou com **117/117 testes**.

## Resultado executado e capturas reais

Fluxo entregue: recepção existente no terminal → viagem de 32 segundos no banco traseiro → estacionamento e motor desligado → E para sair → exploração a pé → entrada da casa. A casa conserva o modelo aprovado. O interior residencial e a continuação da história não foram inventados; interagir com a entrada conclui o trecho atual do capítulo.

As cinco imagens abaixo foram capturadas no Babylon.js em execução, sem geração de imagem, sem mover a câmera por setters e sem acelerar o relógio. Todas pertencem ao mesmo build visual (`index-CRb6sNMh.js`). A alteração posterior nesse build foi somente a proteção de salvamento contra concluir a missão ativa ao reaplicá-la (`index-MsnVZgCD.js`), sem mudar a renderização.

| Captura | Evidência |
| --- | --- |
| [Banco traseiro](capturas/westbridge-jogavel/banco-traseiro.png) | Cabine texturizada, Daniel e rua à frente; Helen fica encoberta pelo encosto neste ângulo. |
| [Olhar pela janela](capturas/westbridge-jogavel/janela.png) | Olhar relativo ao carro e casas passando. |
| [Carro estacionado](capturas/westbridge-jogavel/estacionado.png) | Exterior original e acesso à casa após sair caminhando. |
| [Casa no fim de tarde](capturas/westbridge-jogavel/casa-tarde.png) | Fachada, jardim, bicicleta e caminho até a entrada. |
| [Casa à noite](capturas/westbridge-jogavel/casa-noite.png) | Janelas acesas e luz localizada na varanda. |

Dia e noite usam o mesmo alvo e posição de caminhada equivalente, com diferença de 4,4 cm entre as câmeras, não uma comparação pixel a pixel. O sol da versão final ilumina a fachada a partir da rua; emissores dos postes foram alinhados às luminárias medidas no GLB. A [revisão artística anterior](WESTBRIDGE-REMASTER.md) contém comparações dos materiais antes/depois; suas imagens não representam esta nova sequência jogável.

## Validação

| Verificação | Resultado |
| --- | --- |
| `npm test` | 117 aprovados, zero falhas. Inclui navegação, percurso, áudio, checkpoints e transferência dos rigs reais dos anfitriões. |
| `npm run build` | TypeScript e Vite aprovados. Permanece o aviso de bundle principal acima de 500 kB. |
| Recepção e carregamento | Boas-vindas existentes preservadas; Westbridge solicitado somente após avançar a conversa. |
| Viagem real | 939 amostras visíveis, trajeto contínuo até estacionar; pausa congela posição e tempo; olhar funciona e WASD não desloca o passageiro. |
| Estacionamento e saída | Velocidade e motor zerados; E leva ao ponto seguro ao lado do carro e salva a exploração. |
| Caminhada e colisões | Percurso real por teclado; cerca, parede da casa e lateral do carro bloqueiam movimento continuado. |
| Save e entrada | Recarga retoma a exploração estacionada, preserva a escolha `nervous`; E na porta conclui o capítulo. |
| Reinício | Volta ao quarto com navegação anterior e projeção restaurada (FOV 1,13; near 0,045; far 95); anfitriões voltam à hierarquia do terminal e áudio de Westbridge é desligado. |
| Texturas e console | Cinco capturas finais com texturas prontas, zero malhas de outros cenários visíveis, zero erros de console ou assets falhos. |
| Preservação | Nenhum GLB ou arquivo em `public/textures` alterado. Construções anteriores e textos de diálogo não foram reescritos. |

O navegador foi validado **em segmentos reais**, reaproveitando os registros aprovados de recepção/viagem para continuar pela exploração, noite e reinício. Não se trata de uma única execução ininterrupta do último build. As capturas finais foram feitas novamente após o acabamento visual. A última proteção de save recebeu um carregamento próprio no navegador. O [registro resumido](resultados-westbridge-jogavel.json) distingue essas verificações. Os percursos completos da casa brasileira, aeroporto e avião não foram repetidos; a suíte unitária e o retorno ao cenário inicial foram verificados.

Para repetir o fluxo focal: executar o preview em `4188` e usar `INTERCAMBIO_URL=http://localhost:4188 npm run test:westbridge`. O modo padrão testa a sequência completa desde o checkpoint do terminal com controles reais; as opções de retomada do script exigem evidências prévias de execução.

## Desempenho medido e limites

| Ambiente da medição final | Valor |
| --- | --- |
| Chromium/Linux | WebGL 2 via **SwiftShader por software**, sem GPU física |
| Preset/perfil | Noite / equilibrado |
| Viewport / resolução interna | 1280 × 720 / 914 × 514 |
| Método | 30 intervalos RAF estacionários após 5 frames de aquecimento; somente timestamps durante a amostra |
| Frame médio / p95 | 469,43 ms / 849,90 ms |
| Taxa observada | **2,13 FPS neste ambiente por software** |
| Metas 60 FPS desktop / 30 FPS móvel | **Ainda não validadas em hardware-alvo** |

Essa medição não demonstra desempenho comercial estável nem permite estimar o FPS de GPU física. O carregamento seletivo foi aplicado ao novo bairro e carro; os cenários anteriores ainda usam sua estratégia existente. Não foi feita uma reescrita global de streaming, oclusão ou LOD sem medição adequada.

Limitações visuais explícitas: o interior do carro é uma adaptação texturizada para primeira pessoa, com poses sentadas existentes, sem IK das mãos no volante ou animação completa de condução. Helen está no assento dianteiro, mas não aparece nos enquadramentos entregues porque o encosto a cobre. As sombras adicionadas são estáticas; carro e atores recebem luz/sombra, sem gerar sombras dinâmicas extras. Os efeitos de áudio são provisórios e precisam de revisão humana de mixagem.

Próximas tarefas recomendadas: medir CPU/GPU e memória em desktop intermediário e celular real; ajustar orçamento a partir desses resultados; revisar áudio em fones/caixas; produzir pose de condução e acabamento da cabine; desenvolver o interior da casa somente com direção narrativa e visual aprovada.

## Arquivos modificados

| Grupo | Arquivos |
| --- | --- |
| Integração e progresso | `src/main.ts`, `src/scene/chapterWorld.ts`, `src/game/narrative.ts`, `src/game/parentsDeparture.ts` |
| Cenário e iluminação | Novos `src/scene/westbridge.ts`, `westbridgeLighting.ts`, `westbridgeProps.ts` |
| Veículo e anfitriões | Novo `src/scene/westbridgeVehicle.ts`, `arrivalVehicleHosts.ts`, `src/game/westbridgeDrive.ts`; adaptação em `src/scene/arrival.ts` |
| Navegação | Novos `src/game/westbridgeLayout.ts`, `westbridgeNavigation.ts`; provedor em `src/game/player.ts` |
| Áudio | Novo `src/game/westbridgeAudio.ts`; integração em `src/game/audio.ts` |
| Verificação | Novos testes `westbridge-{audio,drive,navigation,progress}.test.mjs`, `arrival-vehicle-hosts.test.mjs` e `westbridge-game-browser.mjs`; extensão de `player.test.mjs`; correção das expectativas legadas em `collision`, `kitchenCollision` e `parents-departure` |
| Entrega | Script em `package.json`, `AGENTS.md`, `README.md`, referência em `docs/WESTBRIDGE-REMASTER.md`, este relatório, registro JSON e cinco capturas |

Reversão: `restore/pre-westbridge-playable` conserva o commit anterior completo. A entrega não altera dependências nem arquivos binários de modelos/texturas aprovados.
