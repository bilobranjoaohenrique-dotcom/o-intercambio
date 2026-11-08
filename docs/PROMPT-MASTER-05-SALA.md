# INTERCÂMBIO — PROMPT MASTER 05
## RECONSTRUÇÃO E IMPLEMENTAÇÃO 3D DA SALA DE ESTAR
### Direção de Arte • Modelagem 3D • Level Design • Iluminação • Interações • Programação • Testes

## 1. MISSÃO DO AGENTE

Atue como uma equipe profissional de desenvolvimento de jogos formada por um Game Director, Lead Environment Artist 3D, Level Designer, Technical Artist, Gameplay Programmer, Lighting Artist, Texture Artist, UI/UX Designer, QA Engineer e Performance Engineer.

Sua missão é **criar e integrar uma sala de estar tridimensional completa, explorável, visualmente detalhada e funcional dentro do projeto existente INTERCÂMBIO**, utilizando as duas imagens de referência anexadas.

O jogo é desenvolvido em Babylon.js e TypeScript, com estética de terror psicológico retrô inspirada em jogos PS1/PS2.

Esta tarefa é exclusivamente destinada à sala de estar localizada no térreo da casa brasileira do protagonista, diretamente conectada à escada do segundo andar e à cozinha.

**O resultado esperado não é uma imagem conceitual, um modelo isolado ou uma descrição de implementação. Quero a sala construída dentro do jogo real, com geometria, materiais, iluminação, colisões e interações funcionais.**

### REGRA ABSOLUTA DE ESCOPO

**NÃO MODIFIQUE OS OUTROS CENÁRIOS DO JOGO.**

Preserve integralmente o quarto do protagonista, corredor superior, escada já aprovada, cozinha, personagens existentes, banheiro, lavanderia, garagem caso já tenham sido implementados, aeroporto, avião, cidade estrangeira e demais cenas.

Não altere a narrativa principal, os diálogos, o sistema de missões, as escolhas, as animações dos personagens ou a progressão dos capítulos.

Não recrie o jogo do zero.

Se forem necessárias alterações técnicas compartilhadas, mantenha-as mínimas, isoladas e compatíveis com tudo que já funciona.

**A única exceção permitida é adaptar pontos de conexão física entre a sala e os ambientes existentes, sem reconstruir ou modificar visualmente esses ambientes.**

---

## 2. OBJETIVO CRIATIVO

A sala deve parecer uma residência brasileira de classe média do final dos anos 1990 e início dos anos 2000.

É a casa onde o protagonista de 17 anos cresceu e está passando sua última manhã antes de viajar para um intercâmbio.

O ambiente deve transmitir conforto, nostalgia, familiaridade e uma sensação real de vida doméstica.

A estética de terror psicológico ainda deve ser muito discreta. Esta casa representa a segurança e a vida normal do protagonista antes da viagem.

**Não incluir fenômenos sobrenaturais, personagens assustadores, sustos, sangue ou acontecimentos estranhos nesta cena.**

O jogador precisa sentir que está dentro de uma casa de verdade, não de um ambiente montado com objetos aleatórios.

---

## 3. REFERÊNCIAS VISUAIS

Utilize obrigatoriamente as duas imagens anexadas:

**Imagem 1 — Sala de estar, perspectiva principal:** define a composição visual, a disposição dos móveis, as texturas, a iluminação e o estilo.

**Imagem 2 — Prancha técnica da sala:** apresenta os ângulos complementares, planta baixa, objetos importantes, materiais, dimensões e interações.

As duas referências devem representar o mesmo ambiente físico.

**Não crie uma sala diferente para cada ângulo.**

Antes de implementar, observe cuidadosamente as posições relativas da escada, televisão, janela, sofá, poltrona, mesa de centro, porta e passagem para a cozinha.

Quando a geometria já existente da casa entrar em conflito com algum detalhe das imagens, preserve a arquitetura aprovada e adapte a sala de maneira coerente.

As imagens são referências visuais, não modelos tridimensionais prontos.

---

## 4. INSPEÇÃO OBRIGATÓRIA DO PROJETO

Antes de modificar qualquer código:

