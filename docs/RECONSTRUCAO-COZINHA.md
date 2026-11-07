# Reconstrução visual — cozinha e pais

Esta atualização concentra o acabamento da casa em **INTERCÂMBIO — Capítulo 1: A Despedida**. A versão de partida é o capítulo já existente no GitHub, incluindo a viagem de carro e as interações posteriores. O aeroporto, o avião e a cidade anfitriã permanecem fora deste trabalho de acabamento.

A imagem enviada pelo usuário orienta a composição, os materiais domésticos e a luz da manhã. Ela não é usada como fundo, textura ou substituto do ambiente 3D navegável.

## Implementado

A cozinha anterior e os dois modelos geométricos básicos dos pais foram substituídos dentro do cenário doméstico existente. A sequência de missões e os ambientes posteriores continuam usando a lógica do capítulo.

O ambiente agora reúne piso cerâmico, paredes azulejadas com motivos florais, armários com portas e puxadores, bancada em L, geladeira com lembranças e planta pendente, fogão com forno e panela, pia com recorte físico na bancada e torneira curva. A mesa tem toalha floral com barra xadrez e caimento tridimensional, cadeiras de madeira, louças, café, pão, frutas, garrafa térmica, manteiga e geleia. O aparador com televisão de tubo, o calendário, os tecidos e os pequenos objetos completam a composição doméstica.

A janela é uma abertura real na parede, com caixilhos, grades, cortinas de renda e um quintal construído em geometria atrás dela. A cozinha possui luz difusa, sol quente direcional e luz rebatida próprios. O mapa de sombras suavizadas tem resolução de **1024 × 1024** e é reutilizado entre atualizações; a ativação da cozinha e a troca de personagem no diálogo invalidam o mapa. Essa iluminação interpreta a manhã da referência, sem reproduzir exatamente a iluminação da imagem.

Mãe e pai têm anatomia construída por seções de malha: cabeça, nariz, olhos, sobrancelhas, boca, orelhas, cabelo, tronco, membros, mãos com dedos e calçados. A mãe usa blusa floral e saia; o pai, sentado à mesa, usa camisa listrada, calça e relógio. Os dois modelos somam **46 malhas e 6.465 triângulos**, agrupados por parte articulada e material. Texturas de rosto de 256 pixels acrescentam variações de pele e marcas discretas; as feições continuam sendo geometria.

Os personagens têm pequenos movimentos de postura, cabeça e braços, reação ao personagem indicado na legenda e acompanhamento limitado do olhar do jogador próximo. As rotações do olhar possuem limites e suavização; o corpo permanece ancorado na posição física.

| Área | Arquivos | Responsabilidade |
| --- | --- | --- |
| Ambiente da cozinha | `src/scene/kitchen.ts` | Mobiliário, objetos de café, abertura da janela, cortinas, composição e iluminação |
| Materiais da cozinha | `src/scene/kitchenMaterials.ts` | Texturas originais de superfícies domésticas, tecidos, cerâmica, madeira e pequenos detalhes |
| Mãe e pai | `src/scene/parents.ts`, `src/scene/parentsGeometry.ts`, `src/scene/parentsMaterials.ts` | Modelos articulados, rosto, roupas e gestos de conversa |
| Distribuição física | `src/game/kitchenLayout.ts`, `src/game/collision.ts` | Posições e dimensões compartilhadas entre cenário e colisões |
| Integração e câmera | `src/scene/chapterWorld.ts`, `src/main.ts` | Ativação da cozinha, alvos existentes, reação dos personagens ao diálogo e atualização do vetor vertical da câmera |
| Interface | `src/style.css` | Tipografia monoespaçada na interface e mira em cruz |
| Verificação | `tests/kitchenCollision.test.mjs`, `tests/kitchen-browser.mjs`, `tests/kitchen-route.mjs`, `tests/browser.mjs`, `tests/browser-helpers.mjs` | Casos de colisão, rotas por teclado e mouse, enquadramentos e fluxo do capítulo |

A mesa, os eletrodomésticos, os armários, as cadeiras e os pais usam dimensões compartilhadas para evitar atravessar objetos sólidos: são **dez pegadas de mobiliário e duas dos personagens**. A cadeira do pai está incluída na pegada dele. A entrada pela escada mantém a passagem do corredor; os limites laterais dessa entrada também protegem o jogador contra sair do piso.

O objetivo continua sendo **“Converse com seus pais”**. A conversa, as escolhas e a progressão permanecem vinculadas ao sistema de narrativa do capítulo. Os gestos acompanham a fala escrita; não existe sincronização labial ou reprodução de voz.

### Assets e procedência

Os modelos, padrões de tecido, texturas e detalhes desta reconstrução são criados por código no projeto. Os materiais da cozinha incluem **27 texturas base de 128 a 512 pixels**, além de cores sólidas para detalhes. Os padrões cobrem cerâmica, madeira, fórmica, esmalte, aço, porcelana, tecido floral, renda, folhas e objetos domésticos. Os materiais dos pais acrescentam padrões próprios de pele, rosto, cabelo e roupa. As texturas são geradas localmente e aplicadas a superfícies 3D; a animação movimenta partes reais dos modelos.

