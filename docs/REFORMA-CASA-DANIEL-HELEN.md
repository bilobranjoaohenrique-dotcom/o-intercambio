# Reforma visual da casa de Daniel e Helen

> Registro da primeira reforma. A [revisão definitiva ativa](CASA-DEFINITIVA-DANIEL-HELEN.md) acrescenta as correções posteriores, oito janelas com vidro e a vista real de Westbridge; as contagens e verificações abaixo pertencem à etapa anterior.

Implementação sobre o interior restaurado utilizado pelo jogo, preservando a fachada, a planta, os pisos, as janelas, as portas e os 18 degraus. Branch de trabalho: `feat/host-house-visual-renovation`, criada a partir de `f009dbf`. O GLB original continua disponível sem alteração para restauração.

## Fonte e construção

- Original: `public/models/daniel_helen_house.glb` (6.225.960 bytes; SHA-256 `cc90714d6ef97962ba4d0c3808323af01fa6a0a91fb6e045ea16d4d71b52d462`).
- Derivação ativa: `public/models/daniel_helen_house_renovated.glb`.
- Relatório da construção e limites medidos: `public/models/daniel_helen_house_renovation.json`.
- Texturas originais novas: `public/textures/host-house-renovation/`, 256 × 256 px, incorporadas também ao GLB.
- Reconstrução reproduzível: `python scripts/host-house-renovation/textures.py`, depois `blender -b -t 2 --python scripts/host-house-renovation/build.py` (Blender 4.3 e Pillow).

Os modelos e as texturas novos foram produzidos proceduralmente para este projeto. Nenhum modelo comercial, pacote externo, biblioteca nova ou compra foi utilizado. A base fornecida pelo usuário foi mantida separada. As seis animações decorativas paradas do arquivo original não são exportadas na derivação estática; não eram acionadas pelo jogo.

## Alterações por ambiente

| Ambiente | Implementação |
| --- | --- |
| Quarto do estudante | Cama de madeira com cabeceira ripada, colchão, travesseiros e coberta xadrez com dobras; mesa com gavetas, cadeira estofada, monitor CRT com tela curva, mouse com fio, CDs e canetas. Mapa de orientação, mala/mochila e detalhes de viagem do Brasil. |
| Sala | Sofá e poltrona com braços arredondados, almofadas separadas, costuras e manta; mesa torneada, rack com VHS, TV CRT com tela curva, ventilação e controles; fotografias em trechos sólidos de parede. |
| Cozinha | Portas de armário em relevo, puxadores, bancadas, cuba aberta e torneira, fogão com queimadores/forno/controles, geladeira, armários superiores sem sobrepor a janela, cafeteira, torradeira, micro-ondas, louças e mantimentos. |
| Jantar | Tampo a 0,77 m do piso (o antigo estava a aproximadamente 1,14 m), cadeiras a 0,45 m, lugares postos, frutas, pendente e aparador raso. |
| Hall e escada | Rodapés, molduras, soleira, tomadas/interruptores, arte e objetos de entrada; acabamento dos espelhos dos degraus e corrimão arredondado, mantendo o percurso e as alturas originais. |
| Corredor superior | Tapete estreito, quadros, fotografias e luminárias, mantendo a largura livre. |
| Quarto dos anfitriões | Cama com painéis de madeira, tecido sálvia, travesseiros, manta, dois criados-mudos e abajures; cômoda voltada para o cômodo, espelho e objetos pessoais. |
| Quarto extra | Composição simples de hóspedes: cama, mesa de leitura, abajur, cortinas e estante acessível, sem criar função narrativa. |
| Banheiro e lavabo | Cubas modeladas sem a carcaça atravessando o fundo, armários, torneiras, espelhos com reflexos reais, banheira arredondada, cortina com pregas, toalhas, cerâmica e produtos de higiene. |
| Lavanderia | Lavadora e secadora viradas para o acesso, retirada da estante que atravessava a máquina, armário dentro do pé-direito, prateleira, produtos, toalhas e cesto. |
| Garagem existente | Piso de concreto, estante, ferramentas, caixas, mangueira, bicicleta e luminária; área central livre. O acesso continua sendo a limitação original descrita abaixo. |

## Integração e desempenho

O carregamento continua sob demanda pela porta da casa. O controlador de primeira pessoa, as alturas dos pavimentos (0,39/3,84 m), as missões, os saves, os personagens e os diálogos foram preservados. Os novos obstáculos e os equipamentos corrigidos têm limites explícitos em `hostHouseRenovationLayout.ts`; os obstáculos antigos de objetos retirados foram removidos.

