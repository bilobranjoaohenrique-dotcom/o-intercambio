# INTERCÂMBIO — PROMPT MASTER 06
## OTIMIZAÇÃO DA COZINHA E ANIMAÇÃO DOS PAIS
### Babylon.js • TypeScript • Estilo retrô PS1/PS2

## 1. OBJETIVO

Sua tarefa é aprimorar a cozinha já existente no jogo INTERCÂMBIO, deixando o ambiente um pouco mais compacto e adicionando animações naturais ao pai e à mãe do protagonista.

**ATENÇÃO: NÃO RECRIE A COZINHA DO ZERO.**

A cozinha já possui móveis, texturas, iluminação, personagens e objetos. Preserve o trabalho existente e modifique somente o necessário.

Utilize as duas imagens anexadas como referência:

- **Imagem 1:** aparência definitiva dos modelos 3D do pai e da mãe.
- **Imagem 2:** organização da cozinha, posições dos personagens, animações e interações.

O objetivo é entregar uma cena convincente, funcional e visualmente consistente com o restante do jogo.

---

## 2. REGRA DE EFICIÊNCIA — IMPORTANTE

**Execute esta tarefa da maneira mais eficiente possível, sem comprometer a qualidade.**

O desenvolvimento anterior demorou excessivamente para alterações relativamente pequenas. Desta vez, priorize mudanças localizadas e verificações objetivas.

Siga estas regras:

1. Inspecione apenas os arquivos relevantes para a cozinha, personagens e sistema de interação.
2. Reutilize os modelos, materiais, animações e sistemas já existentes sempre que possível.
3. Não refatore o projeto inteiro.
4. Não reconstrua ambientes que já estão funcionando.
5. Não faça múltiplas tentativas de implementação sem avaliar o erro específico.
6. Não execute testes repetitivos sem uma justificativa técnica.
7. Não realize pesquisas externas desnecessárias.
8. Não instale bibliotecas novas se as existentes forem suficientes.
9. Não gaste tempo produzindo documentação extensa.
10. Priorize implementação, qualidade visual e funcionamento real.

**Faça uma implementação bem-feita na primeira abordagem, baseada na estrutura atual do projeto.**

Não substitua modelos bons por placeholders apenas para acelerar.

Se encontrar um problema complexo, escolha a solução mais simples que preserve a qualidade e registre a limitação.

### Verificação proporcional à tarefa

Ao terminar:

- Execute o build uma vez.
- Se houver erro, corrija a causa e execute novamente.
- Faça um teste funcional do fluxo da cozinha.
- Capture uma imagem real da cena final.

Não execute dezenas de testes, não repita verificações que já passaram e não realize testes extensivos de outras cenas sem motivo.

**Rapidez não significa entregar algo incompleto. Significa evitar trabalho desnecessário.**

---

## 3. REDUZIR LEVEMENTE O TAMANHO DA COZINHA

A cozinha atual está visualmente interessante, mas apresenta espaço vazio excessivo entre a mesa e algumas paredes.

Queremos um ambiente mais compacto, acolhedor e proporcional à família.

### Alterações permitidas

- Reduzir moderadamente a área livre do piso.
- Aproximar alguns móveis quando necessário.
- Reorganizar a mesa e as cadeiras.
- Ajustar as paredes apenas se a arquitetura permitir.
- Manter proporções realistas.
- Preservar a circulação do jogador.
- Manter a cozinha conectada à sala de estar.

Use aproximadamente **4,20 × 3,60 metros como referência**, somente se isso for compatível com a geometria existente.

Não reduza indiscriminadamente a escala dos móveis ou personagens.

Não mova a cozinha inteira para uma posição que prejudique sua conexão com os outros cômodos.

### Preservar

- Armários.
- Geladeira.
- Fogão.
- Pia.
- Janela.
- Cortinas.
- Mesa de café.
- Cadeiras.
- Alimentos.
- Texturas.
- Iluminação.
- Demais objetos existentes.

A cozinha deve continuar parecendo a mesma, apenas mais confortável e menos vazia.

---

## 4. MODELOS 3D DOS PAIS

Utilize a primeira imagem anexada como referência visual.

Se os modelos atuais forem suficientemente próximos, melhore-os em vez de substituí-los completamente.

### PAI

Aparência:

