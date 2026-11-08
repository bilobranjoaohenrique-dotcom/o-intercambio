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

## Cozinha e pais

A cozinha usa móveis modelados, azulejos florais, cortinas de renda, cerâmica, armários, eletrodomésticos e uma mesa de café com objetos domésticos. Mãe e pai têm modelos próprios com rosto, cabelo, mãos, roupas texturizadas, postura e pequenos gestos que acompanham os diálogos escritos.

Veja o [relatório da reconstrução com seis capturas reais](docs/RECONSTRUCAO-COZINHA.md). A atualização preserva os checkpoints. Para rever a cozinha quando sua partida já estiver no aeroporto ou em outra sequência, abra o menu com **Esc** e escolha **Reiniciar cena**.

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

Com Chromium instalado, `CHROMIUM_PATH=/usr/bin/chromium npm run verify` inicia uma prévia de produção temporária e executa as validações focadas da **sala**, do corredor e do quarto antes do percurso completo do capítulo. As suítes individuais são `npm run test:living-room`, `npm run test:hallway` e `npm run test:bedroom`; a de cozinha está em `tests/kitchen-browser.mjs`. Execute uma suíte individual com o jogo servido por HTTP e `INTERCAMBIO_URL` apontando para o servidor.

## Publicação

O repositório já inclui `vercel.json`. Consulte [o guia de publicação](docs/PUBLICAR-NA-VERCEL.md) para importar o projeto na Vercel e testar a URL publicada.
