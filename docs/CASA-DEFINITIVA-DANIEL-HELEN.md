# Casa de Daniel e Helen — revisão definitiva

Esta revisão corrige os problemas das capturas recebidas sobre a reforma já ativa. A casa conserva a planta, os dois pavimentos, os 18 degraus, a circulação e os móveis aprovados; recebe correções de apoio, acabamento, arte, janelas e iluminação. A porta do porão solicitada fica fechada na parede bege ao fundo do hall térreo, entre as paredes verdes.

## Arquivo ativo e reprodução

| Arquivo | Identificação |
| --- | --- |
| Original preservado, `public/models/daniel_helen_house.glb` | 6.225.960 bytes; SHA-256 `cc90714d6ef97962ba4d0c3808323af01fa6a0a91fb6e045ea16d4d71b52d462` |
| Ativo, `public/models/daniel_helen_house_renovated.glb` | 13.616.548 bytes; SHA-256 `bdebcb16853c05f97d89750f137953e1cfd8e21cae3e6c09a2e7e95ff1c904cc` |

O builder sempre importa o original, aplica as cinco etapas anteriores (`bedrooms_living`, `kitchen_dining`, `architecture_service`, `electronics`, `finishing`) e, depois, as três novas etapas: `definitive_architecture`, `definitive_furnishings` e `definitive_services`. Assim, a revisão pode ser reconstruída sem modificar o original nem acumular transformações sobre um GLB já renovado. O commit `8375a82` conserva a versão ativa anterior para comparação e reversão.

```sh
python scripts/host-house-renovation/textures.py
blender -b -t 2 --python scripts/host-house-renovation/build.py
```

Requer Blender 4.3 e Pillow. A construção atualiza o GLB, o [relatório de construção](../public/models/daniel_helen_house_renovation.json) e os colliders medidos em `src/game/hostHouseRenovationLayout.ts`. O carregamento continua sob demanda pela porta da casa azul.

## Correções das capturas

| Problema observado | Correção implementada |
| --- | --- |
| Quadro atravessando a passagem entre sala e lavanderia | Moldura, fundo e imagem foram movidos juntos para um trecho sólido da divisória. |
| Paisagem baixa atrás da TV CRT e pequenos objetos suspensos | O quadro nativo foi pendurado na parede; prateleiras, livros e retratos foram encostados e apoiados corretamente. A planta da mesa de centro passou a tocar o tampo. |
| Sofá, almofadas e manta com sobreposições | Assentos e encostos arredondados, duas almofadas apoiadas e uma única manta contínua sobre o braço. |
| Armário dos anfitriões e objetos da cômoda | Acabamento de madeira sobre as peças nativas, mantendo o deslocamento de 1,45 m que libera a porta; vaso e livros apoiados no tampo. |
| Quarto extra incompleto; livros no chão | Criado-mudo, luminária, cômoda estreita, cadeira e tapete domésticos; livros sobre a mesa, com acessos preservados. |
| Prateleira do estudante entrando no armário; pôsteres recortados | Prateleira e conteúdo reposicionados juntos, com suportes; UVs individuais recuperam cada imagem original completa e corrigem a orientação do texto. O mouse duplicado foi retirado. |
| Bancadas, pés e puxadores sem apoio físico | Travessas sob as bancadas, rodapés e pés em contato com o piso, prolongamento dos pés de mesa/cadeiras e fixações dos puxadores. Cubas continuam abertas. |
| Copos dentro das pias e produto suspenso na lavanderia | Peças antigas conflitantes removidas; objetos úteis existentes mantidos. Cesto reconstruído com abertura, forro, trama, alças e roupa contida. |
| Espelhos e áreas de trabalho pouco legíveis | Luminárias modeladas correspondentes às luzes locais e iluminação por cômodo/pavimento; reflexos planares de 256 px, atualizados quando visíveis e necessários. |
| Cartões opacos nas janelas dos fundos | Quatro aberturas reais na parede, com profundidade, caixilhos e vidro transparente. As quatro aberturas frontais existentes foram completadas com perfis e vidro. |
| Parede bege indicada para a porta do porão | Porta residencial de seis painéis, 0,90 × 2,10 m, com vão real, batentes, guarnições, maçaneta e dobradiças; rodapé interrompido nas guarnições. |
| Objetos soltos fora da casa | Cadeira quebrada suspensa fora da garagem e caixa além da parede posterior removidas. |

