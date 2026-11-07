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

## Reconstrução da cozinha e dos pais

Os materiais, modelos e padrões domésticos da reconstrução são autorais e procedurais. A procedência por módulo e o escopo estão no [registro da reconstrução](docs/RECONSTRUCAO-COZINHA.md). A imagem fornecida pelo usuário serve como referência de direção artística; não é incorporada como cenário, textura ou modelo do jogo.

| Recurso | Origem | Arquivos |
| --- | --- | --- |
| Cozinha, móveis e objetos de café | Geometria original do projeto | `src/scene/kitchen.ts` |
| Cerâmica, madeira, tecidos, renda, folhas e detalhes domésticos | Desenhos procedurais originais gerados localmente em Canvas | `src/scene/kitchenMaterials.ts` |
| Modelos articulados da mãe e do pai | Seções de malha e detalhes anatômicos originais | `src/scene/parents.ts`, `src/scene/parentsGeometry.ts` |
| Pele, rostos, cabelo e roupas dos pais | Padrões originais gerados localmente em Canvas | `src/scene/parentsMaterials.ts` |

Nenhum pacote externo de cozinha ou personagem foi adicionado para essa reconstrução. Os personagens continuam comunicando-se exclusivamente por legendas, sem arquivos de voz ou síntese de fala.