1. Inspecione a estrutura atual do repositório.
2. Localize a implementação da casa e da cena do térreo.
3. Identifique como o cenário é construído e carregado.
4. Verifique os materiais e as técnicas utilizadas no quarto aprovado.
5. Identifique as coordenadas da escada e da entrada da cozinha.
6. Verifique o sistema de colisões.
7. Inspecione o sistema de interações por mira.
8. Verifique a iluminação e as configurações gráficas.
9. Identifique quais arquivos podem ser modificados sem alterar outros ambientes.
10. Preserve os controles, missões e transições existentes.

Reutilize a arquitetura do projeto sempre que possível.

Não crie sistemas paralelos desnecessários.

Não altere o código de outras cenas apenas para facilitar a implementação visual da sala.

---

# 5. ARQUITETURA E DISTRIBUIÇÃO DA SALA

## Dimensões de referência

- Largura aproximada: 4,20 metros.
- Comprimento aproximado: 3,80 metros.
- Pé-direito: 2,60 metros.
- Portas: aproximadamente 0,80 × 2,10 metros.

Essas medidas são estimativas artísticas e podem ser ajustadas à arquitetura já existente.

A sala deve conter:

- Escada de madeira conectada ao segundo andar.
- Sofá principal.
- Poltrona.
- Mesa de centro.
- Tapete central.
- Estante de madeira.
- Televisão de tubo.
- Janela com cortinas de renda.
- Porta principal da residência.
- Passagem para a cozinha.
- Mesinha lateral.
- Telefone fixo.
- Abajur.
- Porta-retratos.
- Livros e revistas.
- Plantas.
- Pequenos objetos domésticos.
- Luminária de teto.

### Organização espacial

A televisão deve ficar posicionada diante da área de estar.

O sofá deve estar voltado para a televisão.

A poltrona ficará próxima à escada, respeitando a referência.

A mesa de centro ficará entre o sofá e a estante.

A janela permitirá entrada de iluminação natural.

A porta principal deve estar integrada à arquitetura da residência.

A passagem para a cozinha precisa ser claramente identificável e navegável.

**O ambiente não pode ficar excessivamente cheio.**

Priorize composição natural, escala correta e circulação confortável.

---

# 6. MODELAGEM DO SOFÁ

Criar ou importar um sofá de dois ou três lugares, com estética residencial brasileira dos anos 1990–2000.

Características obrigatórias:

- Encosto com volume tridimensional.
- Assentos definidos.
- Braços acolchoados.
- Tecido estampado discreto, em tons marrons ou terrosos.
- Almofadas.
- Dobras e costuras representadas por geometria e textura.
- Manta de crochê sobre parte do encosto.
- Proporções compatíveis com personagens humanos.
- Pés discretos e acabamento inferior.

Não utilizar apenas cubos sobrepostos como modelo definitivo.

O sofá deve possuir textura realista dentro do estilo low-poly, sem aparência plástica.

Posicionar conforme a referência principal.

---

# 7. MODELAGEM DA POLTRONA

Adicionar uma poltrona individual próxima à escada.

Características:

- Encosto confortável.
- Assento bem definido.
- Braços acolchoados.
- Tecido com textura.
- Almofada decorativa.
- Estrutura tridimensional proporcional.
- Cores compatíveis com o sofá.

A poltrona não deve bloquear a passagem entre a escada, a sala e a cozinha.

Manter espaço suficiente para o jogador caminhar em primeira pessoa.

---

# 8. ESTANTE DE MADEIRA

Criar uma estante residencial de madeira escura, seguindo a estética do início dos anos 2000.

Ela deve possuir:

- Nicho para televisão CRT.
- Prateleiras.
- Compartimentos inferiores.
- Portas e gavetas.
- Puxadores.
- Livros.
- Porta-retratos.
- Rádio ou aparelho de som antigo.
- Pequenos objetos decorativos.
- Vasos de plantas.
- Detalhes discretos de renda.

A estante precisa ter profundidade e divisões visíveis.

Não utilizar um bloco único com textura simulando todos os objetos.

Os principais objetos precisam ter geometria tridimensional.

---

# 9. TELEVISÃO DE TUBO — OBJETO INTERATIVO

Criar uma televisão CRT típica dos anos 1990–2000.

Características:

- Gabinete de plástico escuro.
- Tela levemente convexa.
- Moldura.
- Botões.
- Pequenos detalhes do painel.
- Reflexos discretos.
- Material de vidro para a tela.

### Interação

Quando o jogador estiver próximo e olhar para a TV:

