# Interior da casa de Daniel e Helen

Registro da integração anterior (commit `126fa55`). A versão atual utiliza a [planta A01 encaixada na fachada](CASA-DOS-ANFITRIOES-A01.md).

O arquivo fornecido `Daniel_Helen.glb` está integrado pela porta da casa azul de Westbridge. E permite entrar, explorar os dois andares e voltar ao bairro pela porta interna. A entrada não encerra mais o capítulo; o objetivo funcional passa a ser explorar a casa, sem acrescentar falas ou acontecimentos.

## Modelo e ligação com o bairro

Fonte: [daniel_helen_house.glb](../public/models/daniel_helen_house.glb), 6.225.960 bytes, SHA-256 `cc90714d6ef97962ba4d0c3808323af01fa6a0a91fb6e045ea16d4d71b52d462`. O arquivo é uma cópia byte a byte do upload. A casa tem aproximadamente 10 × 12 m, pisos em Y=0,39/3,84 m e 18 degraus. A escala nativa, geometria, texturas e materiais são mantidos.

A planta interna difere da fachada aprovada. Para preservar ambas, o interior ocupa um setor próprio e a ligação usa uma transição curta na porta, com carregamento do GLB apenas ao entrar. Não é uma passagem contínua pelo mesmo vão físico. O cenário externo embutido `WindowView` continua aparecendo pelas janelas; ele não é interpretado como piso navegável.

O Babylon expande as 539 malhas declaradas para 559 malhas renderizáveis, por causa dos múltiplos primitives. Foram importados 166 materiais, 59 texturas e nove luzes. As luzes `Day_`/`Always_` e uma luz ambiente local iluminam o interior; os estados globais de iluminação, visibilidade e câmera são restaurados ao sair. As seis animações de objetos permanecem paradas, sem disparar movimentos de móveis ao carregar.

Um armário de três componentes bloqueava o vão de um quarto no arquivo. Somente esses três nós foram deslocados 1,45 m em Z para liberar a passagem; os respectivos colliders acompanham o ajuste. A porta principal não possuía folha no GLB: foi acrescentado um fechamento discreto com madeira e metal do próprio arquivo para representar a saída. O arquivo original não foi reexportado.

## Navegação e salvamento

O controlador existente de primeira pessoa é reutilizado, com 114 colliders medidos de paredes e móveis e um provedor de piso com estado de elevação. A mesma coordenada X/Z pode pertencer ao térreo ou ao andar superior, sem o jogador saltar automaticamente de piso. Os degraus permitem subir e descer; guardas e limites bloqueiam a queda pelo vão da escada. Os passos usam os efeitos não verbais existentes de madeira/cerâmica.

O checkpoint distingue estar dentro ou fora, preservando a escolha da conversa com os pais. Ao sair, a missão de exploração permanece ativa. Retomar dentro começa no hall; retomar fora começa junto ao carro estacionado, sem repetir a viagem. Saves que antes encerravam o capítulo na porta continuam do lado de fora, permitindo acessar o novo interior. Os pais do protagonista permanecem no aeroporto brasileiro.

O arquivo não contém personagens humanoides. Daniel e Helen continuam usando os atores existentes do terminal/carro; não foram criados substitutos ou novas cenas de conversa. A garagem decorativa do modelo não possui passagem interna exportada e não recebeu uma conexão invisível. Objetos como computador, TV e fotografias conservam sua apresentação visual, sem novas interações narrativas nesta etapa.

## Verificação e capturas reais

`npm test`: **129 testes aprovados**. `npm run build`: TypeScript e Vite aprovados, com o aviso já existente de bundle principal acima de 500 kB. Os testes novos verificam progressão, migração de saves, portas, móveis, limites e percurso de ida/volta pelos 18 degraus.

No jogo real, mouse/WASD/E validaram entrada, sala/cozinha, subida e descida dos 18 degraus, quarto, colisões do sofá e da porta fechada, pausa, saída, reentrada, recarga dentro/fora e reinício no quarto brasileiro. Foram registrados 53 pontos de movimento, sem erros de JavaScript, shaders ou assets. A escolha anterior foi preservada e a exploração não foi concluída ao sair.

Depois desse percurso, somente a cor de fundo vista pelas janelas foi alinhada ao fim de tarde do bairro. Sala e quarto receberam capturas finais com enquadramento por um harness HTTP temporário de desenvolvimento; essas duas imagens comprovam a renderização, enquanto o percurso anterior comprova os controles. Hall e cozinha mantêm as capturas do passeio. Nenhum setter foi adicionado à produção. Chromium/Linux com SwiftShader: não foi feito benchmark de FPS em GPU física ou celular.

As capturas e o resultado de execução no navegador estão no [registro de verificação](resultados-casa-anfitrioes.json): [hall](capturas/casa-anfitrioes/hall.png), [sala](capturas/casa-anfitrioes/sala.png), [cozinha](capturas/casa-anfitrioes/cozinha.png) e [quarto](capturas/casa-anfitrioes/quarto.png).

Teste focal com o servidor de desenvolvimento: `INTERCAMBIO_URL=http://localhost:5188 npm run test:host-house`. O teste antigo de Westbridge foi atualizado para esperar a entrada na casa em vez do encerramento na porta; a viagem anterior não precisa ser repetida para a verificação focal do interior.

Arquivos: novos `src/scene/hostHouse.ts`, `src/game/hostHouseLayout.ts` e `hostHouseNavigation.ts`; integração em `main.ts` e `chapterWorld.ts`; progressão em `narrative.ts`/`parentsDeparture.ts`; rótulo da porta em `westbridge.ts`; novos testes de navegação, progresso e navegador. README, AGENTS e scripts foram atualizados para o fluxo atual.

Restauração anterior: tag `restore/pre-host-house-interior`, commit `00e16f6`. Não foram modificados os modelos e cenários anteriores.
