# INTERCÂMBIO — PROMPT MASTER 09
## TRANSIÇÃO DA GARAGEM PARA O AEROPORTO E CENA DE DESPEDIDA
### Babylon.js • TypeScript • Terror psicológico retrô PS1/PS2

## 1. OBJETIVO PRINCIPAL

Implementar a sequência em que o protagonista entra no carro da família, o portão da garagem começa a abrir, a tela escurece e o jogador aparece diretamente no aeroporto brasileiro, diante dos pais, para a despedida antes do embarque.

**Utilize as duas imagens anexadas como referências visuais obrigatórias para a cena do aeroporto.**

A primeira imagem representa exatamente como o jogador deve enxergar a cena.

A segunda contém informações sobre o ambiente, personagens, iluminação, câmera e elementos necessários.

O resultado deve ser uma cena 3D real e funcional dentro do jogo, não apenas uma imagem estática.

### REGRA ABSOLUTA

**TODO O JOGO CONTINUA EM PRIMEIRA PESSOA.**

Não mostrar:
- Cabeça do protagonista.
- Cabelo.
- Ombros.
- Costas.
- Mochila.
- Corpo inteiro.
- Modelo do protagonista na frente da câmera.

A câmera representa diretamente os olhos do jogador.

---

## 2. PRESERVAÇÃO DO PROJETO

Não recriar nem modificar os ambientes existentes:

- Quarto do protagonista.
- Corredor superior.
- Escada.
- Sala de estar.
- Cozinha.
- Lavanderia.
- Banheiro.
- Garagem, exceto a animação do portão e a interação com o carro.
- Modelos dos pais já aprovados.

Não alterar os diálogos existentes sem necessidade.

Não reconstruir o jogo.

Modificar apenas os arquivos necessários para a transição e a nova cena de despedida.

---

## 3. INÍCIO — PROTAGONISTA NA GARAGEM

A sequência começa quando o protagonista já terminou o café da manhã, subiu para buscar a mala e retornou à garagem.

Os pais já devem estar sentados dentro do carro:

**Pai:** banco do motorista.

**Mãe:** banco dianteiro do passageiro.

O jogador se aproxima do carro.

Exibir:

**[E] Entrar no carro**

A interação só deve iniciar a viagem se a missão de buscar a mala estiver concluída.

Se ainda não estiver:

"Ainda preciso pegar minha mala."

Quando o jogador pressionar E com a mala coletada, iniciar a sequência.

---

## 4. ANIMAÇÃO DE SAÍDA DA GARAGEM

Após interagir com o carro:

1. Desabilitar temporariamente o movimento do jogador.
2. Iniciar uma breve transição para uma câmera em primeira pessoa dentro do carro ou diretamente para o efeito de saída, utilizando a solução mais simples que combine com o projeto.
3. Reproduzir o som do motor ligando.
4. Iniciar a abertura do portão da garagem.
5. Mostrar o portão começando a subir ou abrir, conforme o modelo já existente.
6. Reproduzir o som correspondente.
7. Escurecer a tela suavemente.
8. Carregar a cena do aeroporto.

**Não é necessário dirigir o carro para fora da garagem.**

O objetivo é apenas transmitir que a família começou a viagem.

A animação deve ser curta, natural e visualmente coerente.

Se o portão existente abrir por folhas laterais, respeitar esse mecanismo em vez de substituí-lo por um portão vertical.

Não desenvolver física veicular, trânsito ou ruas.

---

## 5. TRANSIÇÃO CINEMATOGRÁFICA

Utilizar uma transição suave para preto.

Durante a transição, reproduzir brevemente sons do carro e, em seguida, uma ambiência de aeroporto.

Não deixar o jogador enxergar o carregamento dos objetos.

A nova cena deve aparecer completamente carregada.

A transição precisa ser curta e funcional.

**NÃO CRIAR A VIAGEM DE CARRO PELAS RUAS.**

---

# 6. CENA DO AEROPORTO — REFERÊNCIA VISUAL

Criar uma área compacta de aeroporto internacional brasileiro, na região de despedida antes do embarque.

A composição deve se aproximar da primeira imagem anexada.

### Enquadramento

O jogador aparece parado, em primeira pessoa, olhando diretamente para os pais.

Os pais devem ocupar o primeiro plano.

Ao fundo, aparecem:

- Placa de embarque.
- Painel de partidas.
- Bancos metálicos.
- Balcão de atendimento.
- Separadores de fila.
- Janelas grandes.
- Avião estacionado.
- Alguns passageiros de fundo.

