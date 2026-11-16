# Casa de Daniel e Helen — encaixe A01

O interior `Daniel_Helen_Planta_A01.glb`, fornecido no pacote Casa_Daniel_Helen_A01_para_Codex.zip, substitui a planta anterior. A casa passa a compartilhar as coordenadas reais da fachada de Westbridge. E abre/fecha a porta original; o jogador atravessa a varanda caminhando, sem reposicionamento ou fade na porta. Somente a retomada de checkpoint adota uma posição segura no hall ou junto ao carro.

## Modelo e encaixe

- Arquivo: [daniel_helen_house_a01.glb](../public/models/daniel_helen_house_a01.glb), 1.315.452 bytes. SHA-256 `424fbff159c188bec44c15c9687edde22903180e23c26a6a11c1b5281c240264`. Cópia byte a byte do upload.
- Raiz nativa glTF `[15.38,0,-12.68]`; importação igual ao bairro: `worldX=500−sourceX`. A translação da raiz não é somada duas vezes.
- Corpo principal aproximadamente 7,70×6,28 m. Pisos em 0,40/3,12 m, garagem em 0,16 m com degrau intermediário em 0,28 m; pé-direito livre de 2,50 m.
- Escada em U, 16 espelhos de 0,17 m, patamar em 1,76 m. O raio de 0,22 m e o corpo de 1,78 m do jogador permanecem iguais.
- A lateral direita da garagem excedia o exterior. Somente as extremidades de paredes, moldura da janela, piso e forro identificadas no layout recebem −0,34 m em X; a parede compartilhada e os móveis mantêm suas posições. O mesmo helper ajusta geometria e colliders.

A fachada original tinha paredes fechadas atrás dos vidros decorativos. Recortes locais abrem as janelas, a porta e a ligação interna com a garagem. As molduras externas, posições das aberturas, telhados, chaminé e demais casas são preservados. As caixas de tábuas e a faixa branca do exterior tinham planos horizontais atravessando os cômodos; seus volumes internos são esvaziados atrás das paredes do A01, incluindo a conexão com a bay window. A folha vermelha original, sua maçaneta e seu vidro são reutilizados; ela abre 90° para fora na varanda, liberando o percurso atrás do aparador. Seu collider acompanha a folha e possui limites verticais.

Os arquivos GLB de origem não são reexportados. A integração interpola os atributos de novos vértices somente nos recortes da fachada e usa transparência local nos vidros. As partes creme externas do A01 que avançavam além da pintura azul são recortadas 2 cm atrás dos painéis de base. Isso inclui os prolongamentos externos de janelas e batentes, preservando seus acabamentos internos. As faces verticais externas de pisos e forros também são retiradas; seus topos horizontais e a soleira continuam íntegros. Somente a projeção frontal da parede compartilhada é recortada, conservando sua face dentro da garagem. Os recortes dos vidros atravessam também a profundidade dos frisos, eliminando linhas azuis residuais sem mudar a largura e a altura dos vãos. O azul atrás da folha fechada do portão é retirado para que seu verso original seja visível da garagem. O céu e o bairro vistos pelas janelas são o exterior real. A iluminação interna tem um rig local restrito às próprias malhas, sem substituir o preset de Westbridge.

O carro simplificado do pacote é descrito pelo autor como peça de conferência. Suas sete malhas e colliders são omitidos; o veículo aprovado da chegada permanece estacionado do lado de fora. O A01 não contém personagens ou animações. Daniel e Helen e os pais brasileiros conservam os atores e a progressão existentes.

## Navegação e salvamento

São usadas 204 geometrias marcadas para colisão, além da folha da porta e do portão exterior. A navegação distingue os pavimentos por elevação aceita e mantém os obstáculos das outras casas, árvores, cercas, carro e postes. A sala pode ser acessada pela frente; o vão de 0,41 m entre sofá e mesa permanece estreito para o diâmetro de 0,44 m do jogador, sem reduzir sua colisão para atravessá-lo.

Depois de abrir a porta, a mesma navegação permite circular pela casa e voltar à rua. A elevação inicial considera a posição atual do jogador, inclusive quando E é pressionado ainda no caminho baixo. A retomada interna reaplica o preset de iluminação selecionado para o bairro. O checkpoint registra dentro/fora pela posição real. A missão de exploração continua ativa ao sair e a escolha anterior é preservada. A garagem tem ligação interna; o portão externo continua fechado. Nenhum diálogo, evento ou missão nova foi criado.

## Verificação

TypeScript, build Vite e **133 testes unitários** aprovados. O build conserva o aviso anterior de bundle principal acima de 500 kB. Os testes focais cobrem a escada, cômodos, garagem, continuidade com o bairro, colisões, recortes por raycast e preservação das malhas externas não afetadas.

A verificação no Babylon usou mouse/WASD/E para entrada e saída, sala/cozinha/jantar, subida, quartos/banheiro, descida, garagem, porta fechada com colisão, reentrada, checkpoints e reinício no quarto brasileiro. Abrir a porta ainda no caminho baixo preservou exatamente X/Z e altura antes da caminhada. Foram preservados 196 registros de movimento e a escolha anterior, sem erros de JavaScript, console ou assets.

O percurso foi validado em etapas: um reinício do ambiente interrompeu uma sessão e uma tolerância excessivamente rígida do harness interrompeu outra após um pequeno avanço além de um ponto de referência. Os trechos já verificados foram aproveitados; um posicionamento inicial de teste no patamar permitiu conferir a descida restante. A etapa final de porta/recarga/reentrada não usou setter de posição. Não se trata de um passeio único e ininterrupto.

As cinco imagens finais foram recapturadas no próprio jogo, nas mesmas posições e rotações das imagens de verificação, depois da correção visual definitiva. O enquadramento usa interceptação HTTP temporária apenas no teste; não há hooks no jogo publicado. Todas foram inspecionadas com o menu fechado, fase jogável e texturas prontas. As versões de geometria foram confirmadas em cada snapshot.

[Registro de verificação](resultados-casa-anfitrioes-a01.json): [entrada](capturas/casa-anfitrioes-a01/entrada.png), [sala](capturas/casa-anfitrioes-a01/sala.png), [quarto](capturas/casa-anfitrioes-a01/quarto.png), [garagem](capturas/casa-anfitrioes-a01/garagem.png) e [fachada](capturas/casa-anfitrioes-a01/fachada.png).

Chromium/Linux com SwiftShader. Não foi feito benchmark em GPU física/celular, nem repetidas as cenas anteriores de aeroporto/avião e a viagem longa de carro.

## Arquivos e restauração

Produção: `hostHouse.ts`, `hostHouseLayout.ts`, `hostHouseNavigation.ts`, `hostHouseEnvelope.ts`, `westbridgeHostOpenings.ts`, `westbridge.ts`, `chapterWorld.ts` e `main.ts`. Verificações: navegação A01, recortes da fachada e fluxo de navegador. As atribuições do pacote estão em [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) e junto ao GLB.

Estado anterior: tag `restore/pre-host-house-a01`, commit `126fa55`.
