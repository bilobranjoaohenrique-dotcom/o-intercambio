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

## Reconstrução do quarto do protagonista

A imagem original do quarto e a prancha multivista enviadas pelo usuário servem como referência de composição e direção artística. Não são arquivos de modelos, não conferem licença sobre recursos de terceiros e não são incorporadas como texturas ou cenário plano.

| Recurso | Origem | Arquivos |
| --- | --- | --- |
| Quarto, móveis, computador CRT, objetos e paisagem vista pela janela | Geometria original construída para o projeto | `src/scene/bedroom.ts` |
| Papel de parede, parquet, madeira, xadrez, cortinas, tapete e tecidos | Desenhos procedurais originais gerados localmente em Canvas | `src/scene/bedroomMaterials.ts` |
| Fotografia da família, calendário, documentos, mostrador 06:30 e pôsteres fictícios | Ilustrações procedurais originais do projeto | `src/scene/bedroomMaterials.ts` |
| Bandeira brasileira e céu distante | Representação gráfica procedural; sem pacote de imagem externo | `src/scene/bedroomMaterials.ts` |

A banda fictícia “Horizonte” e o cartaz “Lado de Dentro” são ilustrações autorais, sem uso de capas ou fotografias de bandas comerciais. O céu é um material de fundo externo; os móveis, a casa vizinha e a vegetação são objetos 3D. Nenhum pacote externo de quarto ou textura foi incorporado nesta reconstrução. O [relatório do quarto](docs/RECONSTRUCAO-QUARTO.md) registra a implementação e os limites da comparação visual.

## Reconstrução do corredor superior e da escada

A prancha e a vista do corredor fornecidas pelo usuário orientam composição, materiais e iluminação. A imagem conceitual gerada anteriormente na conversa não é uma captura do jogo nem é incorporada como cenário plano. A imagem da menina é substituída por paisagens neutras ou uma fotografia familiar.

| Recurso | Origem | Arquivos |
| --- | --- | --- |
| Corredor, portas decorativas, janela, escada, corrimãos, aparador, telefone, plantas e luminárias | Malhas originais construídas por código para o projeto | `src/scene/hallway.ts`, `src/scene/hallwayGeometry.ts` |
| Papel de parede, madeira, parquet, tinta branca e tecidos | Desenhos procedurais originais gerados localmente em Canvas | `src/scene/hallwayMaterials.ts` |
| Tapete ornamental, renda vazada, cerâmica, folhas e plástico envelhecido do telefone | Texturas procedurais originais do projeto | `src/scene/hallwayMaterials.ts` |
| Fotografia dos pais com o filho e três paisagens campestres | Ilustrações autorais, sem fotografias ou pinturas externas importadas | `src/scene/hallwayMaterials.ts` |

Não foi importado pacote externo de modelos ou materiais para esta reconstrução. O material do vidro não depende de uma imagem externa. A origem das malhas e os resultados de execução são descritos no [relatório do corredor](docs/RECONSTRUCAO-CORREDOR.md). As licenças das dependências gerais continuam listadas acima.

## Reconstrução da sala de estar

A imagem principal e a prancha multivista fornecidas pelo usuário são referências de composição, mobiliário e materiais. Não são incorporadas como cenário plano, texturas dos móveis ou vídeo da televisão. A disposição da sala é adaptada à escada existente, sem duplicá-la.

| Recurso | Origem | Arquivos |
| --- | --- | --- |
| Sala, sofá, poltrona, mesa, estante, CRT, telefone, janela, porta e objetos domésticos | Malhas originais construídas por código; superfícies curvas, perfis torneados e tecidos com pregas | `src/scene/livingRoom.ts`, `src/scene/livingRoomGeometry.ts` |
| Cerâmica marrom, paredes envelhecidas, nogueira, estofado, almofadas, renda vazada e tapete ornamental | Desenhos procedurais determinísticos originais, gerados localmente em Canvas | `src/scene/livingRoomMaterials.ts` |
| Família fictícia com os pais e o filho, paisagens, capas de livros e revista “Lar & Quintal” | Ilustrações autorais; sem fotografias reais ou pinturas externas importadas | `src/scene/livingRoomMaterials.ts` |
| Programa estático “TV Lar / Bom Dia” e superfície do CRT desligado | Imagens procedurais originais; sem vídeos, transmissões ou marcas de emissoras | `src/scene/livingRoomMaterials.ts` |
| Clique de chave e ruído eletrônico da televisão | Síntese local no sistema Web Audio já usado pelo jogo; sem gravações externas | `src/game/audio.ts` |

As texturas desta sala têm entre 64 e 256 pixels por dimensão, com reutilização de materiais e sem carregamento de pacotes externos. O ruído da TV é não verbal; nenhum diálogo, voz, TTS, narração ou música licenciada foi adicionado. O [relatório da sala](docs/RECONSTRUCAO-SALA.md) separa o estado da implementação, as verificações e as capturas reais de execução.
