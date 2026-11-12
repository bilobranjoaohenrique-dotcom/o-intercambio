# INTERCÂMBIO — Capítulo 1: A Despedida

Jogo narrativo 3D em primeira pessoa, com visual retrô inspirado em PS1/PS2. O capítulo acompanha o protagonista na manhã da viagem: despertar, café com os pais, embarque, avião e chegada à cidade anfitriã.

**Diálogos são exclusivamente textos na tela.** Não há dublagem, vozes sintéticas, narração nem fala ambiente. Os sons são efeitos e ambiência procedural.

## Executar

Requer Node.js 24 ou superior.

No Windows, também é possível abrir `INICIAR-O-INTERCAMBIO.bat`. Ao baixar uma atualização, extraia o ZIP em uma pasta nova para não usar um build antigo que tenha ficado na pasta anterior.

```bash
npm ci
npm run dev
```

Abra [http://localhost:5180](http://localhost:5180). Para gerar o build:

```bash
npm run build
npm run preview
```

O build fica em `dist/`; sirva por HTTP, não abra `index.html` via `file://`.

## Controles

| Ação | Controle |
| --- | --- |
| Andar | WASD |
| Olhar | Mouse |
| Correr | Shift |
| Interagir | E |
| Avançar diálogo | E, Enter ou clique |
| Pausar | Esc |

Procure os objetos destacados pelo prompt de interação. O café permite escolher uma resposta; as escolhas registram um checkpoint.

## Quarto do protagonista

A reconstrução do quarto segue a imagem original e a prancha multivista fornecidas pelo usuário, com um único espaço 3D e dimensões aproximadas de 3,20 × 3,80 m. O [guia desta etapa](docs/PROMPT-RECONSTRUCAO-QUARTO.md) delimita as cinco interações obrigatórias; o [relatório do quarto](docs/RECONSTRUCAO-QUARTO.md) distingue implementação, verificações e capturas reais. As interações adicionais de computador e guarda-roupa ficam para uma etapa futura.

**Se o checkpoint já estiver avançado, pressione Esc → Reiniciar cena para ver o despertar no quarto reconstruído.**

## Corredor superior e escada

A reconstrução do corredor e da escada usa as duas referências fornecidas pelo usuário e preserva o quarto e a cozinha existentes. O [guia desta etapa](docs/PROMPT-RECONSTRUCAO-CORREDOR.md) delimita o escopo; o [relatório do corredor](docs/RECONSTRUCAO-CORREDOR.md) separa implementação, testes e capturas reais. O interruptor do corredor controla sua iluminação, enquanto telefone, quadros e plantas permanecem decorativos. O quadro individual da menina foi substituído por paisagem.

## Sala de estar

A nova sala tem sofá e poltrona estofados, estante com TV de tubo, mesa de centro, tapete ornamental, cerâmica marrom, cortinas rendadas, plantas e objetos domésticos. Use a mira e **E** para ligar/desligar a TV, examinar o telefone e a fotografia ou tentar abrir a porta principal, que permanece bloqueada nesta etapa. A TV usa imagem e ruído eletrônico originais, sem vozes ou transmissão externa.

**Para encontrar a sala:** saia do quarto, atravesse o corredor e desça a escada. A sala fica diretamente à frente, no térreo. Atravesse-a e use a passagem lateral para continuar até a cozinha. Se sua partida já estiver avançada, pressione **Esc → Reiniciar cena** primeiro.

O [Prompt Master 05](docs/PROMPT-MASTER-05-SALA.md) contém o pedido integral. O [relatório da sala](docs/RECONSTRUCAO-SALA.md) registra implementação, limites da comparação com as referências, preservação das cenas, testes e capturas reais.

A [correção da posição da sala](docs/CORRECAO-POSICAO-SALA.md) mantém esse visual aprovado e ajusta sua ligação com a base da escada. Ela ocupa o espaço livre anterior à área do café; os móveis e personagens da cozinha continuam nos mesmos lugares. O relatório separa a verificação desta correção dos resultados da entrega visual anterior.

### Ajustes pontuais de circulação

A divisória voltada para a área do café está fechada e revestida até o teto de **3,25 m**, incluindo o retorno do canto. A [captura real da parede completa](docs/capturas/parede-cozinha-completa.png) foi conferida no mesmo ângulo em que antes apareciam a face cinza e a abertura superior. Móveis, personagens e iluminação foram preservados.

A sala passou de **4,20 para 4,80 m de largura**, com os mesmos móveis e materiais. O vão para a cozinha tem **1,50 m**, e a passagem lateral tem **1,52 m**. A face antes cinza usa os azulejos da cozinha até o teto. Pequenos deslocamentos do sofá, poltrona e mesa lateral liberam os caminhos; cozinha mobiliada, pais, história e demais cômodos permanecem iguais.

Build aprovado e uma única caminhada real pela sala e passagem, nos dois sentidos, sem repetir as suítes anteriores. [Acabamento e passagem](docs/capturas/casa-cozinha-azulejos.png), [cozinha preservada](docs/capturas/casa-cozinha-preservada.png) e [registro breve](docs/resultados-ajustes-casa.json).

## Cozinha e pais

A cozinha usa móveis modelados, azulejos florais, cortinas de renda, cerâmica, armários, eletrodomésticos e uma mesa de café com objetos domésticos. Mãe e pai têm modelos próprios com rosto, cabelo, mãos, roupas texturizadas, postura e pequenos gestos que acompanham os diálogos escritos.

### Café da manhã interativo — atualização atual

A cozinha foi compactada reutilizando os móveis, materiais e iluminação. A área principal tem aproximadamente **7,10 × 5,35 m**; a bancada original de 5,20 m e a circulação dos dois lados da mesa foram preservadas, por isso não se forçou a medida menor da prancha.

Aproxime-se da cadeira da frente e pressione **E — Sentar à mesa**. A câmera desce suavemente, permanece em primeira pessoa e permite olhar para os pais. O pai continua sentado; a mãe usa avental claro e serve café. Os modelos GLB atuais mantêm as poses e o olhar durante as falas em texto. O jogo acrescenta um movimento localizado de lábios e mandíbula aos arquivos originais, que não possuem controles faciais. Nenhuma voz foi acrescentada. Ao terminar a conversa, o protagonista se levanta normalmente e os pais continuam na cozinha. Eles só vão para o carro depois que o protagonista pega a mala no quarto.

A entrega do café (Prompt Master 06) terminou no objetivo **“Suba ao quarto e busque sua mala”**. A atualização da garagem, descrita abaixo, continua esse objetivo reutilizando a mochila existente. O [Prompt Master 06](docs/PROMPT-MASTER-06-CAFE.md) registra o escopo daquela etapa.

Passaram **15 testes focais**, TypeScript/build e uma execução funcional completa do café em Chromium/Linux. Após encontrar uma sobreposição no avental nas capturas, somente a roupa foi corrigida, o build refeito e as duas vistas conferidas novamente. Veja as capturas reais [de pé](docs/capturas/cafe-cozinha-final.png) e [sentado](docs/capturas/cafe-sentado-pais.png), com o [registro resumido da verificação](docs/resultados-cafe.json). Não foram repetidos os testes de viagem ou dos outros cenários.

Os rostos procedurais continuam estilizados e menos detalhados que a prancha de referência. Não houve nova medição de FPS nem teste em GPU física/Windows.

Veja o [relatório da reconstrução com seis capturas reais](docs/RECONSTRUCAO-COZINHA.md). A atualização preserva os checkpoints. Para rever a cozinha quando sua partida já estiver no aeroporto ou em outra sequência, abra o menu com **Esc** e escolha **Reiniciar cena**.

## Garagem da família

A garagem mantém sua estrutura de aproximadamente **5,70 × 3,80 m**, porta ligada à casa, piso de concreto, teto de madeira, portão, estante, ferramentas e caixas. O carro usa o GLB enviado `carro_intercambio.glb`, carregado uma vez com materiais e texturas originais e escala uniforme para **3,80 × 1,74 × 1,40 m**. Seu espaço de colisão e a circulação existentes foram preservados.

Depois do café, pegue a mala no quarto e siga **“Vá até o carro para seguir ao aeroporto.”**. Aproxime-se do carro na garagem e pressione **E — Ir para o aeroporto**. A tela escurece por um instante e a próxima cena é a despedida no aeroporto. A câmera permanece fora do carro até a transição. Antes de pegar a mala, a viagem continua bloqueada.

Saves antigos que paravam no banco traseiro agora retomam a despedida no aeroporto, preservando a escolha e a mala. O embarque pelo portão 24 e a cena do avião continuam iguais.

Verificação focal: `node --test --test-isolation=none tests/car-glb.test.mjs tests/car-boarding.test.mjs`; com a prévia aberta, `INTERCAMBIO_URL=http://localhost:4180 npm run test:car`.

As suítes e capturas anteriores que inspecionavam a câmera no banco traseiro ficam como histórico dessa etapa. O fluxo atual é coberto por `test:car`; `test:car-boarding` aponta para essa mesma verificação.

Passaram TypeScript/build, quatro testes focais e o percurso real na garagem: colisão, bloqueio antes da mala, fade direto ao aeroporto e restauração do save antigo. A captura foi inspecionada; os modelos dos pais e os demais ambientes foram preservados. Chromium/Linux com SwiftShader, sem benchmark de desempenho.

[Captura real do novo carro na garagem](docs/capturas/carro-glb-garagem.png) e [registro breve da atualização](docs/resultados-carro-glb.json).

## Porta principal da cozinha

Porta de madeira escura de **84 × 210 cm**, fechada, deslocada **1,15 m para a esquerda** da posição anterior para ficar claramente ao lado da geladeira. Use **E — Examinar porta**. Conforme o pedido, não foi criado nenhum acesso, recuo ou cenário atrás; a sala, seus móveis e sua passagem foram preservados. [Captura real da posição atual](docs/capturas/porta-principal-livre-geladeira.png).

## Lavanderia

Área de serviço de **3,20 × 3,20 m**, conectada à cozinha e à garagem por passagens reais, no mesmo piso. Tem cerâmica, azulejos até meia altura, janela, tanque de concreto, máquina de lavar de abertura superior, armário, produtos de limpeza, varal, cesto, balde, vassoura e tapete. Os objetos são decorativos nesta etapa; não foram criadas missões ou alterações de diálogo.

Verificação focal: `node --test --test-isolation=none tests/laundry.test.mjs`; com uma prévia aberta, `INTERCAMBIO_URL=http://localhost:4180 npm run test:laundry`.

TypeScript/build e os três testes focais passaram. Uma sessão real confirmou ida e volta entre cozinha, lavanderia e garagem, colisões e missão intacta. O helper inicial de movimento excedeu o destino; a verificação continuou na mesma sessão com o controle de mouse/W existente. O comando inicial terminou com código 1 por esse timeout; o roteiro final foi ajustado e teve sintaxe checada, sem repetir todo o percurso. Veja a [captura principal](docs/capturas/lavanderia-visao-principal.png), a [vista do armário e cozinha](docs/capturas/lavanderia-armario-cozinha.png) e o [registro breve](docs/resultados-lavanderia.json). Chromium/Linux com SwiftShader, sem benchmark de FPS nem teste em GPU física/Windows.

## Pais e despedida

Pai e mãe usam seus GLBs enviados e mantêm suas identidades, diálogos e posições existentes. Após o café, permanecem na cozinha até o protagonista pegar a mala; depois aguardam a viagem. Interagir com o carro leva diretamente à despedida no aeroporto, sem uma etapa jogável dentro do veículo.

Os registros e as capturas das versões anteriores, que ainda incluíam o banco traseiro, permanecem em [pais após a mala](docs/resultados-pais-apos-mala.json), [modelos e despedida](docs/resultados-pais-despedida.json) e [embarque anterior](docs/resultados-embarque-carro.json). O fluxo atual é verificado por `npm run test:car`.

## Modelo do pai — GLB

O pai usa o arquivo enviado `pai_intercambio_rigged.glb`, preservado em `public/models/pai_intercambio.glb` (aproximadamente 2,18 MB, 20.029 vértices e 33.000 triângulos). O modelo tem uma malha, três texturas JPEG incorporadas, um esqueleto de 22 ossos e as poses originais `Pose_EmPe`, `Pose_Sentado_Mesa` e `Pose_Dirigindo`. O adaptador mantém o mesmo personagem e suas âncoras, ajustando escala, altura e contato das mãos/pés com os móveis existentes. A mãe e os cenários permanecem iguais.

As três poses são estáticas. O olhar e os pequenos movimentos de cabeça usam o controle existente; **o arquivo original não possui morphs faciais ou ciclos de fala/repouso**. O jogo acrescenta um morph local de boca em tempo de execução; os diálogos continuam por texto. Nenhum material ou malha foi reconstruído, e o GLB é carregado uma única vez para os três locais.

Verificação focal: `node --test --test-isolation=none tests/father-glb.test.mjs`; com a prévia aberta, `INTERCAMBIO_URL=http://localhost:4180 npm run test:father`.

Passaram TypeScript/build, dois testes do arquivo e a conferência real das três poses. O café manteve os diálogos e o objetivo de buscar a mala; carro e aeroporto foram verificados com checkpoints existentes, sem repetir os percursos anteriores. As três capturas foram inspecionadas. Chromium/Linux com SwiftShader, sem benchmark de desempenho.

Capturas reais: [cozinha](docs/capturas/novo-pai-glb-cozinha.png), [carro](docs/capturas/novo-pai-glb-carro.png), [aeroporto](docs/capturas/novo-pai-glb-aeroporto.png). [Registro curto](docs/resultados-pai-glb.json).

## Modelo da mãe — GLB

A mãe usa o arquivo enviado `personagem_intercambio_rigged.glb`, preservado em `public/models/mae_intercambio.glb` (aproximadamente 2,22 MB, 20.140 vértices e 33.000 triângulos). Mantém suas texturas, materiais e esqueleto de 22 ossos. A cozinha e o aeroporto usam a pose em pé; no carro, ela usa a pose sentada de passageira com as mãos no colo. O bule e o fio de café existentes acompanham a mão na cozinha e ficam ocultos nas outras cenas. As âncoras, os diálogos e a progressão da mala permanecem os mesmos.

O arquivo contém três poses estáticas e não possui morphs faciais originais. O jogo acrescenta a deformação local da boca e reutiliza o controle existente de olhar e pequenos movimentos de cabeça. O modelo e o adaptador do pai foram preservados.

Verificação focal: `node --test --test-isolation=none tests/mother-glb.test.mjs`; com a prévia aberta, `INTERCAMBIO_URL=http://localhost:4180 npm run test:mother`.

Passaram TypeScript/build, dois testes do arquivo, um café com ciclo de servir e a conferência das três poses. A mira e o E no corpo da mãe foram confirmados no build final. As correções de inicialização, contato e registro do alvo foram verificadas apenas nas partes afetadas.

As capturas reais das três cenas foram inspecionadas: [cozinha](docs/capturas/nova-mae-glb-cozinha.png), [passageira no carro](docs/capturas/nova-mae-glb-carro.png) e [aeroporto](docs/capturas/nova-mae-glb-aeroporto.png). A roupa original do GLB, incluindo o avental, foi mantida. [Registro breve](docs/resultados-mae-glb.json).

## Movimento da boca dos pais

Durante o intervalo de cada fala em texto, apenas o personagem que está falando move os lábios inferiores e a mandíbula. O ouvinte permanece com a boca em repouso; ao terminar o intervalo ou trocar para a fala do protagonista, os dois controles voltam a zero. A pausa congela o movimento junto com o relógio do jogo.

A deformação `JawOpen` é criada em tempo de execução com máscaras calibradas para os GLBs atuais. Os arquivos originais, os materiais, o corpo e a parte superior do rosto permanecem intactos. É um movimento moderado de lábios/mandíbula, sem cavidade bucal, dentes animados ou correspondência de fonemas. Nenhuma voz ou áudio de diálogo foi adicionado.

Verificação focal: `node --test --test-isolation=none tests/speech-mouth.test.mjs`; com a prévia aberta, `INTERCAMBIO_URL=http://localhost:4180 npm run test:mouth`.

Passaram os três testes de geometria, TypeScript/build e uma verificação curta do diálogo no navegador. As quatro capturas reais de boca ativa/em repouso foram inspecionadas. [Vídeo real com os rostos ampliados](docs/capturas/fala-pais-detalhe.mp4), [captura do vídeo](docs/capturas/fala-pais-detalhe.png) e [registro breve](docs/resultados-boca-pais.json). Chromium/Linux com SwiftShader; sem benchmark de desempenho.

## Aeroporto — Portão 24

O cenário atual usa o GLB enviado `intercambio_aeroporto_com_npcs_ps2.glb`, armazenado em `public/models/aeroporto_intercambio.glb`: check-in, passagem contínua para o lounge, Portão 24 e oito NPCs com suas poses originais. Escala, materiais e texturas do arquivo são preservados; o piso foi alinhado e as colisões seguem a arquitetura importada. Apenas uma placa solta foi afastada 1,8 m para liberar a circulação ao redor do balcão. Os mesmos pai e mãe participam da despedida; a câmera permanece em primeira pessoa. O [Prompt Master 09](docs/PROMPT-MASTER-09.md) continua orientando a narrativa.

A despedida reutiliza o diálogo existente com as nove falas do roteiro e uma pequena pausa com gestos. Depois aparece **“Dirija-se ao portão de embarque.”**. **E — Embarcar** só funciona após a despedida e escurece suavemente para o interior do avião já existente. O checkpoint distingue conversa pendente e embarque liberado.

Passaram TypeScript/build, cinco testes focais e o percurso real garagem → aeroporto → nove falas → Portão 24 → avião existente, preservando os pais e a animação individual de boca. A revisão visual fechou a fachada aberta com o acabamento do GLB e acrescentou um fundo externo local; o build final foi conferido em um percurso curto até o lounge. [Chegada](docs/capturas/aeroporto-glb-chegada.png), [saguão](docs/capturas/aeroporto-glb-saguao.png), [lounge](docs/capturas/aeroporto-glb-lounge.png) e [registro breve](docs/resultados-aeroporto-glb.json). Chromium/Linux com SwiftShader; sem benchmark de desempenho. O teste anterior `airport-browser.mjs` fica como histórico do cenário procedural.

Com a prévia aberta: `INTERCAMBIO_URL=http://localhost:4180 npm run test:airport`.

## Avião — viagem aos Estados Unidos

Depois do portão 24, a cabine usa o arquivo enviado `intercambio_aviao_ps2_leve.blend`, convertido pelo Blender 4.3.2 para `public/models/aviao_intercambio.glb`. Materiais, bancos, fuselagem, asas, céu e duas camadas de nuvens vêm do arquivo. A câmera usa a posição e a projeção do assento original, com um pequeno movimento até a abertura real da janela. Os pais permanecem no aeroporto brasileiro. O enquadramento e o alcance de visão específicos do avião são restaurados ao sair da cabine.

Use o **mouse** para olhar ao redor, com rotação limitada e caminhada bloqueada. Olhe para a janela e pressione **E — Olhar pela janela** para aproximar a câmera e acompanhar duas reflexões em legenda. **E** retorna ao assento. Depois da reflexão, **E — Avançar para a chegada** permite continuar; a sequência também avança automaticamente após aproximadamente um minuto ativo. Pausar interrompe esse tempo. A transição leva ao terminal de chegada descrito abaixo; os diálogos continuam somente em texto.

O pacote enviado `INTERCAMBIO_30_NPCS_PASSAGEIROS.zip` fornece os 30 passageiros sentados. O arquivo preparado `public/models/passageiros_intercambio.glb` compartilha dados repetidos e mantém as 30 aparências, texturas, rigs e poses de cabine originais: 9,19 MB em vez dos 50,5 MB dos GLBs separados. Os lugares seguem os assentos medidos da cabine; a fila do protagonista e a janela ficam livres. A pose é aplicada uma vez, com respiração discreta e sem executar os clipes de locomoção.

Passaram cinco testes focais, TypeScript/build e o percurso cabine → janela/reflexões → retorno → chegada. Foram inspecionadas as capturas reais do [assento](docs/capturas/aviao-passageiros-assento.png), [corredor com passageiros](docs/capturas/aviao-passageiros-corredor.png) e [janela](docs/capturas/aviao-passageiros-janela.png). Os passageiros ficam ocultos ao sair do avião. [Registro breve](docs/resultados-passageiros-cabine.json). Chromium/Linux com SwiftShader, sem benchmark de GPU física; sem repetir os ambientes anteriores.

Verificação focal: `node --test --test-isolation=none tests/plane.test.mjs tests/cabin-passengers.test.mjs`; com a prévia aberta, `INTERCAMBIO_URL=http://localhost:4180 npm run test:plane`.

Passaram os três testes focais, TypeScript/build e o percurso real portão 24 → cabine GLB → janela/reflexões → retorno → chegada. A inspeção levou a baixar levemente o olhar inicial e a isolar os outros cenários durante o voo. A versão final foi conferida novamente apenas na cabine e na saída para a chegada, incluindo a restauração da câmera e da visibilidade. Capturas reais: [assento](docs/capturas/aviao-glb-assento.png) e [janela com asa e nuvens](docs/capturas/aviao-glb-janela.png). [Registro breve](docs/resultados-aviao-glb.json). Chromium/Linux com SwiftShader; sem benchmark de GPU física. O teste anterior `plane-browser.mjs` permanece como histórico da cabine procedural.

## Chegada após o avião

O GLB enviado `interior_chegada_ps2_com_npcs.glb`, em `public/models/chegada_intercambio.glb`, substitui a antiga rua de chegada. Daniel, Helen e os seis passageiros sentados usam os modelos, materiais e poses do arquivo. O jogador começa no marker de entrada e percorre o corredor central até os anfitriões; a missão, a fala de boas-vindas e a interação de cartaz permanecem no sistema existente. Os pais continuam no aeroporto brasileiro.

Verificação focal: `node --test --test-isolation=none tests/arrival.test.mjs tests/plane.test.mjs` e, com a prévia aberta, `INTERCAMBIO_URL=http://localhost:4180 npm run test:arrival`. [Entrada real](docs/capturas/chegada-glb-entrada.png), [anfitriões](docs/capturas/chegada-glb-anfitrioes.png) e [registro breve](docs/resultados-chegada-glb.json). Chromium/Linux com SwiftShader, sem benchmark de desempenho.

## Estrutura

- `src/scene/`: quarto/casa e cenários 3D do capítulo.
- `src/game/player.ts`, `collision.ts`: controle, câmera e colisões.
- `src/game/narrative.ts`: missões, checkpoint e dados de diálogo.
- `src/game/interactions.ts`: alvos por mira.
- `src/ui.ts`, `src/style.css`: interface, legendas e escolhas.
- `docs/PROMPT-MASTER-02.md`: especificação integral do capítulo.

## Validação

`npm run typecheck`, `npm test` e `npm run build` verificam tipos, regras de movimento e build de produção. A validação de navegador cobre a sequência jogável em Chromium. Desempenho depende da GPU e do navegador; não se promete 60 FPS em todos os computadores.

Na correção atual da posição passaram **58/58 testes unitários**, TypeScript, build e `npm run verify` completo. A suíte percorreu quarto → corredor → escada original → sala diretamente à frente → cozinha com controles reais, além de TV, objetos e colisões no novo local. As regressões do corredor, quarto e capítulo também passaram, incluindo recarga real de checkpoint. A [captura no último degrau e o relatório da correção](docs/CORRECAO-POSICAO-SALA.md) registram essa execução em Chromium/SwiftShader no Linux; a suíte focada não mede FPS da sala nem comprova desempenho em GPU física ou Windows.

Na entrega visual anterior da sala passaram **58 testes unitários**, TypeScript, build e a suíte da sala no navegador com dez capturas reais, TV/áudio, objetos, colisões e percurso físico. Também passaram as regressões do corredor, do quarto e do capítulo completo, incluindo recarga do checkpoint. No servidor Linux com SwiftShader foram medidos **6,5 FPS** com a câmera parada e **9,5 FPS** durante exploração amostrada; são resultados baixos de renderização por software, sem medição em GPU física ou Windows. Veja as [capturas e os resultados dessa etapa visual](docs/RECONSTRUCAO-SALA.md). As verificações da nova posição estão registradas separadamente no [relatório da correção](docs/CORRECAO-POSICAO-SALA.md).

Na etapa do corredor passaram **46 testes unitários**, TypeScript, build e a suíte focada em Chromium com as cinco vistas solicitadas, interruptor, portas, colisões, descida/subida e missão existente. Também passaram a regressão do quarto e o percurso completo até o fim do capítulo, incluindo recarga real do checkpoint e diálogos somente por texto. No servidor com renderização por software SwiftShader, foram medidos **7,3 FPS** com a câmera parada e **7,0 FPS** durante uma caminhada real; esses resultados baixos não representam uma medição de GPU física ou Windows. Veja as [capturas e os resultados do corredor](docs/RECONSTRUCAO-CORREDOR.md).

Na reconstrução anterior do quarto passaram **42 testes unitários**, TypeScript, o build de produção, a suíte focada de navegador com seis vistas e cinco interações e uma nova partida completa até o fim do capítulo. A regressão também verificou pausa, restauração real do checkpoint e diálogos somente por texto. A medição no servidor com SwiftShader foi de **6,6 FPS** no perfil Equilibrado (janela 1280 × 720, resolução interna 914 × 514). O desempenho é baixo; a medição não comprova fluidez em GPU física ou no Windows. Consulte as [capturas e os resultados do quarto](docs/RECONSTRUCAO-QUARTO.md).

A atualização anterior da cozinha aprovou **41 testes**, o build, o percurso completo do capítulo e as verificações específicas daquele ambiente. Esse registro histórico está em [validação do capítulo](docs/VALIDACAO-CAPITULO-01.md). As medições da cozinha naquele servidor com renderização por software ficaram em **8,1 a 12,2 FPS**; elas não representam o desempenho do quarto reconstruído. O [relatório do quarto](docs/RECONSTRUCAO-QUARTO.md) registra separadamente a validação desta etapa. GPU física e Windows ainda precisam de verificação própria.

Com Chromium instalado, `CHROMIUM_PATH=/usr/bin/chromium npm run verify` inicia uma prévia temporária e verifica **portão 24 → cabine → janela/reflexões → chegada existente**, usando um checkpoint válido após a despedida. Com servidor já aberto, use `INTERCAMBIO_URL=http://localhost:4180 npm run test:plane`. As suítes dos ambientes anteriores continuam disponíveis separadamente.

## Publicação

O repositório já inclui `vercel.json`. Consulte [o guia de publicação](docs/PUBLICAR-NA-VERCEL.md) para importar o projeto na Vercel e testar a URL publicada.
