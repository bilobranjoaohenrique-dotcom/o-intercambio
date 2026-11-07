# Fontes e licenças — O Intercâmbio

O cenário, os modelos e as texturas desta primeira cena foram criados por código para este projeto. Não há modelos ou imagens de outros jogos, nem acesso a APIs de cobrança durante a execução.

| Componente | Uso | Licença |
| --- | --- | --- |
| [Babylon.js](https://github.com/BabylonJS/Babylon.js) | Motor 3D no navegador | Apache-2.0 |
| [TypeScript](https://github.com/microsoft/TypeScript) | Desenvolvimento | Apache-2.0 |
| [Vite](https://github.com/vitejs/vite) | Desenvolvimento e build | MIT |
| [Playwright](https://github.com/microsoft/playwright) | Verificação no navegador | Apache-2.0 |
| [pngjs](https://github.com/pngjs/pngjs) | Inspeção de imagens nos testes | MIT |

As versões exatas constam em package-lock.json. As ferramentas de desenvolvimento e testes não são carregadas pela cena em produção.

A licença redistribuível do motor está em [BabylonJS-Apache-2.0.txt](public/licenses/BabylonJS-Apache-2.0.txt).

Personagens comunicam-se somente por texto. Pássaros, vento, passos e outros efeitos são sintetizados localmente para este projeto; nenhum pacote de voz é incluído.