- Homem brasileiro de aproximadamente 45–50 anos.
- Cabelo escuro curto, com alguns fios grisalhos.
- Bigode discreto.
- Rosto adulto, proporções naturais.
- Camisa casual de manga curta, com estampa xadrez discreta.
- Calça escura.
- Sapatos simples.
- Expressão tranquila e carinhosa.

Posição inicial:

**Sentado à mesa do café da manhã.**

Deve possuir postura relaxada e olhar naturalmente para quem estiver conversando.

### MÃE

Aparência:

- Mulher brasileira de aproximadamente 42–48 anos.
- Cabelo castanho-escuro, levemente ondulado.
- Rosto expressivo e acolhedor.
- Roupa doméstica florida.
- Avental claro.
- Calçados simples.
- Proporções humanas coerentes.

Posição inicial:

**Em pé, perto da mesa, preparando ou servindo café.**

Ela deve parecer ocupada com uma atividade doméstica real, sem ficar completamente imóvel.

### Requisitos

- Manter estética 3D retrô PS1/PS2.
- Usar texturas adequadas.
- Evitar rostos sem expressão.
- Evitar personagens formados apenas por cubos.
- Preservar colisões e posições coerentes.
- Não adicionar o modelo do protagonista na cena, pois o jogo é em primeira pessoa.

---

## 5. ANIMAÇÕES NATURAIS — PAI

O pai deve permanecer sentado durante a conversa.

Implementar animações sutis de:

- Respiração.
- Pequenos movimentos da cabeça.
- Mudanças leves de postura.
- Movimentos das mãos sobre a mesa.
- Gesticulação ocasional enquanto fala.
- Olhar direcionado ao protagonista durante o diálogo.

Não exagerar nos movimentos.

Evitar braços atravessando a mesa, movimentos robóticos ou animações repetidas em ciclos muito curtos.

Os gestos devem variar suavemente e fazer sentido em relação à fala.

---

## 6. ANIMAÇÕES NATURAIS — MÃE

A mãe deve permanecer em pé durante a maior parte do café da manhã.

Implementar:

- Respiração.
- Mudanças suaves de postura.
- Pequenos movimentos da cabeça.
- Movimentos naturais dos braços.
- Gestos durante as falas.
- Olhar direcionado ao protagonista.
- Movimento simples de servir café quando apropriado.

Utilizar animações leves, com transições suaves.

Não implementar sistemas de animação cinematográfica desnecessariamente complexos.

O objetivo é dar vida aos personagens, não transformar a cena em uma produção de captura de movimento.

---

## 7. MOVIMENTO DE BOCA DURANTE DIÁLOGOS

**Este requisito é obrigatório.**

Quando o pai ou a mãe estiverem falando através das legendas, o personagem correspondente deve mover a boca.

O jogo NÃO possui dublagem.

Portanto, sincronize a animação de fala com o estado e a duração do texto na tela.

### Funcionamento

Quando o pai começa a falar:

- Iniciar movimento de boca do pai.
- Ativar gestos ocasionais.
- Direcionar o olhar ao protagonista.
- Interromper o movimento de boca ao finalizar a fala.

Quando a mãe começa a falar:

- Executar o mesmo sistema para ela.
- Manter o pai em animação de repouso.

### Implementação

Utilize o método mais eficiente compatível com os modelos existentes:

- Morph targets, caso disponíveis.
- Ossos faciais, caso disponíveis.
- Animação simples da mandíbula, quando apropriada.

Não desenvolver um sistema complexo de sincronização fonética para uma cena sem áudio.

Evitar que os dois personagens movimentem a boca simultaneamente quando apenas um estiver falando.

---

## 8. EXPRESSÕES FACIAIS

Adicionar expressões discretas, compatíveis com os recursos dos modelos.

### Pai

- Neutro.
- Atenção.
- Leve sorriso.
- Expressão carinhosa.

### Mãe

- Neutra.
- Sorriso acolhedor.
- Atenção.
- Leve preocupação pela viagem do filho.

As expressões devem acompanhar o contexto do diálogo, sem exageros.

Não é necessário um sistema avançado de emoções.

---

## 9. INTERAÇÃO — SENTAR À MESA

O protagonista deve entrar na cozinha em primeira pessoa e conseguir se sentar para tomar café com os pais.

Quando estiver próximo à cadeira destinada ao jogador:

**[E] Sentar à mesa**

