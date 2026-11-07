# Validação — Capítulo 1: A Despedida

A reconstrução da cozinha foi executada e verificada em **7 de novembro de 2026**. O [relatório visual](RECONSTRUCAO-COZINHA.md) apresenta os arquivos alterados, as seis capturas reais, os resultados e as limitações. Os números também estão em [resultados-cozinha.json](resultados-cozinha.json).

## Executado

- Checagem de TypeScript: aprovada.
- Testes unitários: **41 aprovados, zero falhas**, incluindo os obstáculos e os limites novos da cozinha.
- Build Vite de produção: aprovado. O chunk principal tem 1.403,42 kB, ou 358,88 kB com gzip; o aviso de tamanho acima de 500 kB permanece.
- Fluxo completo no Chromium: despertar, porta, escada, cozinha, diálogo e escolha, mala, carro, aeroporto, avião e chegada à família anfitriã. As interações foram realizadas com teclado e mouse, sem setters de progresso ou teletransporte de teste.
- Cozinha: mesa e mãe bloqueiam a caminhada; a câmera mantém o horizonte após diferentes movimentos do mouse; pausa e restauração real do checkpoint foram verificadas.
- Ajuste final da interface: revalidado a partir de um checkpoint da cozinha, com seis capturas e mira/captura do mouse ocultas durante falas e escolhas. Essa rodada direcionada não é apresentada como uma nova passagem desde a cama.
- Modo baixo: nova partida desde o despertar até a cozinha, imagem e benchmark próprios aprovados.
- Sem erros críticos de página, shaders, console ou arquivos locais nos percursos concluídos.

## Ambiente e limites

Os testes usaram Node.js 24.19.0 e Chromium 154.0.8037.57 em Debian 13/Linux, com SwiftShader e viewport de 1280 × 800. As medições de dez segundos ficaram entre **8,1 e 12,2 FPS**, dependendo da resolução interna e da rodada. O relatório detalha cada amostra. Isso não estabelece desempenho aceitável ou 60 FPS em GPU física.

O executável `.bat` não foi testado em Windows e a URL de produção da Vercel não foi verificada nesta rodada. O acabamento visual do aeroporto, do avião e da cidade não foi refeito; o percurso existente foi preservado e exercitado.

## Diálogos e áudio

Todos os diálogos continuam somente em texto. Não há voz gravada, voz sintética, TTS ou narração. Os sons disponíveis são efeitos e ambiência não verbal.
