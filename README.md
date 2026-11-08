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

Nesta reconstrução do quarto passaram **42 testes unitários**, TypeScript, o build de produção, a suíte focada de navegador com seis vistas e cinco interações e uma nova partida completa até o fim do capítulo. A regressão também verificou pausa, restauração real do checkpoint e diálogos somente por texto. A medição no servidor com SwiftShader foi de **6,6 FPS** no perfil Equilibrado (janela 1280 × 720, resolução interna 914 × 514). O desempenho é baixo; a medição não comprova fluidez em GPU física ou no Windows. Consulte as [capturas e os resultados do quarto](docs/RECONSTRUCAO-QUARTO.md).

A atualização anterior da cozinha aprovou **41 testes**, o build, o percurso completo do capítulo e as verificações específicas daquele ambiente. Esse registro histórico está em [validação do capítulo](docs/VALIDACAO-CAPITULO-01.md). As medições da cozinha naquele servidor com renderização por software ficaram em **8,1 a 12,2 FPS**; elas não representam o desempenho do quarto reconstruído. O [relatório do quarto](docs/RECONSTRUCAO-QUARTO.md) registra separadamente a validação desta etapa. GPU física e Windows ainda precisam de verificação própria.

Com Chromium instalado, `CHROMIUM_PATH=/usr/bin/chromium npm run verify` inicia uma prévia de produção temporária e verifica o percurso completo do capítulo. A suíte focada em quarto é `npm run test:bedroom`; a de cozinha está em `tests/kitchen-browser.mjs`. Execute essas suítes com o jogo servido por HTTP e `INTERCAMBIO_URL` apontando para o servidor. O comando `verify` também executa a validação focada do quarto antes do percurso completo.

## Publicação

O repositório já inclui `vercel.json`. Consulte [o guia de publicação](docs/PUBLICAR-NA-VERCEL.md) para importar o projeto na Vercel e testar a URL publicada.
