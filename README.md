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

Nesta atualização passaram **41 testes**, o build, o percurso completo do capítulo e as verificações da cozinha. Veja o [registro de validação](docs/VALIDACAO-CAPITULO-01.md). As medições neste servidor com renderização por software ficaram em **8,1 a 12,2 FPS**; GPU física e Windows ainda precisam de verificação própria.

Com Chromium instalado, `CHROMIUM_PATH=/usr/bin/chromium npm run verify` inicia uma prévia de produção temporária e verifica o percurso completo do capítulo. A suíte focada em cozinha está em `tests/kitchen-browser.mjs`; execute-a com o jogo servido por HTTP e `INTERCAMBIO_URL` apontando para o servidor.

## Publicação

O repositório já inclui `vercel.json`. Consulte [o guia de publicação](docs/PUBLICAR-NA-VERCEL.md) para importar o projeto na Vercel e testar a URL publicada.