Não construir um aeroporto inteiro.

Criar somente a área necessária para a cena de despedida e uma pequena passagem de embarque.

### Correção de ambientação

Este é o aeroporto de partida no Brasil, antes da viagem aos Estados Unidos.

Portanto, não utilizar uma bandeira americana para identificar o terminal brasileiro.

Utilizar sinalização coerente com um aeroporto brasileiro, com informações em português e inglês quando apropriado.

---

## 7. ARQUITETURA DO AEROPORTO

### Piso

- Piso de cerâmica ou material polido.
- Tons cinza e bege.
- Reflexos moderados.
- Textura de baixa resolução compatível com PS1/PS2.

### Paredes e pilares

- Revestimentos simples.
- Pilares retangulares.
- Acabamentos típicos de terminais dos anos 2000.

### Teto

- Placas modulares.
- Luminárias fluorescentes.
- Iluminação uniforme.

### Janelas

- Grandes painéis de vidro.
- Estruturas metálicas.
- Visão externa da área de aeronaves.

### Avião externo

Criar apenas o trecho visível pelas janelas.

Não é necessário um aeroporto externo completo nem uma aeronave extremamente detalhada.

Um modelo low-poly convincente é suficiente.

---

## 8. PLACAS E SINALIZAÇÃO

Criar um painel de partidas semelhante ao da referência.

Texto sugerido:

**PARTIDAS INTERNACIONAIS**

Voo: AA980

Destino: Nova York (JFK)

Status: EMBARQUE

Criar também uma placa:

**PORTÃO / GATE 24**

O número 24 deve ser grande e facilmente reconhecível.

As informações são fictícias e servem à narrativa; não é necessário consultar voos reais.

As placas devem utilizar texturas ou fontes legíveis, compatíveis com o estilo retrô.

---

## 9. PERSONAGENS — PAI E MÃE

Utilizar os modelos aprovados dos pais.

Não substituir os personagens por modelos diferentes.

### PAI

Aparência:

- Aproximadamente 45–50 anos.
- Cabelo escuro com alguns fios grisalhos.
- Bigode.
- Camisa polo bege listrada.
- Calça escura.
- Relógio.
- Expressão carinhosa e preocupada.

### MÃE

Aparência:

- Aproximadamente 42–48 anos.
- Cabelo castanho-escuro na altura dos ombros.
- Blusa florida.
- Cardigã vinho ou vermelho-escuro, adequado à viagem.
- Expressão emocionada e acolhedora.

Ambos devem estar próximos do jogador.

### Animações

Implementar:

- Pequenos movimentos da cabeça.
- Respiração.
- Expressões faciais suaves.
- Gestos ocasionais com as mãos.
- Movimento de boca durante as legendas.
- Olhar voltado para o protagonista.

Não criar animações exageradas.

Não gerar vozes nem dublagem.

---

# 10. DIÁLOGO DA DESPEDIDA

Ao chegar ao aeroporto, iniciar uma conversa com os pais.

Manter o jogador em primeira pessoa.

### MÃE

"Meu filho... parece que foi ontem que você era pequeno."

### PROTAGONISTA

"Mãe, não começa..."

### MÃE

"Eu sei, eu sei. É que vou sentir muita saudade."

### PAI

"Você vai viver uma experiência incrível. Aproveita cada momento."

### PROTAGONISTA

"Vou tentar."

### PAI

"E lembra de uma coisa: não importa o que acontecer, você sempre pode contar com a gente."

### MÃE

"Me liga assim que chegar, tá? Não esquece."

### PROTAGONISTA

"Pode deixar. Amo vocês."

### MÃE

"A gente também te ama."

Após o diálogo, criar uma pequena pausa emocional.

A mãe pode aproximar-se levemente da câmera, sugerindo um abraço de despedida, usando uma animação simples.

Não mostrar o corpo do protagonista.

O pai pode colocar a mão próxima à câmera para representar um gesto de carinho, sem atravessar o enquadramento.

Preservar o tom natural e familiar.

---

## 11. SISTEMA DE DIÁLOGO

Reutilizar o sistema existente no INTERCÂMBIO.

A interface deve apresentar:

- Nome do personagem.
- Texto da fala.
- Indicador para continuar.
- Fonte retrô.
- Caixa de diálogo na parte inferior.

Permitir avançar utilizando o comando já existente.

Não criar um novo sistema de diálogo do zero.

Não utilizar sintetização de voz.

---

## 12. INTERAÇÃO APÓS A DESPEDIDA

Quando a conversa terminar, atualizar a missão:

**"Dirija-se ao portão de embarque."**

Permitir que o jogador retome o movimento em primeira pessoa.

O portão 24 deve estar visível e acessível.

Ao se aproximar:

**[E] Embarcar**

Ao interagir:

- Verificar se a despedida foi concluída.
- Iniciar uma transição suave para preto.
- Encaminhar para a cena do avião, caso já exista.
- Se não existir, criar somente um ponto de transição preparado para a futura implementação.

**Não construir o interior do avião nesta tarefa.**

---

# 13. ATMOSFERA E ÁUDIO

A cena deve transmitir saudade e expectativa.

Utilizar:

- Ruído ambiente de aeroporto.
- Passos distantes.
- Rodinhas de malas.
- Sons eletrônicos discretos.
- Ruído distante de aeronave.
- Iluminação fluorescente.
- Mistura de luz fria interna e luz externa.

Evitar música dramática exagerada.

Não criar sustos ou acontecimentos sobrenaturais.

O terror psicológico começará a ganhar força após a chegada aos Estados Unidos.

Este momento deve representar a despedida da vida anterior do protagonista.

---

## 14. PERSONAGENS DE FUNDO

Adicionar poucos passageiros low-poly para dar vida ao ambiente.

Não criar sistemas complexos de inteligência artificial.

Utilizar:

- Alguns personagens sentados.
- Alguns caminhando por trajetos curtos.
- Um atendente no balcão.
- Passageiros próximos ao portão.

Reutilizar modelos e animações disponíveis.

Evitar excesso de personagens e objetos.

---

# 15. DESEMPENHO E EFICIÊNCIA

Esta tarefa deve ser executada com eficiência.

### Regras

- Inspecionar apenas os arquivos relevantes.
- Reutilizar o sistema de câmera.
- Reutilizar os personagens.
- Reutilizar o sistema de diálogo.
- Não instalar bibliotecas desnecessárias.
- Não criar um aeroporto enorme.
- Não criar IA avançada para passageiros.
- Não construir a cidade brasileira.
- Não construir a viagem de carro.
- Não refazer cenários existentes.
- Evitar documentação extensa.
- Evitar testes repetitivos sem justificativa.

**Entregar uma cena bonita e funcional, sem transformar uma pequena sequência narrativa em um projeto gigantesco.**

---

# 16. TESTE FUNCIONAL

Executar uma verificação do percurso:

**Garagem → [E] Entrar no carro → portão começa a abrir → tela escurece → aeroporto → diálogo com os pais → portão 24.**

Confirmar:

1. A missão da mala é respeitada.
2. O portão abre corretamente.
3. A transição ocorre sem erros.
4. A câmera permanece em primeira pessoa.
5. Nenhuma parte do protagonista aparece na câmera.
6. Os pais apresentam os modelos corretos.
7. As animações e diálogos funcionam.
8. O aeroporto corresponde às imagens de referência.
9. O portão de embarque está acessível.
10. Os demais ambientes continuam intactos.

Executar o build e corrigir apenas os problemas encontrados.

Não repetir testes que já passaram.

---

# 17. CAPTURA REAL OBRIGATÓRIA

Entregar uma captura da cena real em execução mostrando:

- Visão em primeira pessoa.
- Pai e mãe à frente do jogador.
- Painel de partidas.
- Placa do portão 24.
- Ambiente do aeroporto.
- Interface de diálogo.

A captura não pode mostrar a cabeça, a mochila ou qualquer outra parte do protagonista.

Não utilizar uma imagem gerada por IA como se fosse uma captura real do jogo.

---

# RESULTADO FINAL ESPERADO

Ao entrar no carro na garagem, o protagonista verá o portão começando a abrir.

A tela escurecerá e ele aparecerá diretamente no aeroporto brasileiro, de frente para seus pais, exatamente na perspectiva mostrada nas imagens de referência.

A família terá uma despedida emocionante.

Depois, o jogador poderá caminhar até o portão 24 e iniciar o embarque.

**NÃO CRIAR VIAGEM DE CARRO, RUAS OU CIDADE.**

**NÃO CRIAR O AVIÃO AINDA.**

**NÃO ALTERAR OUTROS CENÁRIOS.**

**NÃO MOSTRAR O PROTAGONISTA EM TERCEIRA PESSOA.**

**PRIORIDADE ABSOLUTA: FIDELIDADE ÀS IMAGENS, PRIMEIRA PESSOA, DESPEDIDA EMOCIONANTE E TRANSIÇÃO FUNCIONAL.**