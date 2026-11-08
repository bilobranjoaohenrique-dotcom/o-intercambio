# Reconstrução visual — quarto do protagonista

Esta etapa reconstrói o quarto de **INTERCÂMBIO — Capítulo 1: A Despedida** segundo a imagem original e a prancha multivista fornecidas pelo usuário. A [especificação da reconstrução](PROMPT-RECONSTRUCAO-QUARTO.md) registra as dimensões propostas, as cinco interações obrigatórias e os critérios de avaliação.

A referência orienta um único ambiente 3D navegável. Não deve ser usada como imagem de fundo para simular o quarto, nem justificar espaços diferentes entre os enquadramentos. As dimensões são estimadas; a reconstrução não é uma cópia exata de arquivos originais que não foram fornecidos.

## Implementado

O quarto foi reconstruído em geometria dentro do capítulo existente, usando uma distribuição física compartilhada com o sistema de colisões. A área interna proposta mede **3,20 × 3,80 m**, com **2,60 m de pé-direito**. A porta continua ligada ao corredor e à escada, em vez de levar a outro cenário por um atalho de câmera.

A cama ocupa o lado esquerdo da vista da entrada; a escrivaninha fica sob a janela real, e o guarda-roupa ocupa a parede direita. A cama tem estrutura e cabeceira de madeira, colchão, travesseiro e cobertura xadrez com caimento. A escrivaninha reúne monitor CRT, teclado, torre, cadeira, livros e papéis. Mesa de cabeceira, abajur, relógio vermelho **06:30**, mochila, tapete central, fotografias, pôsteres fictícios e bandeira brasileira completam o ambiente. As prateleiras têm livros e planta pendente.

O guarda-roupa permanece fechado e o computador é um elemento visual: nenhuma interação futura de abrir o roupeiro, usar o computador ou examinar livros/pôsteres foi acrescentada. A porta tem painéis com veios de madeira, ferragens e maçaneta esférica de latão; sua animação mantém a folha e a colisão na mesma dobradiça.

As cinco interações desta etapa são:

| Objeto | Comportamento implementado |
| --- | --- |
| Porta | Abrir e fechar com animação e colisão, sem empurrar a folha através do jogador |
| Interruptor | Acender ou apagar a luz do teto; o abajur tem circuito separado |
| Mochila | Examinar e mostrar “Minha mochila. Quase tudo pronto para a viagem.” |
| Fotografia | Examinar e mostrar “Nós três, antes de tudo mudar. Vou sentir falta de casa.” |
| Calendário | Consultar “13 de junho. Hoje é o dia da viagem.” |

O despertar conserva a duração de **13,5 segundos**, com a trajetória da câmera ajustada à cama nova e à passagem livre ao lado dela. A missão mantém o percurso físico de sair do quarto e descer para o café. O objetivo, a conversa com os pais e as viagens posteriores continuam no sistema de narrativa existente; nenhum diálogo com voz foi adicionado.

A janela é uma abertura física na parede, com moldura, divisórias, vidro e cortinas xadrez pregueadas. Há casas, telhados, árvores, rua e calçada em geometria além dela. Apenas o céu distante usa um material de fundo; ele não substitui os objetos 3D do quarto ou da vizinhança.

O quarto possui quatro luzes locais: ambiente difusa, sol dourado direcional, abajur e circuito de teto separado. O interruptor controla a luz do teto; o abajur permanece ligado. As luzes locais são limitadas às malhas do quarto, e o mapa de sombras de **1024 × 1024** é reutilizado até uma atualização necessária. A comparação visual das capturas está registrada abaixo.

As texturas base são originais e geradas uma vez em Canvas: papel de parede rosa-bege, madeira com veios, parquet, tecido xadrez azul, cortinas, tapete ornamentado azul-cinza e superfícies de objetos usados. A fábrica cria **36 texturas base de 64, 128 ou 256 pixels** e **38 materiais únicos**, antes de eventuais materiais adicionais da geometria. As superfícies arquitetônicas e tábuas recebem UVs métricas antes do agrupamento das malhas, para conservar a escala dos padrões entre partes da parede e em torno da janela. Os tecidos da colcha e das cortinas usam o comprimento real das arestas tridimensionais, com quadrados de aproximadamente 15 cm; o travesseiro e a cadeira também têm mapeamento próprio para reduzir o estiramento. Esses números descrevem a fábrica de materiais, não uma medição de desempenho.

