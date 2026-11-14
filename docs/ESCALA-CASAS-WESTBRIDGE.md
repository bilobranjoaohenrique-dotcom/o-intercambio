# Westbridge — correção medida das proporções residenciais

## Diagnóstico

Restauração: tag `restore/pre-westbridge-house-scale`, commit `1171663`. Não há escala global acidental na importação: os pais dos lotes são identidade; o contêiner do bairro somente desloca a origem para X=500 e a raiz glTF converte a lateralidade.

A primeira tentativa de entrega foi interrompida pela indisponibilidade do ambiente antes do commit/push. O commit `1171663`, que ainda estava em `origin/main` na retomada, não incluía a calibração; por isso a versão daquele commit continuava exibindo os modelos menores. Na retomada, o teste com o GLB real foi reexecutado e novas comparações foram capturadas, sem aplicar um segundo aumento às casas já corrigidas.

O protagonista não possui corpo renderizado nesta sequência. A referência física existente é a câmera a **1,65 m acima do piso**, com raio de colisão de 0,22 m. O carro fornecido está em escala 1 e mede **1,946 × 1,566 × 4,250 m**. Postes elétricos de 8,25 m, luminárias de rua de 5,76 m e cercas de 1,10 m já são coerentes e não precisam crescer.

As 14 residências usam quatro famílias com proporções internas diferentes. A casa azul já mede 8,828 m com chaminé, mas sua folha de porta tem somente 1,759 m. Nas seis casas térreas, a folha mede 1,344 m e as paredes aproximadamente 1,958 m. Nas três casas de três pavimentos, os intervalos entre andares são de aproximadamente 1,483 m. As quatro casas menores com sótão têm portas altas, de 2,359 m.

Portanto não existe um fator uniforme que simultaneamente corrija portas, pavimentos e altura total. Aumentar todo o bairro ou todos os eixos também alargaria casas que já têm 9–12,6 m e invadiria seus lotes. A correção mantém **X/Z e a base no terreno**, ajusta as alturas necessárias e acompanha portas, batentes e ferragens. Telhados recebem translação vertical correspondente ao beiral, preservando sua forma, inclinação e UVs. Nenhum material ou textura é substituído.

## Dimensões e fatores aplicados

| Família | Quantidade | Altura total antes → depois | Fator Y do corpo | Folha antes → depois | Fator Y da folha |
| --- | ---: | ---: | ---: | ---: | ---: |
| Casa azul dos anfitriões | 1 | 8,828 → 8,828 m | 1,000000 | 1,759 → 2,030 m | 1,154383 |
| Cozy, casas com sótão | 4 | 6,962 → 6,962 m | 1,000000 | 2,359 → 2,030 m | 0,860569 |
| Ranch, térreas | 6 | 3,551 → 4,193 m | 1,328018 | 1,344 → 2,030 m | 1,510826 |
| Mansion, três pavimentos centrais | 3 | 6,388 → 9,136 m | 1,618450 | 1,135 → 2,030 m | 1,788546 |

**Todos os fatores X/Z são 1,0.** As fachadas mantêm suas larguras: azul 12,320 m, cozy 8,975 m, ranch 12,600 m e mansion 12,320 m. A arquitetura da mansion tem três pavimentos na torre central e dois nas alas; seus 9,136 m incluem as chaminés, portanto não foi tratada como uma casa de dois pavimentos.

Os fatores da folha são relativos à malha original, não multiplicações adicionais sobre o fator do corpo. Folhas, painéis, batentes e ferragens são corrigidos em conjunto. As três portas duplas das mansions totalizam seis folhas; com as outras 11 casas, foram verificadas **17 folhas de porta**. A tolerância numérica observada é inferior a 0,1 mm em relação ao alvo de 2,03 m.

Nas ranch, o corpo tem 2,60 m até o beiral e a cobertura sobe **0,642195 m** por translação. Seus seis portões passam de 1,531 para **2,150 m**, fator Y **1,404762**, mantendo largura de aproximadamente 3,239 m. Essa abertura comporta geometricamente o carro de 1,946 m de largura e 1,566 m de altura. Não foram criados interiores de garagem nem animações novas de portão.

Nas mansions, o intervalo visível entre pavimentos passa de 1,4829 para **2,40 m**. As coberturas central, das alas e da varanda recebem deslocamentos próprios segundo seus beirais; a cobertura central sobe **2,747960 m**. Chaminés e suas capas acompanham a mesma translação da cobertura correspondente. Frisos intermediários e molduras das janelas acompanham seus pavimentos, sem serem confundidos com peças do telhado.

Na azul, o corpo principal, a garagem e os pisos permanecem em sua escala anterior. A altura livre da varanda passa de **2,148 para 2,400 m**; seis apoios e a cobertura existente acompanham o ajuste. A mesma luminária foi refitada ao lado da moldura da porta, sob a cobertura, porque o novo lintel deixou espaço insuficiente para o globo na posição central antiga. Seu ponto de luz acompanha o objeto; intensidades, cores e demais luzes permanecem iguais.

## Implementação e preservação