A porta do porão está no plano X≈58, centro Z=37, piso Y=0,39, nas coordenadas do arquivo. O conjunto tem um pai e 27 peças de malha identificados por metadados, folha separada e collider fechado. E oferece “Examinar porta do porão” e a resposta neutra “A porta está fechada.” O espaço posterior não foi construído. A escada visível por uma passagem alinhada conserva a geometria e o percurso originais. A garagem continua decorativa, sem acesso interno criado nesta revisão.

## Vista real de Westbridge e limite da planta

As janelas mostram cópias da geometria do Westbridge já carregado pelo jogo, incluindo seus materiais, objetos de rua, jardim, caixa de correio e carro estacionado. O antigo cenário embutido `WindowView` foi retirado inteiro. A vista compartilha geometrias e texturas do bairro, com materiais, céu e iluminação próprios para que dia/noite do interior não alterem o bairro externo. Somente as oito malhas da própria fachada dos anfitriões são omitidas dessa cópia; o jardim permanece.

O [referencial medido](../src/game/hostHouseExteriorFrame.ts) aplica rotação de 90°, translação e escala 1, ancoradas na porta. Em coordenadas de runtime:

```text
HH.x = 752 + WB.z + 12,665
HH.y = WB.y − 0,010416225
HH.z = 516,9435 − WB.x
```

A [prova geométrica resumida](../artifacts/casa-definitiva/westbridge-view-proof.json) verificou 3.033 vértices amostrados do GLB real, com erro máximo de 0,0000521 m, além do compartilhamento de geometria/texturas e isolamento dos materiais. É uma verificação focal com 99 malhas e fixtures de céu/instâncias; as contagens da cena completa pertencem às métricas de runtime.

A planta interna original mede aproximadamente 12 m de largura por 10 m de profundidade; o corpo principal externo mede 7,695 × 6,2787 m. A janela posterior, mapeada rigidamente, cai em Z externo −22,665, enquanto a parede posterior externa fica em −18,9544: diferença de **3,7106 m**. O bairro conserva suas distâncias e disposição. Essa vista estabelece correspondência de posição e direção de câmera com o bairro; a planta interna continua diferente da fachada. A entrada e a saída mantêm o setor interno separado e o fade curto na porta.

Os cinco pares de referência registram essa limitação: as duas câmeras dos fundos usam a inversa exata do referencial; as três frontais avançam 2,5 m para fora para evitar que a fachada original ocupe a câmera de referência. A fachada continua habilitada nessas capturas externas. Assim, os marcos e a orientação podem ser comparados sem afirmar igualdade de projeção entre as duas plantas.

## Recursos reutilizados e custo de renderização

A arquitetura, os materiais nativos aproveitáveis, as imagens dos pôsteres e as cinco etapas da primeira reforma foram reutilizados. Os novos acabamentos usam as texturas domésticas já geradas pelo projeto. As vistas externas compartilham a geometria e as texturas reais de Westbridge; não carregam outro modelo de cidade. Movimento, interação por E, missões e checkpoints continuam usando os sistemas existentes. Nenhuma dependência ou asset comprado foi acrescentado.

O exterior usa matrizes estáticas, materiais isolados e duas luzes próprias. A passagem principal de renderização recorta as malhas pelos cones das oito aberturas, usando seus limites completos e margens conservadoras. Quando os limites das janelas ficam fora do enquadramento, a vista externa deixa de ser enviada nessa passagem. O recorte não calcula oclusão pelas divisórias: uma janela atrás de outra parede ainda pode manter malhas externas elegíveis. Perto das janelas, a renderização completa é mantida para evitar cortes indevidos. Os espelhos conservam listas independentes e filtram o exterior pelo frustum refletido; continuam com resolução de 256 px e atualização sob demanda.

## Verificação e evidências

TypeScript, produção e **140 testes automatizados aprovados**. A [auditoria independente do GLB exportado](../artifacts/casa-definitiva/static-glb-audit.json) confirmou o hash do original, oito vidros `BLEND` com alpha 0,075 e dupla face, as 27 peças identificadas da porta fechada e ausência dos cartões posteriores e do cenário antigo. Os 80 componentes arquitetônicos auditados mantêm seus limites externos, com desvio máximo de 0,00000530214 m; sondas contra os triângulos confirmam os novos vãos e suas laterais/cabeçalhos sólidos.

O arquivo exportado possui 573 nós de malha, 318.287 vértices contabilizados por instância e 197.306 triângulos. O relatório Blender registra 137.019 vértices antes das divisões de UV, normais e materiais da exportação; os triângulos coincidem. Essas contagens estáticas não substituem as medições de malhas ativas e draw calls no jogo.