Não foi incorporado pacote externo de móveis, personagens ou imagens da referência. As dependências do motor e das ferramentas continuam registradas em [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

**Diálogos usam somente texto.** Não se gera, carrega ou reproduz TTS, dublagem, voz sintética ou fala ambiente. Efeitos não verbais e ambiência permanecem separados no módulo de áudio do capítulo.

## Testado

A verificação executada aprovou **TypeScript, 41 testes unitários e o build de produção**. Os testes unitários incluem as pegadas dos móveis e dos dois pais, movimentos longos contra obstáculos, circulação dos dois lados da mesa e a passagem da escada para a cozinha.

O comando `npm run verify` percorreu uma partida nova: despertar, porta física, escada, cozinha, colisões contra mesa e personagem, pausa, recarga de checkpoint, conversa e escolha de resposta. Depois percorreu a mala, a viagem de carro já existente, o aeroporto, o avião e a conversa de chegada até o final do capítulo. Essa execução terminou aprovada, sem erros críticos de página, console, shaders ou arquivos.

Após essa passagem completa, duas condições de visibilidade da interface durante o diálogo foram ajustadas. Uma regressão focada no **build final**, entrando pela restauração de um checkpoint suportado pelo próprio jogo, aprovou as seis perspectivas da cozinha, colisões, pausa, recarga, conversa, escolha e avanço para a missão de pegar a mala. As imagens finais abaixo vêm dessa regressão. A entrada por checkpoint não é apresentada como uma segunda partida completa desde a cama.

O perfil **Baixo** recebeu outra execução fresca, desde o despertar e a escada até a visão geral da cozinha e a medição de desempenho. Essa rodada não repetiu todo o capítulo nem a conversa com escolhas.

A inspeção das capturas confirmou cenário e pais visíveis. A amostragem automática da visão geral registrou `whiteClipFraction = 0` nos três percursos medidos. Comparações do canvas ao longo de sete quadros registraram alterações visuais compatíveis com o idle; também foram verificados o alinhamento do horizonte ao girar e inclinar a câmera e os bloqueios físicos da mesa e do personagem. Esses controles técnicos complementam as capturas, sem substituir a avaliação artística do usuário.

O build final manteve o aviso do Vite sobre o chunk principal acima de 500 kB: **1.403,42 kB**, ou **358,88 kB com gzip**. Esse aviso não foi ocultado. Os dados originais de desempenho, imagem, horizonte e posições de parada estão preservados no [relatório de resultados](resultados-cozinha.json).

### Desempenho medido

Ambiente: **Node.js 24.19.0, Chromium 154 em Debian 13/Linux, SwiftShader e WebGL 2**, sem GPU física. A janela do navegador foi de **1280 × 800**. Cada amostra observa aproximadamente dez segundos reais de câmera parada na cozinha; FPS é calculado por quadros efetivamente renderizados divididos pelo intervalo real.

| Execução | Perfil | Resolução interna | Quadros / tempo real | FPS medidos |
| --- | --- | ---: | ---: | ---: |
| Partida fresca e fluxo completo do capítulo | Equilibrado | 914 × 571 | 81 / 10,002703 s | 8,1 |
| Regressão final da cozinha/interface, por checkpoint | Equilibrado | 914 × 571 | 83 / 10,007237 s | 8,3 |
| Nova aproximação desde a cama | Baixo | 581 × 363 | 122 / 9,999983 s | 12,2 |

**Esses números não comprovam desempenho confortável ou 60 FPS.** São medições deste servidor com renderização por software; não foram medidos GPU física, Windows ou o computador do jogador. Os valores de média/P95 do indicador do jogo usam outra janela móvel e, por isso, não são apresentados como estatísticas exatas desses intervalos de dez segundos. O JSON conserva esses valores originais.

### Capturas reais da execução final

As seis imagens são capturas de **1280 × 800** do jogo no navegador, com posições alcançadas por teclado e mouse a partir do checkpoint da cozinha. Não são imagens conceituais nem renders usados no lugar da jogabilidade.

1. [Vista geral da cozinha](capturas/cozinha-geral.png).
2. [Mãe visível na cena](capturas/cozinha-mae.png).
3. [Pai visível na cena](capturas/cozinha-pai.png).
4. [Os dois pais à mesa](capturas/cozinha-pais.png).
5. [Aproximação do jogador à mesa](capturas/cozinha-aproximacao.png).
6. [Diálogo na cozinha](capturas/cozinha-dialogo.png).

## Pendente

- A fidelidade visual continua abaixo do nível de detalhe da imagem de referência. A iluminação da janela é uma aproximação; as capturas mostram o acabamento efetivamente entregue.
- Medir o desempenho em GPU física e no computador do jogador. O desempenho baixo observado no SwiftShader permanece uma limitação desta validação.
- Executar o `.bat` e verificar a cena no Windows; a preparação e os testes em Linux não comprovam essa plataforma.
- Obter a avaliação visual do usuário antes de iniciar o acabamento do aeroporto.
- Verificar uma URL publicada na Vercel. Esta validação usou o build de produção servido localmente e não comprova uma implantação remota.

O acabamento do aeroporto e dos demais ambientes, novas fases e novos sistemas de jogo não fazem parte desta reconstrução.
