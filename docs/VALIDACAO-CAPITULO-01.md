# Validação — Capítulo 1: A Despedida

## Executado

- `npm run typecheck`: aprovado.
- `npm test`: 37 testes aprovados, incluindo câmera, colisões, escada, porta, interações, missões e escolhas.
- `npm run build`: aprovado com Vite. O bundle principal ultrapassa 500 kB após minificação; ainda precisa ser otimizado.

## Não confirmado nesta execução

O fluxo automatizado do Chromium (`npm run test:browser`) não iniciou neste ambiente. O executável Chromium abortou antes de abrir a página com `socket() failed: Operation not permitted`. Portanto, o fluxo completo de diálogos e transições precisa ser verificado em um navegador funcional; o build não comprova a jogabilidade ponta a ponta.

Também faltam medições atuais de FPS em GPU física, acabamento detalhado do aeroporto e da cabine, a viagem curta de carro como cena própria, e validação de checkpoints por recarga em cada sequência. As transições de ambiente são fades curtos entre cenários construídos proceduralmente.

## Diálogos e áudio

O roteiro aparece somente como texto. O WAV sintético antigo, o inventário de voz e o gerador de voz foram removidos. Os sons restantes são efeitos e ambiência procedural, sem fala.