O builder verifica os limites de 80 componentes arquitetônicos contra o modelo importado. Uma segunda auditoria independente comparou 112 malhas estruturais, janelas, escada e garagem após a exportação, sem desvio de bounds. O GLB exportado possui 332.190 vértices nos accessors e 189.528 triângulos; os 178.360 vértices do relatório Blender precedem as divisões de UV/normais da exportação. As peças novas são agrupadas por cômodo, pavimento e material, preservando as máscaras de iluminação. Materiais e geometrias de pequenos componentes são compartilhados. As luzes nativas são reutilizadas, com até quatro luzes por malha e sombras estáticas em três mapas de 768/768/512 px. Três espelhos de 256 px só atualizam quando visíveis no próprio cômodo e com mudança de câmera ou iluminação.

Os modos diurno e noturno pertencem somente ao interior; não criam relógio, missão, evento ou interface novos. Ao sair, iluminação, visibilidade, câmera, exposição e cor de fundo anteriores são restauradas.

## Limites preservados

1. A planta interna original tem cerca de 10 × 12 m e continua diferente da fachada azul. A ligação usa o setor próprio e a transição curta existentes. Nesta primeira etapa, os cartões posteriores e o cenário `WindowView` foram preservados; a [revisão definitiva](CASA-DEFINITIVA-DANIEL-HELEN.md) os substitui por vãos reais e geometria do bairro mapeada rigidamente, mantendo explícita a diferença das plantas.
2. A garagem original é um volume decorativo sem porta interna exportada e fora da navegação. Recebeu acabamento visual; não foi inventado um acesso através de uma parede. Sua captura usa enquadramento de inspeção no jogo, não um percurso do jogador até ela.
3. Os valores de desempenho são do Chromium com SwiftShader em Linux, com resolução interna 914 × 514 e perfil balanced. Não representam FPS de GPU física ou celular.

Os resultados finais de circulação, imagens e medições acompanham a entrega em `artifacts/reforma-casa-daniel-helen/`.

## Arquivos alterados

- `public/models/daniel_helen_house_renovated.glb` e `daniel_helen_house_renovation.json`: derivação visual, materiais incorporados e relatório medido.
- `public/textures/host-house-renovation/*.png`: 44 texturas originais de superfícies e arte de baixa resolução.
- `scripts/host-house-renovation/{common,textures,build,bedrooms_living,kitchen_dining,architecture_service,electronics,finishing}.py`: fontes reproduzíveis dos ativos.
- `src/scene/hostHouse.ts`, `hostHouseLighting.ts`, `hostHouseMirrors.ts`: carregamento, luz e reflexos locais, com restauração ao sair.
- `src/game/hostHouseLayout.ts`, `hostHouseRenovationLayout.ts`: fonte ativa e colliders compatíveis com os móveis refinados.
- `src/scene/chapterWorld.ts`: seleção local do modo diurno/noturno; sem nova progressão narrativa.
- `src/main.ts`: identificação da versão `chapter1-host-house-renovated-1`.
- `tests/host-house-navigation.test.mjs`: regressão da cama/mesa de hóspedes, aparador e retirada do bloqueador antigo.
- `AGENTS.md`, `.gitignore` e a documentação da casa: manutenção/reprodução/backup e exclusão do cache Python.

O pacote de ativos inclui também o GLB original para backup; não inclui bibliotecas, node_modules ou cenários não relacionados.

## Resultado da circulação real

O percurso completo passou por hall, sala, jantar, cozinha, lavanderia, lavabo, escada, quarto dos anfitriões, banheiro, corredor superior, quarto de hóspedes e quarto do estudante: 72 pontos com W/mouse reais, em 13 trechos. A subida e a descida utilizaram os 18 degraus originais. A colisão do sofá impediu a passagem por dentro do móvel, e as novas cama/mesa de hóspedes mantiveram a aproximação livre.

A saída e a reentrada com E passaram nos modos diurno e noturno, preservando a missão de exploração, o checkpoint e a escolha narrativa anterior. Ao sair, luzes e espelhos da casa foram desligados e o estado externo foi restaurado. Ao voltar, a iluminação noturna permaneceu correta; a captura equivalente ficou idêntica pixel a pixel à anterior. Zero erros de JavaScript, console ou carregamento de assets na execução final.

Foram produzidas 15 capturas anteriores, 15 capturas diurnas finais nas mesmas poses e seis noturnas (cinco ângulos principais e a prova da reentrada). Os espelhos não geraram passes adicionais quando fora do cômodo, em oito frames observados. O relatório de auditoria, as poses e as medições estão no pacote de capturas.

## Evidências no repositório

[Resultados e métricas](resultados-reforma-casa.json) · [Sala antes](capturas/reforma-casa-daniel-helen/antes/01-sala-geral.png) / [depois](capturas/reforma-casa-daniel-helen/depois/01-sala-geral.png) · [Cozinha antes](capturas/reforma-casa-daniel-helen/antes/03-cozinha.png) / [depois](capturas/reforma-casa-daniel-helen/depois/03-cozinha.png) · [Quarto antes](capturas/reforma-casa-daniel-helen/antes/07-quarto-protagonista-geral.png) / [depois](capturas/reforma-casa-daniel-helen/depois/07-quarto-protagonista-geral.png).
