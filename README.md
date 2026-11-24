# 🎱 BINGO 75 PRO — Chamador Inteligente com Locutor Virtual

Aplicativo completo e funcional de **Bingo eletrônico de 75 bolas**, feito em HTML5, CSS3 e JavaScript puro (sem frameworks, sem backend). Funciona **100% offline** no navegador, com interface premium (azul-marinho + dourado), locutor virtual em português brasileiro, cadastro de participantes e cartelas, monitoramento automático, alertas de proximidade, detecção de vencedores, pedra maior e modo telão para eventos presenciais.

## ✅ Status
Projeto completo e funcional, testado visualmente (desktop e mobile) e via console do navegador — sem erros de JavaScript. Pronto para uso real em bingos, festas, confraternizações e eventos beneficentes.

## 📂 Estrutura de arquivos
```
index.html              → Estrutura da aplicação (shell único de página)
css/style.css           → Todo o visual premium, animações, tema telão e responsividade
js/numberWords.js       → Conversão número → extenso em PT-BR + mapeamento fonético das letras (B,I,N,G,O)
js/storage.js           → PersistenceManager — leitura/gravação em localStorage, backup/restore
js/settings.js          → SettingsManager — configurações do locutor, intervalo, som, texto de vitória
js/sound.js             → SoundManager — efeitos sonoros sintetizados via Web Audio API (sem arquivos externos)
js/voice.js             → VoiceAnnouncer — locutor virtual via SpeechSynthesis (Web Speech API)
js/players.js           → PlayerManager — CRUD de participantes, pesquisa, import/export CSV
js/cards.js             → CardManager — CRUD de cartelas, validação de grade 5x5, import/export CSV
js/alerts.js            → AlertManager — avaliação de proximidade (3/2/1 números faltando)
js/winner.js            → WinnerDetector — detecção automática de cartelas completas
js/bigstone.js          → BigStoneManager — sorteio de desempate (pedra maior)
js/engine.js            → BingoEngine — motor do sorteio, estados, contagem regressiva, undo
js/ui.js                → ScreenManager — toda a renderização (tabuleiro, bola 3D, modais, telão, toasts)
js/app.js               → Orquestração geral: liga engine + UI + cadastros + configurações
```

## 🧩 Funcionalidades implementadas

### Sorteio e tabuleiro
- Tabuleiro completo 1–75 em 5 colunas coloridas (B azul, I vermelho, N amarelo, G verde, O roxo), todos os números visíveis desde o início.
- Sorteio aleatório sem repetição (algoritmo de shuffle Fisher-Yates), com pool decrescente.
- Animação de bola 3D (giro na urna → revelação com cor da coluna).
- Marcação automática no tabuleiro, histórico cronológico, destaque da bola atual.
- Sorteio automático e manual, pausar/continuar, finalizar, novo jogo (com confirmação), desfazer último sorteio (com confirmação).
- Contagem regressiva visual (anel de progresso) configurável, com opção "intervalo após a narração".

### Locutor virtual (VoiceAnnouncer)
- Usa `SpeechSynthesis` (Web Speech API) com seleção de voz pt-BR (prioriza voz masculina quando disponível).
- Anuncia cada bola no formato **"Letra, número [extenso]!"** (ex.: "Bê, número sete!", "Êne, número quarenta e cinco!").
- Fila de fala: nunca sobrepõe narrações; aguarda término antes da próxima bola (exceto sorteio manual).
- Painel de configurações completo: ativar/desativar, escolha de voz, velocidade, tonalidade, volume, delay antes da fala, testar voz, repetir última chamada, silenciar instantâneo.
- Anuncia vitórias (texto personalizável com `{nome}` e `{cartela}`) e o resultado da Pedra Maior.
- Fallback visual automático caso o navegador não suporte síntese de voz (aviso exibido nas Configurações).