**[E] Ligar TV**

Ao interagir:

1. Reproduzir um clique eletrônico discreto.
2. A tela acende.
3. Exibir uma imagem ou programação visual simples e original.
4. Reproduzir ruído eletrônico suave, sem vozes.
5. Adicionar iluminação discreta emitida pela tela.

Ao interagir novamente:

**[E] Desligar TV**

A televisão apaga e o som é interrompido.

Não implementar streaming, reprodução de vídeos externos ou sistemas complexos de televisão.

**A TV deve ser um objeto 3D real com interação funcional.**

---

# 10. MESA DE CENTRO E DECORAÇÕES

Criar uma mesa de centro de madeira com:

- Tampo proporcional.
- Pernas modeladas.
- Acabamento de madeira.
- Pequena toalha de renda.
- Vaso de flores.
- Revistas.
- Livros.
- Pequenos objetos decorativos.

Todos os objetos devem estar corretamente apoiados sobre a superfície.

Não permitir objetos flutuando ou atravessando a mesa.

Manter circulação livre entre a mesa, sofá e poltrona.

---

# 11. TAPETE

Adicionar um tapete retangular com aparência tradicional, em tons vermelhos, marrons e bege.

Características:

- Padrão ornamental.
- Textura de tecido.
- Escala UV correta.
- Proporções adequadas ao conjunto de móveis.
- Posicionamento central.

Evitar repetição excessiva da textura e problemas de z-fighting.

O tapete deve ajudar a definir visualmente o espaço da sala.

---

# 12. JANELA E CORTINAS

Criar ou integrar uma janela compatível com a referência.

Adicionar:

- Moldura de madeira.
- Vidro.
- Cortinas rendadas.
- Vista externa de um bairro residencial.
- Entrada de luz natural.
- Sombras coerentes sobre paredes e piso.

A janela deve contribuir para a sensação de manhã tranquila.

Não transformar a vista externa em um grande cenário explorável.

Utilizar geometria simples ou recursos de fundo licenciados quando adequado.

---

# 13. TELEFONE FIXO E MESA LATERAL

Posicionar uma pequena mesa lateral próxima à poltrona ou escada.

Adicionar:

- Telefone residencial antigo.
- Abajur.
- Pequeno porta-retrato.
- Toalha de renda.
- Planta ou outro objeto doméstico discreto.

### Interação

Quando o jogador olhar para o telefone:

**[E] Examinar telefone**

Apresentar uma legenda curta:

"Esse telefone está aqui desde que eu era pequeno."

Não implementar chamadas telefônicas, novas histórias ou missões nesta etapa.

O telefone deve continuar disponível como possível objeto narrativo futuro, mas sem funcionalidades adicionais agora.

---

# 14. FOTOGRAFIAS E OBJETOS FAMILIARES

Adicionar fotografias e decorações coerentes com a história do protagonista.

Incluir:

- Fotografias da família.
- Quadros de paisagens.
- Livros.
- Pequenos enfeites.
- Plantas.
- Revistas.
- Aparelho de som.
- Objetos domésticos antigos.

**Não incluir o quadro individual da menina mencionado nas referências anteriores.**

Utilizar imagens originais ou recursos com licença apropriada.

Não utilizar fotografias reais de pessoas sem autorização.

As fotografias devem parecer pertencer à mesma família e à mesma época.

### Interações opcionais

O jogador poderá examinar algumas fotos.

Exemplo:

**[E] Examinar fotografia**

Legenda:

"Essa foto foi tirada nas nossas últimas férias."

Não criar missões adicionais para esses objetos.

---

# 15. PORTA PRINCIPAL DA RESIDÊNCIA

Adicionar ou integrar uma porta principal de madeira.

Características:

- Modelo tridimensional com painéis.
- Batente.
- Maçaneta.
- Dobradiças.
- Colisão.
- Textura de madeira.
- Proporções humanas.

A porta precisa ser compatível com a arquitetura da casa.

### Comportamento nesta etapa

Se a história ainda não permitir que o jogador saia da residência, a porta deve permanecer bloqueada.

Ao tentar interagir:

**PROTAGONISTA:**
"Ainda tenho algumas coisas para resolver antes de sair."

Não iniciar a viagem ao aeroporto nesta tarefa.

Não modificar as missões existentes.

---

# 16. ESCADA — PRESERVAÇÃO E CONEXÃO