| Área | Arquivos | Responsabilidade |
| --- | --- | --- |
| Quarto e objetos | `src/scene/bedroom.ts` | Geometria, abertura da janela, mobiliário, detalhes, alvos físicos e luzes locais |
| Materiais | `src/scene/bedroomMaterials.ts` | Texturas procedurais originais de superfícies, tecidos e ilustrações |
| Distribuição e colisões | `src/game/layout.ts`, `src/game/collision.ts` | Medidas, posições, pegadas sólidas e ligação com o corredor |
| Despertar | `src/game/opening.ts` | Trajetória contínua da câmera entre a cama e a posição de controle |
| Integração | `src/scene/environment.ts`, `src/main.ts` | Cena doméstica, interações e atualização das sombras da porta |

A origem dos recursos está registrada em [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). Não foram importados modelos de jogos, capas de bandas ou texturas externas. As referências enviadas pelo usuário não são incorporadas como cenário plano. Diálogos e lembranças continuam exclusivamente por texto, sem vozes ou TTS.

## Testado

A execução definitiva do build de produção aprovou **TypeScript, 42 testes unitários e o build**. Os testes de física e despertar foram adaptados às medidas menores: a pose final fica na passagem livre, os movimentos longos não atravessam cama/parede/porta, a folha bloqueia o jogador quando fechada e o trajeto cama–porta–corredor–último degrau permanece contínuo.

A suíte focada `tests/bedroom-browser.mjs` terminou aprovada no Chromium. Ela começou uma partida nova, percorreu o despertar de 13,5 segundos e chegou às seis posições de câmera por teclado e mouse reais, sem reposicionar móveis entre as capturas. Exercitou fotografia e lembrança, calendário e data da viagem, mochila e legenda, interruptor duas vezes e porta com abertura e fechamento animados. Também verificou colisões com cama e porta fechada, pausa e saída física pelo corredor e escada até a missão de conversar com os pais. Não foi usada uma função de teleporte de diagnóstico para obter os enquadramentos.

O teste confirmou mudança de **439.851 dos 469.796 pixels internos** ao alternar a luz, em duas imagens feitas na mesma posição. Essa medida confirma uma alteração visível no quadro; não é uma avaliação de realismo. O horizonte permaneceu nivelado nos sete estados de câmera registrados pela suíte focada, com valor absoluto máximo de `horizonTilt` inferior a `6 × 10⁻⁹`. Não houve falhas de página, console, shader ou carregamento de arquivos na suíte focada.

Em seguida, `tests/browser.mjs` aprovou uma segunda partida nova no mesmo build, desde a cama até o fim do capítulo: despertar, porta, escada, cozinha, colisões de mesa e personagem, pausa, recarga real do checkpoint, conversa somente por texto e escolha de resposta. O percurso continuou pela mala, viagem de carro, aeroporto, portão, avião e chegada à família anfitriã até a conclusão. Não houve falhas de página, console, shader ou carregamento de arquivos nessa regressão. O comando `CHROMIUM_PATH=/usr/bin/chromium npm run verify` terminou com código de saída zero; as duas suítes foram executadas sequencialmente, em navegadores separados.

Esta é uma regressão nova do capítulo no build do quarto, não apenas uma referência aos resultados anteriores da cozinha. O perfil **Equilibrado** foi o único medido nesta etapa; não se repetiu o teste em Baixo, GPU física ou Windows.

O build manteve o aviso do Vite sobre o chunk principal acima de 500 kB: **1.427,26 kB**, ou **367,54 kB com gzip**. O aviso não foi ocultado. A cena carregada inteira registrou **282 malhas e 104.664 vértices**, incluindo ambientes posteriores ocultos; esses valores não representam apenas o quarto visível.

### Desempenho medido

Ambiente: **Node.js 24.19.0, Chromium 154.0.8037.57, Debian 13/Linux, SwiftShader e WebGL 2**, sem GPU física. A medição abaixo conta quadros realmente renderizados com a câmera parada no quarto durante aproximadamente dez segundos reais.