Ao pressionar E:

1. Desabilitar temporariamente o deslocamento normal.
2. Mover suavemente a câmera até a posição sentada.
3. Ajustar a altura dos olhos.
4. Manter a visão em primeira pessoa.
5. Permitir que o jogador olhe para o pai e para a mãe.
6. Iniciar ou continuar o diálogo do café da manhã conforme o sistema existente.

Não exibir o corpo completo do protagonista.

Evitar transição brusca de câmera ou teletransporte visual.

Ao terminar a conversa, permitir que o protagonista se levante e retome a movimentação normal.

Reutilizar o sistema de sentar, caso já exista.

---

## 10. DIÁLOGO E CONTINUIDADE DA HISTÓRIA

A cena acontece na manhã em que o protagonista está prestes a viajar para os Estados Unidos.

O diálogo deve transmitir despedida, carinho e expectativa.

Preservar as falas existentes que já estiverem aprovadas.

**Ao final do café da manhã, a mãe deve pedir ao protagonista para subir e buscar sua mala.**

Sugestão de fala, somente se ainda não existir diálogo equivalente:

**MÃE:**
"Filho, termina de comer e sobe pra pegar tua mala. A gente já vai te esperar no carro."

Depois da fala:

- Encerrar naturalmente a interação da mesa.
- Permitir que o jogador se levante.
- Atualizar o objetivo da missão para buscar a mala no quarto.

**NÃO IMPLEMENTAR NESTA TAREFA a garagem, o carro, o aeroporto ou a viagem.**

Não criar transições de cena adicionais.

Apenas preparar a continuidade narrativa até o objetivo de buscar a mala.

---

## 11. PRESERVAÇÃO DOS OUTROS AMBIENTES

Não modificar:

- Quarto do protagonista.
- Corredor.
- Escada.
- Sala de estar.
- Banheiro.
- Lavanderia.
- Garagem.
- Aeroporto.
- Avião.
- Cidade.
- Outros capítulos.

Não alterar os sistemas globais de iluminação, movimento, diálogos ou missões sem necessidade.

Mudanças compartilhadas estritamente necessárias devem ser compatíveis com os comportamentos existentes.

---

## 12. TESTES FINAIS — RÁPIDOS E OBJETIVOS

Realizar uma verificação funcional do seguinte percurso:

**Entrar na cozinha → aproximar-se da mesa → sentar → conversar com os pais → observar gestos e movimentos de boca → ouvir a mãe pedir a mala → levantar.**

Verificar:

- A cozinha não ficou apertada demais.
- Os móveis continuam acessíveis.
- Os personagens não atravessam objetos.
- O pai permanece sentado.
- A mãe permanece em pé.
- Os gestos parecem naturais.
- A boca se move apenas durante as falas correspondentes.
- A câmera sentada funciona.
- O jogador consegue se levantar.
- O objetivo de buscar a mala é atualizado corretamente.
- O jogo compila sem erros.

Apresentar uma captura real da cozinha com os dois personagens.

Não realizar uma bateria extensa de testes de outros capítulos.

---

## 13. ENTREGA FINAL

Entregar:

1. Cozinha ajustada e mais compacta.
2. Modelos dos pais coerentes com a referência visual.
3. Animações leves de repouso e gesticulação.
4. Movimento de boca vinculado aos diálogos.
5. Expressões faciais discretas.
6. Interação funcional de sentar e levantar.
7. Continuidade narrativa para buscar a mala.
8. Build funcional.
9. Uma captura real da cena.
10. Resumo breve dos arquivos modificados e dos testes realizados.

Se alguma funcionalidade não puder ser concluída, informe claramente o motivo e não a declare pronta.

---

# INSTRUÇÃO FINAL

**Trabalhe com eficiência, mas entregue qualidade.**

Não desperdice tempo reconstruindo aquilo que já está pronto.

Não faça alterações fora do escopo.

Não execute testes repetitivos sem necessidade.

Não substitua bons modelos por geometria provisória.

A prioridade é transformar a cozinha existente em uma cena de café da manhã mais compacta, acolhedora e viva, com pais expressivos e interações naturais.

**QUERO UMA CENA BEM-FEITA, FUNCIONAL E FIEL ÀS DUAS IMAGENS, COM O MÍNIMO DE TRABALHO DESNECESSÁRIO.**