A sala de estar fica diretamente conectada à escada que leva ao segundo andar.

**A escada já existe e não deve ser reconstruída.**

Preservar:

- Geometria.
- Corrimão.
- Texturas.
- Dimensões.
- Colisões.
- Iluminação aprovada.
- Movimentação do personagem.

Garantir que o jogador consiga chegar à sala descendo normalmente.

Corrigir somente problemas estritamente relacionados à conexão entre a escada e a nova sala.

Não modificar outros elementos do corredor superior.

---

# 17. PASSAGEM PARA A COZINHA

A sala deve possuir uma passagem natural até a cozinha.

Implementar:

- Abertura adequada.
- Batentes.
- Acabamentos.
- Piso com continuidade coerente.
- Colisões corretas.
- Espaço livre para caminhar.
- Transição visual consistente.

**Não modificar os móveis ou personagens da cozinha.**

Não alterar a mesa do café, as animações dos pais ou os diálogos existentes.

Apenas preservar a conexão entre os ambientes.

---

# 18. ILUMINAÇÃO PROFISSIONAL

Criar iluminação consistente com a referência aprovada.

Utilizar:

- Luz natural da manhã entrando pela janela.
- Luminária de teto com luz quente.
- Abajur com intensidade discreta.
- Iluminação da televisão quando ligada.
- Sombras suaves.
- Contraste moderado.
- Materiais com resposta correta à iluminação.

Evitar:

- Iluminação amarela exagerada.
- Paredes excessivamente escuras.
- Sombras completamente pretas.
- Luz atravessando objetos sólidos.
- Materiais com aparência plástica.
- Efeitos de bloom exagerados.

**O cenário precisa parecer bonito pela geometria, texturas e iluminação, não por filtros que escondem defeitos.**

---

# 19. MATERIAIS E TEXTURAS

Utilizar materiais adequados para cada superfície.

| Elemento | Material desejado |
|---|---|
| Piso | Cerâmica marrom texturizada |
| Paredes | Bege envelhecido, textura discreta |
| Estante | Madeira escura |
| Sofá | Tecido estampado |
| Poltrona | Tecido compatível |
| Mesa | Madeira |
| Tapete | Tecido ornamental |
| Cortinas | Renda |
| Escada | Material existente, sem alterações |
| Porta | Madeira |
| Televisão | Plástico e vidro |
| Objetos decorativos | Materiais individuais coerentes |

Utilizar UVs adequadas.

Evitar texturas esticadas, materiais genéricos e incompatibilidade de escala.

Priorizar modelos GLB/glTF compatíveis com Babylon.js quando necessário.

Se utilizar modelos externos, verificar a licença.

---

# 20. SISTEMA DE INTERAÇÃO

Utilizar o sistema de interação já existente no projeto.

Não desenvolver um segundo sistema paralelo.

Interações obrigatórias:

**Televisão:** ligar e desligar.

**Porta principal:** examinar ou tentar abrir conforme o estado narrativo.

**Escada:** subir e descer.

**Passagem para a cozinha:** caminhar normalmente.

Interações opcionais:

**Fotografias:** examinar.

**Telefone:** examinar.

Todos os comandos precisam funcionar com o sistema de mira e tecla E.

Não apresentar indicadores de interação em objetos sem funcionalidade.

---

# 21. ÁUDIO

Utilizar efeitos sonoros discretos e coerentes:

- Passos no piso.
- Cliques da televisão.
- Ruído eletrônico da TV.
- Sons de interação.
- Vento suave.
- Ambiência doméstica.

**Não gerar vozes, dublagem, text-to-speech ou narração.**

Toda comunicação narrativa deve continuar acontecendo através de legendas.

Não adicionar música de terror ou sustos artificiais.

---

# 22. OTIMIZAÇÃO

A sala deve ter boa qualidade visual, mantendo desempenho adequado.

Priorizar:

- Reutilização de materiais.
- Texturas em resoluções apropriadas.
- Geometrias otimizadas.
- Colisores simplificados.
- Redução de draw calls quando possível.
- Iluminação eficiente.
- Carregamento adequado de assets.
- Evitar processamento contínuo desnecessário.

Buscar 60 FPS no computador de referência, mas só afirmar que a meta foi atingida após medir o desempenho real.

Não sacrificar a qualidade artística para usar geometria abstrata.