As casas estão agrupadas por material dentro do GLB. Escalar os nós dos lotes moveria também árvores, cercas, jardins e calçadas. O carregamento agora identifica componentes arquitetônicos e corrige apenas suas alturas. São **35 malhas de material com 113.928 vértices ajustados**, sem adicionar casas, substituir malhas ou reexportar o arquivo fonte. Os buffers de normais acompanham a transformação para manter iluminação correta. Guarda-corpos acompanham as sacadas correspondentes.

O teste usa o GLB real para verificar portas, portões, solo, coordenadas X/Z, índices, UV/UV2, nós, materiais, inclinação das coberturas, continuidade das chaminés e alinhamento de frisos/janelas. Nas quatro cozy, o recorte da porta é conectado à parede: seu topo e os painéis acompanham a nova folha. Somente nesse recorte, **43 vértices recebem ajuste UV local**, conservando a projeção original da fachada e as linhas retas do revestimento; os demais UVs permanecem iguais. O arquivo `public/models/westbridge.glb` permanece intacto. Árvores, cercas, postes, veículo, jogador e ambientes anteriores conservam suas dimensões.

As caixas de colisão e os pisos existentes continuam válidos: a planta X/Z e os níveis caminháveis da varanda azul não mudaram. Nenhuma caixa foi aumentada por suposição. O ponto e o proxy de interação da porta foram alinhados à sua nova altura; caminho de aproximação, estacionamento e rota de carro permanecem iguais.

## Capturas antes/depois na altura dos olhos

| Posição fixa | Antes | Depois |
| --- | --- | --- |
| Ranch térrea | [Antes](capturas/westbridge-escala/antes-ranch-street.png) | [Depois](capturas/westbridge-escala/depois-ranch-street.png) |
| Mansion de três pavimentos | [Antes](capturas/westbridge-escala/antes-mansion-street.png) | [Depois](capturas/westbridge-escala/depois-mansion-street.png) |
| Par de casas do mesmo tipo das apontadas | [Antes](capturas/westbridge-escala/antes-neighbours.png) | [Depois](capturas/westbridge-escala/depois-neighbours.png) |

As imagens vêm do jogo Babylon.js real, com o mesmo viewport de 1280 × 720, posição, rotação e FOV de 1,05 radianos em cada par. A vista `neighbours` aproxima o contexto da imagem enviada; não pretende recuperar sua câmera exata. As outras duas vistas usam olhos a 1,634 m sobre o meio-fio e `neighbours` a 1,65 m sobre a calçada, em altura adulta. Para garantir comparação exata, o teste intercepta temporariamente o módulo de desenvolvimento e expõe a câmera apenas no processo de teste; o jogo publicado não ganha comandos de teletransporte ou ajuste de câmera. Esse posicionamento serve somente para as imagens. A verificação de navegação usa separadamente o controlador real, mouse e WASD.

## Verificação e arquivos

`npm test`: **118 testes aprovados**. `npm run build`: TypeScript e Vite aprovados; permanece o aviso de bundle principal acima de 500 kB. O teste focal com o GLB real integra a suíte completa. O registro de navegador e as seis capturas são entregues em [resultados-escala-westbridge.json](resultados-escala-westbridge.json).

Na retomada, o navegador executou novamente as três comparações e a caminhada completa até a varanda, com mouse/WASD reais. O raycast alcançou `wb-house-door`; a parede bloqueou W continuado em Z=−12,455394 m. O piso da varanda e a altura dos olhos acompanharam o controlador existente. Foram registrados zero erros JavaScript, de console ou de carregamento. O baseline foi servido do commit de restauração em um checkout leve, compartilhando somente os arquivos de modelos/texturas que permaneceram intactos. A versão corrigida foi servida do workspace atual. Não foram repetidas as cenas anteriores nem a viagem de carro, que não tiveram alterações nesta correção.

A entrega é enviada à branch `main` do GitHub. A consulta ao endereço da Vercel foi bloqueada pelo proxy de rede deste ambiente (túnel HTTPS com resposta 403); isso não é um erro observado no jogo. A execução local e o build foram verificados, mas o deploy remoto não foi confirmado por essa consulta.

Arquivos de produção: novos `src/game/westbridgeHouseScale.ts` e `src/scene/westbridgeHouseScale.ts`; integração em `src/scene/westbridge.ts`; altura de interação em `src/game/westbridgeLayout.ts`; refit da luminária em `src/scene/westbridgeProps.ts` e `westbridgeLighting.ts`. Verificação: novos `tests/westbridge-house-scale.test.mjs` e `tests/westbridge-scale-browser.mjs`. Entrega: este relatório, JSON de medições, seis capturas e referência no `README.md`.

Para repetir a comparação, preservar o harness desta versão e apontar `INTERCAMBIO_URL` para um servidor de desenvolvimento com o ponto de restauração, usando `WESTBRIDGE_SCALE_STAGE=before WESTBRIDGE_SCALE_VIEWS=ranch-street,mansion-street,neighbours node tests/westbridge-scale-browser.mjs`. Depois apontar para a versão corrigida e executar com `WESTBRIDGE_SCALE_STAGE=after` e o mesmo filtro de vistas. O teste conserva o registro antes em `/tmp/westbridge-scale/` para exigir a igualdade exata das câmeras no depois. O servidor de produção não recebe a interceptação de teste.