| Execução | Perfil | Janela | Resolução interna | Quadros / tempo real | FPS medidos |
| --- | --- | ---: | ---: | ---: | ---: |
| Suíte focada definitiva do quarto, build de produção | Equilibrado | 1280 × 720 | 914 × 514 | 66 / 10,005692729 s | 6,6 |
| Cozinha durante a nova regressão completa do capítulo | Equilibrado | 1280 × 800 | 914 × 571 | 81 / 10,002323179 s | 8,1 |

**O resultado é baixo e não comprova desempenho confortável ou 60 FPS.** É uma medição de renderização por software neste servidor; não foram medidos GPU física, Windows ou o computador do jogador. No quarto, a média de 139,8 ms e o P95 de 205,3 ms exibidos pelo indicador do jogo vêm de outra janela móvel e não são apresentados como estatísticas exatas desse intervalo de dez segundos. Na cozinha, o indicador registrou média de 104,6 ms e P95 de 145,5 ms, também em janela móvel distinta. Os dados originais estão em [resultados-quarto.json](resultados-quarto.json).

### Capturas reais de comparação

As seis imagens abaixo são capturas de **1280 × 720** da execução definitiva em Chromium, com resolução 3D interna de **914 × 514** no perfil Equilibrado. Foram copiadas sem alterações das capturas da suíte; não são imagens conceituais nem renders usados no lugar da jogabilidade. As posições e rotações efetivamente observadas da câmera estão registradas no JSON de resultados.

| Ângulo da referência | Captura real |
| --- | --- |
| Entrada: cama à esquerda, janela/escrivaninha e guarda-roupa à direita | [Vista da entrada](capturas/quarto-entrada.png) |
| Vista inversa, da janela para a porta | [Vista inversa](capturas/quarto-inversa.png) |
| Lateral da cama, abajur e relógio | [Cama e mesa de cabeceira](capturas/quarto-cama.png) |
| Escrivaninha, CRT, teclado e torre | [Detalhes da escrivaninha](capturas/quarto-escrivaninha.png) |
| Guarda-roupa com portas fechadas e fotografias | [Guarda-roupa](capturas/quarto-guarda-roupa.png) |
| Prateleiras com livros e planta | [Prateleiras](capturas/quarto-prateleiras.png) |

Duas capturas complementares foram feitas depois da regressão completa, no mesmo build sem alterações, em outra partida nova e usando apenas movimento e olhar normais. Elas não acrescentam uma nova medição de desempenho:

- [Vista ampla complementar](capturas/quarto-vista-ampla.png), mostrando mais piso e abajur; o relógio fica fora do enquadramento.
- [Detalhe do abajur e relógio 06:30](capturas/quarto-relogio.png), com mesa de cabeceira, mochila e cama.

### Comparação visual

A inspeção das seis capturas de produção mostra o mesmo mobiliário nas vistas de entrada e inversa: cama e cabeceira junto à parede com pôsteres, mesa sob a janela e guarda-roupa na parede oposta. As aproximações mostram os tecidos, o computador, as fotografias e a planta no mesmo espaço, sem reposicionar os objetos entre imagens. A sobreposição de faces entre o começo do corredor e a parede junto à porta, que produzia uma faixa clara na vista inversa, foi removida antes desta execução definitiva.

A reconstrução conserva a organização e a paleta da referência, mas **não alcança uma cópia exata**. As fotografias e os pôsteres são ilustrações autorais mais estilizadas; as folhas, tecidos, vizinhança e molduras têm menos detalhe. O tapete e o papel de parede usam padrões próprios. A iluminação é uma aproximação com luzes locais e sombras em mapa; não reproduz todos os contrastes, reflexos e detalhes de luz da prancha. As capturas com campo de visão de primeira pessoa também diferem dos enquadramentos compostos da referência. A aprovação artística depende da avaliação do usuário.

## Pendente

- Medir desempenho em GPU física e no computador do jogador; verificar o `.bat` e a execução no Windows.
- Obter a avaliação visual do usuário; a implementação não presume aprovação automática de fidelidade.

A publicação na Vercel não foi validada nesta etapa: os testes executaram o build de produção por HTTP local.

Abrir o guarda-roupa, usar o computador, examinar pôsteres/livros e dormir continuam fora desta etapa. O acabamento de aeroporto, avião e cidade anfitriã também não faz parte desta reconstrução.