As capturas reais usam as [poses registradas](../artifacts/casa-definitiva/poses.json): 21 pares diurnos antes/depois, três vistas suplementares, vistas noturnas e cinco pares de janelas/Westbridge. O [percurso com controles reais](../artifacts/casa-definitiva/circulacao-final.json) passou por 117 pontos, W/A/S/D, todos os 18 degraus na subida e descida, os cômodos navegáveis, sofá e três novos móveis do quarto de hóspedes. E examinou a porta do porão de dia e à noite, sem mudar missão/checkpoint; saída e reentrada conservaram os modos e restauraram o bairro. Para acelerar esse percurso em SwiftShader, a viewport dos controles foi reduzida a 640 × 360, mantendo proporção e qualidade; as fotos e medições conservaram suas resoluções documentadas.

A última alteração do GLB corrigiu apenas as UVs dos três pôsteres no código autor. O passeio completo foi executado antes dessa correção; os nós, transformações, colliders e a auditoria estática foram preservados. A comparação canônica exata entre uma referência regenerada e o GLB final confirmou posições, normais, triângulos e materiais; essa referência não reproduziu o digest geométrico antigo, portanto não prova identidade com todo o ativo do passeio. O [registro de proveniência](../artifacts/casa-definitiva/geometry-uv-provenance.json) declara esse limite. A checagem curta posterior de controles e interações fica registrada separadamente.

A [verificação visual final](../artifacts/casa-definitiva/final-visual-verification.json) comparou nove enquadramentos após o recorte do exterior: oito foram idênticos em todos os pixels; um teve diferença de um nível em um canal, sem mudança visual significativa. Os pôsteres foram fotografados novamente de dia e à noite. A [checagem curta no GLB final](../artifacts/casa-definitiva/final-runtime-smoke.json) também passou: W/A/S/D, E na porta do porão, saída/reentrada de dia e à noite, missão/checkpoint preservados, modos restaurados, todas as texturas prontas, espelhos fora do cômodo sem novas passagens e correção do guarda-roupa aplicada uma única vez. Sem erros de runtime, console ou carregamento na sessão final. O processo da primeira tentativa dessa checagem encerrou; a recuperação usou um navegador e um servidor novos, reaproveitando as demais evidências.

As [métricas anteriores](../artifacts/casa-definitiva/metrics-antes.json), [finais](../artifacts/casa-definitiva/metrics-depois.json) e o [orçamento da vista externa](../artifacts/casa-definitiva/budget-real-windows.json) usam poses equivalentes, perfil balanced, viewport 1280 × 720 e resolução interna 914 × 514, com 15 frames de aquecimento e 30 medidos por pose. Chromium headless/Linux usa SwiftShader: os tempos abaixo não estabelecem FPS em GPU física ou celular.

| Vista | Draw calls antes → final | Triângulos ativos antes → final | Tempo médio por frame antes → final, software |
| --- | --- | --- | --- |
| Sala | 115 → 189 | 65.904 → 233.792 | 206,6 → 425,8 ms |
| Quarto do estudante | 242 → 316 | 84.890 → 258.960 | 321,6 → 585,0 ms |
| Cozinha | 74 → 113 | 49.134 → 130.992 | 271,2 → 458,5 ms |

Renderizar o bairro real acrescentou custo em relação ao cenário embutido anterior. O recorte reduziu a etapa intermediária de 199/326/163 para 189/316/113 draw calls nas mesmas três vistas, com imagens preservadas; o ganho de tempo variou no renderizador por software. Junto às janelas, a versão final mediu 128 draw calls/395,2 ms na sala e 110/378,1 ms na cozinha. Os limites amplos das malhas originais reunidas por material impedem um recorte tão fino quanto o de peças separadas. Não foi medido consumo real de VRAM nem desempenho em GPU física.

Na vista interna de jantar sem qualquer vão no enquadramento, o recorte excluiu as 109 malhas externas e deixou zero malhas externas ativas, medindo 137 draw calls totais/306,5 ms. A vista ampla da porta do porão conservou 40 malhas externas porque seu enquadramento também alcança uma janela atrás da divisória; os dois resultados estão registrados separadamente.

Missões, diálogos anteriores, saves, escolhas narrativas, personagens e a restauração de câmera/iluminação ao sair continuam no fluxo existente. Os documentos de [restauração](CASA-DOS-ANFITRIOES.md) e [primeira reforma](REFORMA-CASA-DANIEL-HELEN.md) registram etapas anteriores; esta página descreve a revisão ativa.
