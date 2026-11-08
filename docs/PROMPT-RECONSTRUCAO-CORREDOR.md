# INTERCÂMBIO — RECONSTRUÇÃO 3D DO CORREDOR E ESCADA
## Prompt profissional para o Codex

Você é um desenvolvedor sênior de jogos 3D, especialista em Babylon.js, TypeScript, level design, arquitetura de ambientes, iluminação e estética de terror retrô PS1/PS2.

Sua tarefa é **reconstruir visualmente o corredor do segundo andar e a escada que leva à cozinha**, utilizando as imagens de referência anexadas.

**ESCOPO OBRIGATÓRIO: APENAS CORREDOR E ESCADA.**

Não modificar o quarto, a cozinha, os personagens, o aeroporto, o avião ou outras cenas.

## 1. Objetivo

Transformar o corredor atual em um ambiente residencial convincente, detalhado e explorável, mantendo o estilo visual já aprovado para o quarto do protagonista.

O corredor deve parecer parte da mesma casa brasileira do início dos anos 2000.

Não quero um corredor vazio feito com cubos, paredes lisas e materiais genéricos.

## 2. Estrutura do ambiente

Reproduzir a composição apresentada nas referências:

- Corredor estreito e comprido no segundo andar.
- Porta do quarto do protagonista em uma extremidade.
- Piso de madeira com textura.
- Paredes bege com papel de parede discreto.
- Rodapés brancos.
- Portas laterais de madeira.
- Tapete comprido sobre o piso.
- Luminária no teto.
- Quadros familiares e paisagens nas paredes.
- Janela com cortina rendada.
- Pequeno aparador de madeira.
- Telefone residencial antigo.
- Vasos de plantas.
- Escada de madeira descendo em direção à cozinha.
- Corrimão com balaústres e postes de sustentação.

**Não incluir o quadro individual da menina.** Substituí-lo por um quadro neutro de paisagem ou uma fotografia familiar.

A disposição deve ser consistente nos diferentes ângulos da referência.

## 3. Dimensões aproximadas

Usar como ponto de partida:

| Elemento | Medida |
|---|---|
| Corredor | 1,40 × 4,50 m |
| Pé-direito | 2,60 m |
| Porta | 0,80 × 2,10 m |
| Largura da escada | 0,90 m |
| Altura de cada degrau | Aproximadamente 17 cm |

Ajustar as medidas apenas quando necessário para conectar o corredor ao quarto e à cozinha existentes.

**Não deslocar ou reconstruir outros ambientes para encaixar o corredor.**

## 4. Modelos 3D e texturas

Criar ou importar modelos 3D adequados para:

- Portas com molduras, painéis e maçanetas.
- Corrimão completo.
- Degraus de madeira.
- Aparador.
- Telefone antigo.
- Luminárias.
- Molduras.
- Vasos e plantas.
- Cortinas.

Aplicar materiais com texturas apropriadas:

- Madeira envernizada no piso.
- Madeira mais escura no corrimão.
- Papel de parede bege com padrão discreto.
- Tecido no tapete.
- Pintura branca nos rodapés.
- Vidro e tecido na janela.

Utilizar UVs coerentes, evitando texturas esticadas.

Não substituir os objetos por cubos sem detalhes.

Priorizar modelos `.glb`/`.gltf` compatíveis com Babylon.js, com licenças adequadas quando externos.

## 5. Iluminação e atmosfera

A cena ocorre durante a manhã.

Criar:

- Luz natural suave pela janela.
- Iluminação quente das luminárias internas.
- Sombras coerentes.
- Contraste moderado.
- Atmosfera doméstica, acolhedora e nostálgica.

Manter o estilo de terror retrô PS1/PS2 por meio de geometria, materiais, iluminação e texturas.

Não tentar esconder imperfeições com excesso de granulação ou desfoque.

## 6. Jogabilidade e interações

Preservar a movimentação em primeira pessoa já implementada.

O jogador deve conseguir:

- Sair do quarto.
- Caminhar pelo corredor.
- Olhar livremente.
- Aproximar-se das portas.
- Descer a escada naturalmente.
- Chegar à cozinha sem travamentos.

Interações necessárias:

**Porta do quarto:** abrir e fechar normalmente.

**Interruptor do corredor:** acender e apagar a iluminação.

As outras portas podem permanecer fechadas, desde que não apresentem comandos de interação falsos.

Quadros, plantas e telefone são decorativos nesta etapa. Não criar novas missões para eles.

## 7. Colisões

Implementar ou ajustar colisões para:

- Paredes.
- Portas.
- Corrimão.
- Escada.
- Aparador.

A câmera deve acompanhar suavemente a descida dos degraus.

Não permitir que o jogador atravesse o corrimão, caia para fora da escada ou fique preso nas quinas.

## 8. Preservação do projeto

Antes de editar, examine a estrutura do código existente.

**Não modificar:**

- O quarto já aprovado.
- A cozinha.
- O sistema geral de missões.
- A história.
- Os diálogos.
- Os personagens.
- Os controles globais.
- As outras fases.

A missão existente **"Desça para tomar café"** deve continuar funcionando normalmente.

Manter a conexão física entre quarto, corredor, escada e cozinha.

## 9. Validação visual obrigatória

Executar o jogo e gerar capturas reais dos seguintes ângulos:

1. Visão do corredor a partir da porta do quarto.
2. Visão inversa, olhando em direção ao quarto.
3. Detalhe do corrimão e da escada.
4. Vista durante a descida.
5. Detalhes de paredes, quadros, tapete e iluminação.

Comparar as capturas reais com as imagens de referência fornecidas.

Não utilizar imagens geradas por IA como se fossem capturas do jogo.

## 10. Testes técnicos

Verificar:

- Carregamento do corredor.
- Continuidade com o quarto.
- Funcionamento das portas.
- Funcionamento do interruptor.
- Movimento da câmera na escada.
- Colisões.
- Texturas e iluminação.
- Ausência de erros críticos.
- Funcionamento da missão existente.
- Desempenho durante a exploração.

Executar testes e build de produção.

## 11. Entrega

Ao finalizar, informar:

- Arquivos modificados.
- Modelos e texturas utilizados.
- Licenças dos recursos externos.
- Funcionalidades implementadas.
- Testes realmente executados.
- Problemas ainda existentes.

Apresentar as capturas reais solicitadas para aprovação.

**Não alterar outras cenas nem iniciar novas funcionalidades.**

## RESULTADO ESPERADO

Um corredor residencial 3D completo, texturizado, com portas, quadros, tapete, iluminação, objetos domésticos e uma escada de madeira funcional.

O ambiente deve seguir as referências visuais e manter a identidade artística PS1/PS2 do quarto já aprovado.

**Prioridade absoluta: fidelidade visual às referências, integração com o quarto existente e movimentação fluida pela escada.**