---

# 23. TESTES OBRIGATÓRIOS

Executar o jogo e verificar:

1. O jogador consegue sair do quarto.
2. O corredor continua funcionando.
3. A escada permanece intacta.
4. O jogador desce normalmente.
5. A sala aparece corretamente.
6. Os móveis possuem materiais adequados.
7. Não há objetos flutuando.
8. As colisões permitem circulação.
9. A televisão liga.
10. A televisão desliga.
11. Os sons de interação funcionam.
12. O telefone pode ser examinado, se implementado.
13. A porta principal respeita o estado da história.
14. O jogador consegue chegar à cozinha.
15. A cozinha permanece sem alterações indesejadas.
16. O sistema de missões continua funcionando.
17. O jogo não apresenta erros críticos.
18. O desempenho é medido.
19. O build de produção funciona.
20. Nenhuma outra cena apresenta regressões.

Não considerar apenas um build concluído como prova de qualidade.

---

# 24. CAPTURAS REAIS OBRIGATÓRIAS

Após a implementação, executar o jogo e produzir capturas reais mostrando:

1. Sala vista da base da escada.
2. Sala vista da entrada da cozinha.
3. Visão geral da área de estar.
4. Sofá e poltrona.
5. Mesa de centro e tapete.
6. Estante e televisão.
7. Janela e iluminação da manhã.
8. Televisão ligada.
9. Vista da porta principal.
10. Conexão com a escada.

Comparar as capturas diretamente com as duas imagens anexadas.

**Não utilizar imagens geradas por IA como se fossem capturas reais do jogo.**

Se existirem diferenças visuais relevantes, corrigir antes de declarar a tarefa concluída.

---

# 25. CRITÉRIOS DE ACEITAÇÃO

A sala será considerada concluída somente quando:

- Sua composição corresponder às imagens aprovadas.
- O ambiente estiver totalmente navegável.
- Os móveis forem tridimensionais e proporcionais.
- As texturas estiverem corretamente aplicadas.
- A iluminação for convincente.
- Os objetos não parecerem placeholders geométricos.
- A escada estiver preservada.
- A cozinha permanecer intacta.
- A televisão funcionar.
- As interações previstas estiverem operacionais.
- A movimentação continuar fluida.
- As colisões estiverem corretas.
- O build e os testes estiverem aprovados.
- Não houver regressões nas outras cenas.
- As capturas reais estiverem disponíveis para inspeção.

Não declarar a cena visualmente aprovada sem apresentar imagens da execução.

---

# 26. RELATÓRIO FINAL OBRIGATÓRIO

Ao concluir, apresentar:

## IMPLEMENTADO

Descrever a geometria, objetos, modelos 3D, texturas, iluminação, interações e integração da sala.

## TESTADO

Informar quais testes foram executados, quais passaram e quais falharam.

## PENDENTE

Registrar limitações, bugs, assets incompletos e melhorias necessárias.

Também informar:

- Arquivos criados e modificados.
- Origem e licenças dos assets externos.
- Resultados de desempenho.
- Instruções para executar o jogo.
- Localização das capturas reais.

Não afirmar que algo funciona se não foi executado e verificado.

---

# RESULTADO FINAL ESPERADO

**Uma sala de estar brasileira, detalhada, acolhedora e completamente jogável, no estilo de terror psicológico 3D retrô PS1/PS2 do INTERCÂMBIO.**

O jogador deve conseguir descer a escada, entrar na sala, explorar os objetos, ligar a televisão, examinar elementos familiares e continuar naturalmente até a cozinha.

A estética precisa ser consistente com o quarto e o corredor que já foram aprovados.

**NÃO MODIFIQUE O QUARTO, CORREDOR, ESCADA, COZINHA, AEROPORTO, AVIÃO, CIDADE OU OUTRAS CENAS.**

**NÃO CRIE NOVAS MISSÕES OU CAPÍTULOS.**

**NÃO RECONSTRUA O JOGO INTEIRO.**

A tarefa estará concluída somente após a implementação, execução, testes e apresentação das capturas reais.

**PRIORIDADE ABSOLUTA: FIDELIDADE VISUAL ÀS REFERÊNCIAS, QUALIDADE ARTÍSTICA, JOGABILIDADE FLUIDA E PRESERVAÇÃO DO RESTANTE DO PROJETO.**