### Participantes e Cartelas
- Cadastro completo de participantes (nome, identificador, telefone opcional), com busca, edição, exclusão, import/export CSV.
- Cadastro de cartelas 5x5 (B-I-N-G-O) com espaço livre (FREE) no centro, geração aleatória, validação de faixas e duplicidade, import/export CSV.
- Monitoramento automático: a cada bola sorteada, todas as cartelas são verificadas e marcadas.

### Alertas e vitória
- 3 níveis de alerta: 3 faltando (Monitorando), 2 faltando (Atenção), 1 faltando (Iminente) — com destaque visual, sonoro e, opcionalmente, por voz.
- Detecção automática de bingo: ao completar, para o sorteio automático, salva o estado, exibe tela de vitória com confete, nome do ganhador, cartela e última bola, e o locutor anuncia a vitória.
- Suporte a múltiplos ganhadores simultâneos na mesma bola.

### Pedra Maior
- Em caso de empate, abre modal dedicado com todos os ganhadores confirmados (permite adicionar nomes extras), sorteia aleatoriamente o vencedor final sem alterar o sorteio principal, com anúncio por voz.

### Modo Telão
- Tela cheia dedicada para projeção (bola gigante, tabuleiro completo, histórico recente, contagem regressiva, alertas iminentes), com API Fullscreen e opção de abrir em nova janela/monitor.

### Persistência e backup
- Autosave contínuo do jogo atual em `localStorage` a cada sorteio.
- Jogo atual e último jogo finalizado guardados separadamente.
- Recuperação manual (botão "Recuperar Jogo") e automática ao recarregar a página.
- Exportação/importação de backup completo em JSON (participantes, cartelas, jogos, configurações).
- Opção de apagar todos os dados (com confirmação).

### Estatísticas
- Painel com total sorteado, restante, percentual, participantes, cartelas, cartelas por nível de alerta, vencedoras e tempo de partida; histórico completo dos sorteios.

## 💾 Armazenamento de dados
Tudo é guardado no **localStorage do navegador** (chaves com prefixo `bingo75_`). Não há backend, banco de dados remoto nem dependência de internet após o primeiro carregamento da página (as fontes/ícones usam CDN; a aplicação em si funciona offline). Os dados ficam vinculados ao navegador/dispositivo usado — para levar o jogo para outro computador, utilize a função **Exportar Backup Completo** (Configurações) e **Importar Backup** no destino.

## 🖥️ Como usar
1. Abra `index.html` em um navegador moderno (Chrome/Edge recomendados para melhor suporte de vozes PT-BR).
2. Cadastre participantes na aba **Participantes**.
3. Cadastre cartelas na aba **Cartelas** (ou gere aleatoriamente).
4. Nas **Configurações**, escolha a voz do locutor e o intervalo entre bolas.
5. Na aba **Sorteio**, clique em **Iniciar Jogo**. Use **Modo Telão** para exibir em um monitor/projetor durante o evento.

## ⚠️ Observações técnicas
- A qualidade e disponibilidade de vozes em português do Brasil depende do navegador/sistema operacional do usuário (Web Speech API não é controlada pela aplicação).
- O aplicativo é uma página estática (sem autenticação/backend); não há necessidade de regras de acesso hospedadas, pois não existe dado sensível de terceiros nem API protegida.
- Testado com Playwright: console sem erros JavaScript; layout validado em desktop (1280px) e mobile (390px), incluindo rolagem horizontal das abas em telas pequenas.

## 🚀 Publicação
O projeto ainda não foi publicado (Hosted Deploy). Quando desejar disponibilizar a URL pública, peça explicitamente a publicação (Hosted Deploy) ou use a aba **Publish** do editor.

## 🔜 Possíveis evoluções futuras
- Importação de cartelas via planilha Excel (.xlsx) além do CSV já suportado.
- Modo "múltiplos padrões de vitória" (linha, coluna, cheia) configurável por partida.
- Exportação de relatório de ganhadores em PDF.
