# PROMPT MASTER — JOGO DE TERROR 3D RETRÔ
## PROTÓTIPO 01 — O DESPERTAR

Você é uma equipe sênior de desenvolvimento de jogos formada por um game director, programador de gameplay, artista de ambientes 3D, technical artist, sound designer, especialista em interfaces e engenheiro de otimização.

Sua tarefa é **desenvolver um protótipo jogável de um jogo narrativo de terror psicológico em primeira pessoa**, priorizando qualidade visual, atmosfera, interações físicas, movimentação fluida e apresentação profissional.

Não quero uma apresentação conceitual, vídeo falso ou imagens estáticas simulando gameplay. Quero uma cena 3D realmente jogável, com câmera, controles, colisões, objetos e sistemas funcionando.

**IMPORTANTE:** esta é somente a primeira cena do jogo. Não implemente ainda a escola, a cidade estrangeira, a conspiração, monstros, perseguições ou o restante da campanha.

---

# 1. CONCEITO DO JOGO

Gênero: terror psicológico narrativo, mistério e investigação.

Perspectiva: primeira pessoa.

Direção artística: 3D retrô, inspirado na atmosfera de jogos de terror PS1/PS2, com texturas pixelizadas, modelos simples porém expressivos, iluminação cinematográfica e leve efeito de câmera antiga.

Contexto narrativo: o protagonista é um adolescente prestes a viajar para outro país para um intercâmbio. Ele ainda está em sua casa, vivendo seus últimos momentos de normalidade antes da viagem.

A primeira cena deve transmitir tranquilidade cotidiana e criar identificação com o protagonista. Nenhum acontecimento sobrenatural deve ocorrer neste protótipo.

A intenção é estabelecer contraste entre um começo familiar e os futuros eventos perturbadores.

---

# 2. ABERTURA — ACORDANDO NA CAMA

O jogo começa com a tela completamente preta.

É possível ouvir discretamente:

- Pássaros cantando fora da janela.
- Vento suave.
- Sons abafados da casa.
- Um relógio ou ruído ambiente discreto.
- Pequenos sons de movimentação vindos do andar inferior.

Depois de aproximadamente dois segundos, começa a animação de despertar.

## Animação dos olhos

Criar um efeito convincente de abertura e fechamento dos olhos, simulando a visão do protagonista.

Sequência:

1. A tela está escura.
2. As pálpebras começam a se abrir lentamente.
3. O jogador enxerga parcialmente o teto do quarto.
4. Os olhos se fecham novamente por um instante.
5. Abrem uma segunda vez, com visão um pouco mais clara.
6. O protagonista pisca mais uma vez.
7. A câmera estabiliza.

Utilizar animações suaves para a abertura das pálpebras. Não utilizar simplesmente transições abruptas entre tela preta e imagem.

É permitido simular as pálpebras com máscaras escuras animadas sobre a tela.

Adicionar um leve desfoque inicial que desapareça gradualmente.

Não exagerar no efeito para não causar desconforto.

---

# 3. PRIMEIRA FALA — A MÃE CHAMA

Enquanto o protagonista ainda está acordando, sua mãe chama de outro cômodo, no andar de baixo.

Diálogo exato:

**MÃE (fora de cena):**
"Ei, vem tomar café pra não se atrasar!"

A fala deve soar natural, como uma mãe chamando o filho de manhã.

Requisitos:

- Voz feminina adulta em português brasileiro.
- Tom cotidiano e carinhoso, sem interpretação exagerada.
- Áudio espacializado, abafado pela distância e pelas paredes.
- Legenda na parte inferior da tela.
- Identificação da personagem na legenda: MÃE.
- Sem necessidade de modelar a mãe nesta primeira cena.

Caso não seja possível gerar uma voz natural, utilizar um arquivo de áudio substituível e manter a legenda funcional. Não fingir que há dublagem caso o áudio não exista.

---

# 4. O PROTAGONISTA LEVANTA

Após a fala da mãe, o protagonista começa a levantar da cama.

A câmera deve simular movimentos humanos:

1. O personagem olha brevemente para o teto.
2. Vira a cabeça para um dos lados.
3. Inclina o corpo para se sentar na cama.
4. A câmera passa lentamente da posição deitada para sentada.
5. O jogador observa parte do quarto.
6. O personagem coloca os pés no chão.
7. A câmera sobe até a altura normal dos olhos.
8. O controle do jogador é liberado.

Adicionar efeitos sonoros sutis:

- Lençol se movimentando.
- Cama rangendo discretamente.
- Pés tocando o piso.
- Pequeno movimento das roupas.

A animação deve ser cinematográfica, mas relativamente curta.

**Não permitir movimento livre enquanto a animação estiver acontecendo.**

Ao terminar, a transição para o controle deve ser imperceptível, sem teletransporte ou mudança brusca de perspectiva.

---

# 5. O QUARTO DO PROTAGONISTA

Construir um quarto 3D completo, com proporções realistas, típico de um adolescente de aproximadamente 17 anos.

O quarto não pode parecer abandonado, excessivamente vazio ou artificial.

Deve parecer um espaço onde alguém realmente mora.

## Elementos obrigatórios

### Cama
- Cama de solteiro.
- Lençóis e travesseiros.
- Cobertor levemente desarrumado.
- Cabeceira simples.

### Escrivaninha
- Computador ou notebook.
- Teclado e mouse.
- Alguns livros escolares.
- Cadernos.
- Canetas.
- Luminária.
- Pequenos objetos pessoais.

### Guarda-roupa
- Guarda-roupa de madeira.
- Portas e puxadores.
- Uma mochila encostada.
- Algumas roupas visíveis.

### Paredes
- Dois ou três pôsteres.
- Fotografias.
- Quadro ou calendário.
- Interruptor de luz.

### Outros objetos
- Tênis próximo da cama.
- Tapete.
- Cadeira.
- Lixeira.
- Relógio digital.
- Mala de viagem parcialmente preparada.
- Uma pequena estante.
- Livros e caixas organizadas.

### Janela
- Janela com vista para um bairro residencial.
- Luz da manhã entrando no quarto.
- Cortinas.
- Vegetação ou casas ao longe.

A mala de viagem e um documento de intercâmbio sobre a mesa devem sugerir discretamente que o protagonista está prestes a viajar.

Não inserir textos narrativos gigantes ou exposições desnecessárias.

## Distribuição

Posicionar os objetos de forma natural, preservando espaço para caminhar.

Evitar colocar objetos aleatórios em excesso apenas para preencher o cenário.

O quarto deve ter personalidade, mas também boa legibilidade visual.

---

# 6. DIREÇÃO DE ARTE

A estética deve lembrar jogos de terror retrô 3D do começo dos anos 2000.

Características:

- Geometria low-poly bem trabalhada.
- Texturas de baixa ou média resolução.
- Materiais com aparência envelhecida.
- Iluminação quente de manhã.
- Sombras suaves.
- Leve granulação.
- Pequena redução da resolução interna.
- Dithering discreto.
- Cores ligeiramente desbotadas.
- Atmosfera nostálgica.

Não quero um visual extremamente cartoon, cheio de formas arredondadas e cores infantis.

Também não quero gráficos modernos hiper-realistas.

**O objetivo é um 3D retrô convincente, semelhante a jogos antigos de terror, mas com movimento moderno e confortável.**

O filtro retrô não pode deixar o jogo excessivamente borrado. O jogador precisa enxergar os objetos e ler os textos claramente.

A interface deve ser renderizada em resolução nativa, sem pixelização excessiva.

---

# 7. CONTROLES E JOGABILIDADE

A movimentação é uma das maiores prioridades técnicas.

O jogador deve conseguir:

- Andar usando WASD.
- Olhar livremente usando o mouse.
- Correr segurando Shift.
- Interagir usando E.
- Pausar usando Esc.
- Abrir e fechar a porta usando E.
- Olhar para objetos interativos e receber indicações discretas.

## Requisitos da câmera

- Mouse com movimento suave.
- Sem atraso perceptível entre mouse e câmera.
- Sensibilidade configurável.
- Rotação vertical limitada de forma natural.
- Sem tremores.
- Sem mudanças bruscas de velocidade.
- Sem aceleração artificial exagerada.
- Sem travamentos na transição da animação de despertar.
- Pointer Lock quando apropriado.

