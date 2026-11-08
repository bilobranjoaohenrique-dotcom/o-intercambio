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

Aproxime-se da cadeira da frente e pressione **E — Sentar à mesa**. A câmera desce suavemente, permanece em primeira pessoa e permite olhar para os pais. O pai continua sentado; a mãe usa avental claro e serve café. Mandíbulas, olhares, expressões e gestos acompanham as falas em texto; nenhuma voz foi acrescentada. Ao terminar a conversa, o protagonista se levanta automaticamente durante a breve transição de saída dos pais.

A entrega do café (Prompt Master 06) terminou no objetivo **“Suba ao quarto e busque sua mala”**. A atualização da garagem, descrita abaixo, continua esse objetivo reutilizando a mochila existente. O [Prompt Master 06](docs/PROMPT-MASTER-06-CAFE.md) registra o escopo daquela etapa.

Passaram **15 testes focais**, TypeScript/build e uma execução funcional completa do café em Chromium/Linux. Após encontrar uma sobreposição no avental nas capturas, somente a roupa foi corrigida, o build refeito e as duas vistas conferidas novamente. Veja as capturas reais [de pé](docs/capturas/cafe-cozinha-final.png) e [sentado](docs/capturas/cafe-sentado-pais.png), com o [registro resumido da verificação](docs/resultados-cafe.json). Não foram repetidos os testes de viagem ou dos outros cenários.

Os rostos procedurais continuam estilizados e menos detalhados que a prancha de referência. Não houve nova medição de FPS nem teste em GPU física/Windows.

Veja o [relatório da reconstrução com seis capturas reais](docs/RECONSTRUCAO-COZINHA.md). A atualização preserva os checkpoints. Para rever a cozinha quando sua partida já estiver no aeroporto ou em outra sequência, abra o menu com **Esc** e escolha **Reiniciar cena**.

## Garagem da família

A garagem está ligada à passagem lateral do térreo por uma porta interna aberta. Tem aproximadamente **5,70 × 3,80 m**, piso de concreto, paredes pintadas, teto de madeira, portão com grade, luminária, pequena estante, ferramentas e caixas. O hatch original inspirado nos anos 2000 tem quatro rodas, portas, vidros, bancos e volante; não há direção nem física veicular.

Depois do café, volte ao quarto e use **E — Pegar mala** na mochila existente. O objetivo passa a **“Vá até a garagem. Seus pais estão esperando.”**. Aproxime-se do carro e pressione **E — Entrar no carro** para se sentar no banco de trás, com os pais à frente. Você pode olhar ao redor; use novamente **E — Seguir para o aeroporto** para iniciar a viagem. Antes de pegar a bagagem, a partida permanece bloqueada. O checkpoint conserva o embarque e a posição sentada.

Verificação focal: `node --test --test-isolation=none tests/garage.test.mjs`; com uma prévia aberta, `INTERCAMBIO_URL=http://localhost:4180 npm run test:garage`. Passaram os quatro testes focais, TypeScript/build e um percurso real no Chromium/Linux: entrada, volta ao redor do carro, colisões, bloqueio antes da mala, subida/coleta da bagagem, retorno e embarque. Veja a [garagem no jogo](docs/capturas/garagem-visao-geral.png), o [portão e interior](docs/capturas/garagem-portao.png) e o [registro breve](docs/resultados-garagem.json). Renderização por software SwiftShader; não houve benchmark de FPS nem teste em GPU física/Windows.

## Porta principal da cozinha

Porta de madeira escura de **84 × 210 cm**, fechada, deslocada **1,15 m para a esquerda** da posição anterior para ficar claramente ao lado da geladeira. Use **E — Examinar porta**. Conforme o pedido, não foi criado nenhum acesso, recuo ou cenário atrás; a sala, seus móveis e sua passagem foram preservados. [Captura real da posição atual](docs/capturas/porta-principal-livre-geladeira.png).

## Lavanderia

Área de serviço de **3,20 × 3,20 m**, conectada à cozinha e à garagem por passagens reais, no mesmo piso. Tem cerâmica, azulejos até meia altura, janela, tanque de concreto, máquina de lavar de abertura superior, armário, produtos de limpeza, varal, cesto, balde, vassoura e tapete. Os objetos são decorativos nesta etapa; não foram criadas missões ou alterações de diálogo.

