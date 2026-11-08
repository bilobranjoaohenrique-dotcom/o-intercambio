# Reconstrução visual — corredor superior e escada

Esta etapa de **INTERCÂMBIO — Capítulo 1: A Despedida** se limita ao corredor do segundo andar e à escada que liga o quarto à cozinha. A [especificação fornecida pelo usuário](PROMPT-RECONSTRUCAO-CORREDOR.md) delimita a composição, as interações e as verificações exigidas. A prancha e a vista principal enviadas na conversa orientam a reconstrução de um único espaço 3D.

A imagem de referência gerada anteriormente na conversa é uma proposta artística. Este relatório usa somente capturas do jogo executado no navegador como evidência da implementação.

## Implementado

O módulo do corredor reúne um único ambiente 3D com piso de madeira, papel de parede floral bege, rodapés e molduras brancos, portas laterais fechadas com painéis e maçanetas, tapete comprido e luminária opalina. A janela é uma abertura física na parede, com vidro, moldura, cortinas rendadas pregueadas e fundo de céu além do vão. O aparador tem tampo, gavetas, puxadores, prateleira, livros, toalhinha de renda, caneca e vaso. O telefone possui corpo inclinado, fone separado, doze teclas e fio espiralado em geometria. Outra planta fica suspensa junto ao patamar.

A escada possui dezoito degraus com espelhos, narizes, longarinas, corrimãos contínuos, balaústres torneados e postes com remates. Um contrapiso interno opaco sob o vão impede que o antigo jardim externo apareça entre a escada e as paredes. Suas medidas vêm do mesmo layout usado pelas colisões. O patamar inferior se abre para a entrada existente da cozinha, sem deslocar outro ambiente. O fechamento alto do vão, acima da verga existente, integra a diferença de altura dos tetos e recebe uma paisagem e uma cruz discreta, conforme a referência. A descida usa o controle de câmera já existente.

As molduras mostram a fotografia familiar dos pais com o filho e paisagens neutras. Não há quadro individual da menina. Quadros, plantas, telefone e portas laterais não recebem comandos de interação; são elementos decorativos nesta etapa. A porta do quarto conserva sua própria animação e colisão. O novo interruptor alterna a luminária superior e a arandela da escada, mantendo a luz natural.

O corredor tem quatro luzes próprias: ambiente difusa, sol pela janela, luminária superior e arandela. As duas últimas respondem ao interruptor. As luzes afetam somente as malhas do corredor, e o mapa de sombras de 1024 × 1024 é reutilizado até uma atualização necessária. As malhas estáticas são agrupadas por material; os alvos de interação permanecem separados. A implementação não aumenta o desfoque ou a granulação globais para ocultar os detalhes do ambiente.

O quarto aprovado, a cozinha, os personagens, os controles globais, a história, os diálogos e as demais fases permanecem fora do escopo desta reconstrução. A conferência de preservação e o percurso real estão registrados na seção de testes.

## Dimensões e ligação dos ambientes

As medidas da referência são estimativas. A distribuição implementada mantém as posições do quarto e da cozinha existentes:

| Elemento | Medida implementada |
| --- | --- |
| Corredor superior | 1,40 × 4,50 m |
| Pé-direito superior | 2,60 m |
| Porta do quarto | 0,80 × 2,10 m, preservada |
| Escada | 0,90 m de largura; 18 degraus para vencer 3,00 m |
| Espelho de cada degrau | Aproximadamente 16,67 cm |
| Desenvolvimento da escada | 4,00 m |

A integração usa regiões próprias para o corredor superior, a escada e o patamar inferior. Os limites legados da passagem para a cozinha são conservados, para evitar deslocar ou remodelar a cozinha indiretamente por uma alteração do corredor. A ligação foi conferida no percurso real e nas verificações de física descritas abaixo.

## Modelos, materiais e arquivos

