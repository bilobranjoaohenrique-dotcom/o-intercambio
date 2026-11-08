# INTERCÂMBIO — Guia de reconstrução 3D do quarto

Especificação fornecida pelo usuário para esta etapa. A imagem original do quarto e a prancha multivista enviada na conversa são referências de direção artística; elas não fornecem modelos, malhas, UVs ou texturas originais. As imagens permanecem na conversa e não são incorporadas como fundo do jogo.

## Referências visuais

Manter um único ambiente 3D consistente entre todos os ângulos:

- Cama de solteiro à esquerda da vista da entrada, com roupa de cama xadrez azul.
- Mesa de cabeceira com abajur e relógio digital vermelho, indicando 06:30.
- Escrivaninha sob a janela, com computador CRT, teclado, torre e cadeira.
- Guarda-roupa de madeira à direita da vista da entrada.
- Tapete central e piso de madeira.
- Pôsteres, fotografias, livros, cortinas, planta pendente e mochila.
- Iluminação quente e texturas envelhecidas, com aparência inspirada em PS1/PS2.

Não criar uma sala diferente para cada imagem. Todos os objetos pertencem ao mesmo ambiente, com posições consistentes. Comparar a vista principal da entrada, a vista inversa a partir da janela e as aproximações da cama, escrivaninha, guarda-roupa e prateleiras.

## Dimensões propostas

As medidas são estimativas para orientar a modelagem, não dimensões medidas na imagem original.

| Elemento | Medidas aproximadas |
| --- | --- |
| Quarto | 3,20 × 3,80 m |
| Pé-direito | 2,60 m |
| Cama | 0,90 × 2,00 m |
| Escrivaninha | 1,40 × 0,60 m |
| Guarda-roupa | 1,80 × 0,60 m |
| Porta | 0,80 × 2,10 m |
| Janela indicada na prancha | 1,40 × 1,20 m |

## Interações obrigatórias nesta etapa

1. Porta: abrir e fechar com animação e colisão.
2. Interruptor: acender e apagar a luz.
3. Mala ou mochila: examinar e mostrar uma legenda curta.
4. Fotografia: examinar e mostrar uma lembrança do protagonista.
5. Calendário: consultar a data da viagem.

Preservar a movimentação em primeira pessoa, as colisões, o despertar e a missão de sair do quarto. Preservar também a continuidade do capítulo existente.

## Interações futuras opcionais

- Abrir o guarda-roupa.
- Ligar e examinar o computador.
- Examinar pôsteres e livros.

Não implementar essas interações adicionais antes de concluir a reconstrução visual. Os exemplos de interações desenhados na prancha são sugestões; a lista obrigatória acima delimita esta entrega. Dormir e avançar o tempo não fazem parte desta etapa.

## Materiais e texturas

Criar ou importar materiais adequados para papel de parede, madeira, tecido xadrez, cortinas, tapete, vidro e metal. Não usar cores chapadas como substituto definitivo para texturas. Aplicar UVs adequadas, escala consistente e iluminação coerente.

Criar ou importar os modelos necessários, verificando as licenças e a compatibilidade. A prancha não oferece arquivos GLB ou recursos originais utilizáveis diretamente. Não presumir autorização de uso de modelos ou texturas de terceiros apenas porque aparecem em uma referência.

## Critério de aprovação

Executar o quarto em Babylon.js e produzir capturas reais dos mesmos ângulos da prancha. Comparar composição, escala, materiais, iluminação e detalhes. Não declarar fidelidade visual alcançada sem inspeção das capturas reais.

Separar no relatório o que foi implementado, o que foi efetivamente testado e as diferenças ainda presentes em relação à referência. Não prometer cópia exata a partir apenas das imagens. Diálogos continuam exclusivamente por texto, sem vozes ou TTS.