Verificação focal: `node --test --test-isolation=none tests/laundry.test.mjs`; com uma prévia aberta, `INTERCAMBIO_URL=http://localhost:4180 npm run test:laundry`.

TypeScript/build e os três testes focais passaram. Uma sessão real confirmou ida e volta entre cozinha, lavanderia e garagem, colisões e missão intacta. O helper inicial de movimento excedeu o destino; a verificação continuou na mesma sessão com o controle de mouse/W existente. O comando inicial terminou com código 1 por esse timeout; o roteiro final foi ajustado e teve sintaxe checada, sem repetir todo o percurso. Veja a [captura principal](docs/capturas/lavanderia-visao-principal.png), a [vista do armário e cozinha](docs/capturas/lavanderia-armario-cozinha.png) e o [registro breve](docs/resultados-lavanderia.json). Chromium/Linux com SwiftShader, sem benchmark de FPS nem teste em GPU física/Windows.

## Pais e despedida

Pai e mãe usam as mesmas cabeças, roupas e identidades na cozinha e no carro. O pai tem polo bege listrada, jeans escuro e cabelo grisalho; a mãe, blusa florida, calça marrom e sandálias. O avental e o bule ficam somente na cozinha. Gestos, respiração, olhar, piscar e boca acompanham as legendas, sem vozes.

Ao terminar a conversa, o protagonista se levanta e uma breve transição encobre a saída dos pais. Eles aguardam sentados no carro estacionado: pai ao volante e mãe no passageiro. A missão é **“Suba e pegue sua mala”**. Use **E — Pegar mala** no quarto; depois siga **“Vá até a garagem. Seus pais estão esperando.”**. Entrar no carro mantém os mesmos pais visíveis na mesma cena; o protagonista fica no banco de trás, com movimento de cabeça livre. **E — Seguir para o aeroporto** inicia a transição já existente. O checkpoint restaura o banco de trás, os pais e a coleta sem repetir o café.

Na atualização dos modelos passaram TypeScript/build, **13 testes focais** e o percurso real café → mala no quarto → descida → recarga do save → pais no carro → embarque. A troca sob tela opaca manteve as mesmas duas identidades e cabeças, sem duplicação. Após o teste funcional, ajustaram-se somente o comprimento do cabelo e a posição dos olhos; o build e as duas vistas finais foram conferidos novamente. [Pais na cozinha](docs/capturas/pais-cafe-atualizados.png), [pais aguardando no carro](docs/capturas/pais-esperando-no-carro.png) e [registro breve](docs/resultados-pais-despedida.json). Chromium/Linux com SwiftShader, sem benchmark de desempenho ou teste em GPU física/Windows.

A correção do embarque passou TypeScript/build e **13 testes focais**. Uma sessão real verificou caminhada até o carro, os mesmos dois pais durante o embarque, câmera livre, caminhada bloqueada, pausa/retomada, recarga do banco traseiro e partida somente com a segunda interação. A captura revelou pele atravessando o cabelo por trás; a casca foi corrigida e a [vista final dentro do carro](docs/capturas/pais-vista-dentro-carro.png) foi inspecionada no build final. O [registro breve](docs/resultados-embarque-carro.json) descreve a recuperação da espera do teste e da recaptura durante o rebuild. Com uma prévia aberta: `INTERCAMBIO_URL=http://localhost:4180 npm run test:car-boarding`. Chromium/Linux com SwiftShader, sem medição de desempenho.

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

Com Chromium instalado, `CHROMIUM_PATH=/usr/bin/chromium npm run verify` inicia uma prévia temporária e verifica o fluxo atual de **café → saída dos pais → mala → garagem → banco traseiro → aeroporto**, incluindo restauração de checkpoint. Com servidor já aberto, use `INTERCAMBIO_URL=http://localhost:4180 npm run test:parents`. As suítes de navegador de etapas anteriores permanecem como histórico; suas expectativas de término do café antecedem a saída dos pais e o levantar automático.

## Publicação

O repositório já inclui `vercel.json`. Consulte [o guia de publicação](docs/PUBLICAR-NA-VERCEL.md) para importar o projeto na Vercel e testar a URL publicada.