A fábrica `src/scene/hallwayMaterials.ts` cria materiais e texturas originais por código. Ela contém **21 materiais base e 20 texturas**, antes de eventuais materiais adicionais da geometria. As superfícies incluem papel de parede floral bege, parquet e madeira envernizada, pintura branca, tapete vinho/ocre, renda com furos definidos por transparência, plástico bege usado no telefone, metais, cerâmica e folhas. As arquiteturas deixam a escala de UV sob controle do módulo de geometria, em vez de impor uma escala global a todas as peças.

As texturas usam resoluções de 64 a 256 pixels por lado, exceto o tapete completo de 128 × 512 pixels. Madeira e renda usam formatos retangulares; as paisagens têm 256 × 192 pixels. A fotografia familiar e as três paisagens campestres são ilustrações autorais. O vidro usa material sem bitmap externo. Esses números descrevem a fábrica de recursos, não uma medição de desempenho.

As referências não fornecem arquivos de malhas ou texturas originais reutilizáveis. O quadro individual da menina não faz parte desta etapa: as molduras recebem paisagens neutras ou a fotografia dos pais com o filho. Não foi importado pacote externo de materiais. As malhas são originais e construídas por código para Babylon.js; não foi importado modelo GLB/GLTF externo. Os auxiliares criam peças com bordas chanfradas, perfis torneados e folhas dobradas. A arquitetura e as tábuas recebem UVs métricas antes do agrupamento das malhas; o tapete usa seu desenho completo e as cortinas usam a textura rendada. A procedência está em [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

| Área | Arquivos | Responsabilidade |
| --- | --- | --- |
| Cenário e objetos | `src/scene/hallway.ts`, `src/scene/hallwayGeometry.ts` | Corredor, janela, portas decorativas, mobiliário, telefone, plantas, escada, balaústres e luzes |
| Materiais | `src/scene/hallwayMaterials.ts` | Texturas e ilustrações originais, renda com transparência e materiais locais |
| Distribuição física | `src/game/hallwayLayout.ts`, `src/game/layout.ts` | Corredor, patamar inferior, escada e posições dos sólidos |
| Colisões | `src/game/collision.ts` | União dos pisos, aparador, guarda-corpos, postes e percurso até a cozinha |
| Integração | `src/scene/environment.ts`, `src/main.ts` | Substituição do corredor anterior, interruptor, reinício e diagnóstico de leitura |

Também foram atualizados `AGENTS.md`, `README.md`, `THIRD_PARTY_NOTICES.md`, `package.json` e `scripts/verify.mjs` para registrar o escopo, os recursos e a execução da suíte focada. Os arquivos de teste novos e ajustados estão relacionados na seção de validação; este diretório reúne ainda o prompt original, o relatório, os resultados e as capturas.

## Testado

### Conferências estáticas

Uma comparação com o commit anterior `073b90754666d6986da842a8ca659864c5525e1a` confirmou que dezenove arquivos protegidos permanecem idênticos, incluindo modelos e materiais do quarto, cozinha e pais, cenas posteriores, controle do jogador, narrativa, diálogos, despertar, áudio, configurações, porta existente e interface. Os valores de nove exportações de layout do quarto, cozinha e viagens também permaneceram iguais. Os limites legados da abertura para a cozinha foram conservados. Essa verificação compara código e valores; ela não substitui a regressão jogável ou a inspeção de imagens.

Uma auditoria separada em NullEngine verificou 446 peças geométricas antes do agrupamento, com posições, normais e UVs finitos. Conferiu as superfícies dos dezoito degraus em relação ao piso usado pela física, a abertura da janela, o alvo do interruptor, as pegadas de corrimãos/postes/aparador e o fechamento do vão alto. A cúpula final teve as normais conferidas para fora. A auditoria substituiu os materiais por versões neutras: seus resultados comprovam a geometria examinada, não a iluminação ou as texturas finais.

### Execução no navegador

A execução de produção desta etapa aprovou **TypeScript, 46 testes unitários e o build**. A suíte `tests/hallway-browser.mjs` terminou aprovada no Chromium, começando uma partida nova e usando teclado e mouse reais para sair do quarto e percorrer o corredor. Não foi usado teleporte de diagnóstico para compor as imagens.

| Verificação focada | Resultado observado |
| --- | --- |
| Porta existente | Aberta e fechada dos dois lados; a folha fechada bloqueou a passagem |
| Interruptor do corredor | Duas alternâncias com alteração real do quadro e sem mudar o estado da luz do quarto |
| Portas laterais, telefone e quadro decorativo | Sem prompt falso; pressionar E não avançou missão ou iniciou diálogo |
| Aparador e corrimãos | O corpo parou antes de atravessar o aparador e os dois limites da escada |
| Descida e subida | Percurso físico entre os patamares, com acompanhamento da altura e horizonte nivelado |
| Pausa e missão | Posição preservada na pausa; “Desça para tomar café” só concluiu no degrau final previsto |
| Ligação com a cozinha | Chegada ao ambiente existente e atualização para “Converse com seus pais” |

A alternância do interruptor alterou **297.076 de 469.796 pixels internos**, em imagens do mesmo ponto de observação. A comparação comprova uma mudança visual de iluminação, não o realismo dessa iluminação. A luz do quarto manteve seu estado. Na descida, foram registradas 24 amostras de posição; a maior variação média de altura entre coletas foi de aproximadamente 0,129 m por quadro observado. Essa amostragem e a inspeção visual não equivalem a uma garantia de desempenho em todos os computadores.

Não houve falhas de página, console, shaders ou carregamento de arquivos na suíte focada definitiva. A regressão do quarto também terminou aprovada no mesmo build, verificando novamente o despertar, as cinco interações, as colisões, a pausa e a saída física pela escada. A regressão do capítulo completo também terminou aprovada: partida nova, quarto, escada, cozinha, colisões, pausa, recarga real do checkpoint, diálogo e escolha com os pais, mala, viagem de carro, aeroporto, avião e encontro com a família anfitriã até o encerramento do capítulo.

A validação é organizada nos seguintes arquivos: `tests/hallway-browser.mjs`, `tests/hallwayCollision.test.mjs`, `tests/collision.test.mjs`, `tests/kitchenCollision.test.mjs` e `tests/bedroom-route.mjs`. O comando `CHROMIUM_PATH=/usr/bin/chromium npm run verify` terminou com código de saída 0, executando tipos, testes e build, depois as suítes de corredor, quarto e capítulo completo. `npm run test:hallway` executa apenas a suíte focada com o jogo servido por HTTP e `INTERCAMBIO_URL` configurado.

O Vite emitiu o aviso de chunk principal acima de 500 kB. O arquivo final observado foi `dist/assets/index-CdDPWExy.js`, com **1.456,43 kB** ou **378,25 kB com gzip**; o build terminou com sucesso. A cena carregada registrou **299 malhas e 130.933 vértices**, incluindo os ambientes posteriores ocultos. Esses valores não são a contagem apenas do corredor visível nem uma medida de chamadas de desenho.

### Capturas reais de comparação

As cinco vistas pedidas e três imagens complementares foram capturadas em **1280 × 720**, com resolução interna de **914 × 514**, no perfil Equilibrado do build de produção. Os arquivos foram copiados sem alterações das capturas do navegador. Os enquadramentos pertencem ao mesmo cenário; móveis e objetos não foram reposicionados entre as imagens. As posições e rotações efetivamente observadas da câmera constam em [resultados-corredor.json](resultados-corredor.json).

| Ângulo solicitado | Captura real |
| --- | --- |
| Corredor a partir da porta do quarto | [Vista de entrada](capturas/corredor-entrada.png) |
| Vista inversa, olhando para o quarto | [Vista inversa](capturas/corredor-inversa.png) |
| Corrimão e escada | [Detalhe do corrimão e dos degraus](capturas/corredor-corrimao-escada.png) |
| Durante a descida | [Vista da descida](capturas/corredor-descida.png) |
| Paredes, quadros, tapete e iluminação | [Detalhes do corredor](capturas/corredor-detalhes.png) |
| Complemento: aparador, telefone e plantas | [Aparador](capturas/corredor-aparador.png) |
| Complemento: interruptor com luz alternada | [Iluminação alternada](capturas/corredor-luz-alternada.png) |
| Complemento: cozinha vista da parte inferior da escada | [Ligação com a cozinha](capturas/corredor-ligacao-cozinha.png) |

A oitava imagem foi feita em uma execução complementar do mesmo build: despertar novo, porta animada e deslocamento real até a parte inferior do lance. Ela mostra mesa, pais e mala existentes pela abertura física da cozinha. A verga original ocupa a parte superior do enquadramento, e a imagem não reproduz a vista ampla da cozinha na referência. Essa execução não acrescenta uma nova medição de desempenho nem substitui a regressão completa já aprovada.

### Comparação visual

A inspeção das sete capturas da suíte e da vista complementar confirma uma distribuição consistente: as portas e molduras permanecem na mesma parede, e janela, renda, aparador e telefone mantêm suas posições quando a câmera se vira. O corredor termina na escada de madeira, que leva à cozinha existente. A imagem da menina foi substituída por uma paisagem; as demais fotografias são a ilustração dos pais com o filho. O fechamento alto do vão, a cúpula com faces externas visíveis e o contrapiso da escada corrigem, respectivamente, o vazio claro ao fundo, a aparência vazada da luminária e o jardim externo que aparecia nos vãos laterais da primeira revisão.

A composição e a paleta seguem as referências, mas **não são uma cópia exata**. Fotografias, paisagens, motivos do tapete e papel de parede são desenhos próprios com menos detalhe. A iluminação usa quatro luzes locais e sombras em mapa; seus contrastes, reflexos e padrões de luz diferem da imagem conceitual. O campo de visão de primeira pessoa e a arquitetura preservada da cozinha limitam a visão da mesa a partir do topo da escada: as vistas do percurso mostram o vão real e o piso da cozinha, sem inserir uma imagem de cozinha no fundo. A escada reta e seus dois corrimãos também diferem do enquadramento mais aberto de parte da prancha. A avaliação artística permanece com o usuário.

### Desempenho medido

Ambiente: **Node.js 24.19.0, Chromium 154.0.8037.57, Debian 13/Linux, SwiftShader e WebGL 2**, sem GPU física. As duas medições usam o perfil Equilibrado, janela de 1280 × 720 e quadro interno de 914 × 514.

| Intervalo observado | Quadros | Tempo real | Deslocamento | FPS medidos |
| --- | ---: | ---: | ---: | ---: |
| Câmera parada no corredor | 73 | 10,003707398 s | — | 7,3 |
| Caminhada real com W pelo piso superior | 34 | 4,873890196 s | 3,465 m | 7,0 |

A caminhada inclui o custo de controle e amostragem da automação; ela não é derivada da medição parada. **Os resultados são baixos e não comprovam fluidez confortável ou 60 FPS.** Não foram medidos GPU física, Windows ou o computador do jogador. A média de 154,8 ms e o P95 de 303,1 ms exibidos pelo indicador pertencem a outra janela móvel, e não são apresentados como estatísticas exatas desses intervalos. Os dados da suíte e as conferências estáticas estão em [resultados-corredor.json](resultados-corredor.json).

## Limitações e itens não verificados

- O desempenho no computador do jogador, em GPU física e no Windows não foi medido nesta execução. Os resultados de software descritos acima são baixos.
- A fidelidade visual é aproximada, com os limites da comparação descritos acima. A apresentação das capturas não presume aprovação artística automática do usuário.

A publicação na Vercel não foi verificada nesta etapa; o build de teste foi servido por HTTP local. Telefone, quadros e plantas permanecem decorativos, sem novas missões. Os diálogos continuam exclusivamente por texto, sem vozes ou TTS.