## Movimentação do personagem

- Aceleração e desaceleração suaves.
- Velocidade de caminhada confortável.
- Corrida moderada.
- Colisões com paredes e móveis.
- Deslizamento natural ao tocar obstáculos.
- Sem atravessar objetos.
- Sem ficar preso em quinas.
- Sem movimento excessivamente flutuante.

Adicionar balanço de câmera muito sutil ao andar, com opção para desativá-lo.

Priorizar responsividade acima de animações exageradas.

---

# 8. SISTEMA DE INTERAÇÃO

Quando o jogador olhar para um objeto interativo e estiver próximo o suficiente, mostrar uma indicação na tela.

Exemplo:

**[E] Abrir porta**

O texto deve surgir próximo ao centro inferior da tela.

## Porta do quarto

A porta precisa ser um objeto 3D com animação real.

Quando o jogador se aproxima:

- Aparece a indicação de interação.
- Ao pressionar E, a maçaneta pode emitir um som.
- A porta gira suavemente sobre a dobradiça.
- O jogador pode atravessar a abertura.
- Pressionar E novamente fecha a porta.

A colisão deve acompanhar o estado da porta.

Não criar uma porta que apenas desaparece ou teletransporta o jogador.

Adicionar sons discretos de maçaneta e madeira.

---

# 9. INTERFACE DO JOGO

A interface deve ser minimalista, elegante e adequada ao terror narrativo.

Não quero uma tela cheia de contadores, minimapas, moedas ou informações desnecessárias.

## Elementos permanentes

**Mira central:** pequeno ponto branco com opacidade reduzida.

**Barra de objetivo:** localizada no canto superior esquerdo.

Depois que o protagonista termina de levantar, mostrar:

NOVA MISSÃO

**Desça para o café**

A mensagem aparece com uma animação curta, acompanhada de um som discreto.

Depois de alguns segundos, a apresentação reduz para um painel compacto.

## Legendas

Legendas na parte inferior central, com tipografia clara e contraste adequado.

Exemplo:

MÃE: Ei, vem tomar café pra não se atrasar!

## Interações

Exibir:

[E] Abrir porta

[E] Examinar mala

[E] Acender luz

Utilizar transições rápidas e suaves.

## Pausa

Menu simples com:

- Continuar.
- Configurações.
- Reiniciar cena.

---

# 10. OBJETOS EXAMINÁVEIS

Adicionar três interações opcionais no quarto.

### Mala de viagem

O jogador pode examinar a mala parcialmente preparada.

Texto curto:

"Quase tudo pronto para a viagem."

### Calendário

O calendário possui uma data marcada indicando o intercâmbio.

### Fotografia

Uma fotografia do protagonista com seus pais.

Texto curto:

"Vou sentir falta de casa."

Essas interações devem ser opcionais.

Não impedir o jogador de sair do quarto por não examiná-las.

---

# 11. CORREDOR E ESCADA

Ao abrir a porta, o jogador encontra um corredor residencial comum.

Adicionar:

- Piso de madeira ou revestimento doméstico.
- Quadros nas paredes.
- Portas fechadas.
- Iluminação natural.
- Uma escada que leva ao piso inferior.
- Sons abafados vindos da cozinha.

O corredor deve ter geometria real, iluminação adequada e colisões funcionais.

O jogador consegue andar pelo corredor e começar a descer a escada.

Não precisamos criar a cozinha inteira neste protótipo.

---

# 12. FINAL DA PRIMEIRA CENA

A missão principal é:

**Desça para o café.**

Quando o jogador alcançar o último degrau da escada, considerar a primeira cena concluída.

Exibir discretamente:

**OBJETIVO CONCLUÍDO**

Desça para o café

Depois, realizar uma transição suave para uma tela simples:

**Fim do Protótipo 01 — O Despertar**

Não abrir uma segunda missão nem inventar eventos sobrenaturais.

O propósito deste protótipo é verificar o padrão visual e técnico.

---

# 13. ÁUDIO E ATMOSFERA

Implementar ambientação sonora coerente:

- Pássaros ao longe.
- Ruídos leves de vento.
- Sons domésticos.
- Movimento do lençol.
- Passos sobre madeira.
- Porta abrindo.
- Pequenos rangidos.
- Sons da cozinha à distância.

O áudio deve contribuir para a sensação de casa habitada.

Evitar música assustadora ou sustos nesta primeira cena.

O jogo começa em uma manhã aparentemente tranquila.

---

# 14. IMPLEMENTAÇÃO TÉCNICA

Priorizar uma arquitetura simples e organizada.

Se não existir uma engine definida no projeto, utilizar uma solução compatível com desenvolvimento 3D no navegador, como Babylon.js com TypeScript e Vite.

Implementar componentes separados para:

- Controle do jogador.
- Câmera.
- Sequência cinematográfica inicial.
- Interações.
- Portas.
- Missões.
- Interface.
- Áudio.
- Ambiente 3D.
- Configurações gráficas.

É permitido utilizar modelos 3D gratuitos com licença compatível ou criar geometria personalizada.

Não utilizar imagens 2D fingindo que são objetos tridimensionais navegáveis.

Não usar recursos protegidos por direitos autorais sem licença.

Não depender de APIs pagas para executar a cena.

Priorizar funcionamento no navegador de computador nesta primeira versão.

---

# 15. DESEMPENHO

Objetivo técnico:

- Buscar 60 FPS estáveis no computador de referência.
- Evitar travamentos durante movimentação.
- Otimizar texturas.
- Evitar geometrias desnecessariamente complexas.
- Minimizar draw calls quando possível.
- Não carregar modelos pesados sem necessidade.

A meta de FPS deve ser verificada com medições reais.

Adicionar um indicador opcional de desempenho para testes, oculto durante a experiência normal.

---

# 16. CRITÉRIOS DE ACEITAÇÃO

O protótipo só pode ser considerado concluído quando:

1. A cena carrega sem erros críticos.
2. O jogador começa deitado na cama.
3. A animação de abrir e fechar os olhos funciona.
4. A mãe chama o protagonista.
5. A legenda corresponde à fala.
6. O jogador levanta naturalmente.
7. A missão aparece no canto superior esquerdo.
8. O quarto possui os objetos descritos.
9. A câmera funciona corretamente com mouse.
10. A movimentação WASD é fluida.
11. O jogador não atravessa móveis e paredes.
12. A porta abre e fecha corretamente.
13. Os objetos opcionais podem ser examinados.
14. O corredor e a escada são exploráveis.
15. A missão termina ao descer as escadas.
16. O jogo possui a estética retrô solicitada.
17. O desempenho é medido em execução real.
18. Não existem erros críticos no console.
19. A cena foi realmente executada e testada, não apenas compilada.

---

# 17. REGRAS DE DESENVOLVIMENTO

Não implementar sistemas além do escopo descrito.

Não adicionar monstros, perseguições, inventário complexo, multiplayer, sistema de combate, cidade aberta ou novos capítulos.

Não transformar o protótipo em um projeto enorme.

Não sacrificar a qualidade da movimentação para adicionar objetos decorativos.

Não utilizar elementos visuais genéricos ou improvisados como solução final quando comprometerem significativamente a qualidade.

Se alguma funcionalidade não puder ser implementada corretamente, registrar a limitação com clareza.

Não afirmar que o protótipo foi testado sem executar os testes.

---

# RESULTADO ESPERADO

Entregar uma primeira cena de terror narrativo retrô em 3D, totalmente jogável, com:

- Despertar cinematográfico em primeira pessoa.
- Chamada natural da mãe.
- Quarto de adolescente detalhado e coerente.
- Interface minimalista.
- Missão "Desça para o café".
- Movimentação muito fluida.
- Objetos interativos.
- Porta animada.
- Corredor e escada exploráveis.
- Iluminação e atmosfera PS1/PS2.
- Finalização da primeira missão.

A experiência deve parecer o começo de um jogo de terror independente cuidadosamente desenvolvido, não uma demonstração técnica vazia.

**Prioridade absoluta: qualidade da primeira experiência, controles responsivos e atmosfera convincente.**