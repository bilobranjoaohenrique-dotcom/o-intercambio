# Fontes e licenças — O Intercâmbio

O cenário, os modelos e as texturas desta primeira cena foram criados por código para este projeto. Não há modelos ou imagens de outros jogos, nem acesso a APIs de cobrança durante a execução.

| Componente | Uso | Licença |
| --- | --- | --- |
| [Babylon.js](https://github.com/BabylonJS/Babylon.js) | Motor 3D no navegador | Apache-2.0 |
| [TypeScript](https://github.com/microsoft/TypeScript) | Desenvolvimento | Apache-2.0 |
| [Vite](https://github.com/vitejs/vite) | Desenvolvimento e build | MIT |
| [Playwright](https://github.com/microsoft/playwright) | Verificação no navegador | Apache-2.0 |
| [pngjs](https://github.com/pngjs/pngjs) | Inspeção de imagens nos testes | MIT |

As versões exatas constam em package-lock.json. As ferramentas de desenvolvimento e testes não são carregadas pela cena em produção.

A licença redistribuível do motor está em [BabylonJS-Apache-2.0.txt](public/licenses/BabylonJS-Apache-2.0.txt).

## Voz provisória

A frase da mãe está em um WAV local, gerado com eSpeak-NG em português brasileiro e voz de teste feminina. **É uma voz sintética provisória**, não uma gravação humana ou uma alegação de dublagem natural. O arquivo é substituível por gravação licenciada da mesma frase. Veja [origem, hashes e substituição](public/audio/README.md) e [áudio da cena](docs/AUDIO-PROTOTIPO-01.md).

A ferramenta de autoria e seus dados não precisam ser instalados para jogar. A licença e a procedência da ferramenta estão preservadas junto ao arquivo de áudio. Pássaros, vento, movimentos, passos e outros efeitos são sintetizados localmente para este projeto.
