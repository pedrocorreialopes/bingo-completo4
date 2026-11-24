/* ===========================================================
   app.js — Orquestração geral da aplicação
   Liga engine, UI, cadastros, configurações e eventos de tela.
=========================================================== */
(function(){

  document.addEventListener('DOMContentLoaded', init);

  function init(){
    SettingsManager.load();
    PlayerManager.load();
    CardManager.load();

    ScreenManager.initTabs();
    ScreenManager.buildBoard();
    ScreenManager.buildTelaoBoard();

    setupEngineHooks();
    setupControlButtons();
    setupPlayersUI();
    setupCardsUI();
    setupConfigUI();
    setupTelaoUI();
    setupWinnerAndBigStoneUI();

    // Tenta restaurar jogo salvo automaticamente (sem apagar dados)
    tryAutoRestore();

    ScreenManager.setStatusBadge(BingoEngine.state);
    ScreenManager.updateControlButtons(BingoEngine.state);
    ScreenManager.renderMiniStats();
    renderPlayersTable();
    renderCardsGallery();
    populateCardPlayerSelect();
    buildCardGridEditor();

    // Unlock audio context no primeiro clique (política de autoplay)
    document.body.addEventListener('click', () => SoundManager.unlock(), { once:true });

    window.addEventListener('beforeunload', () => BingoEngine.persist());
  }

  function tryAutoRestore(){
    if(BingoEngine.hasSavedGame()){
      BingoEngine.restoreGame();
      // Repinta tabuleiro conforme histórico restaurado
      BingoEngine.drawnHistory.forEach(n => ScreenManager.markCellDrawn(n,false));
      ScreenManager.renderHistory(BingoEngine.drawnHistory);
      if(BingoEngine.drawnHistory.length){
        ScreenManager.revealBall(BingoEngine.getLastNumber());
        ScreenManager.setLastCall(BingoEngine.getLastNumber());
      }
      AlertManager.evaluateAll();
      ScreenManager.renderAlerts(AlertManager.activeAlerts);
      ScreenManager.toast('Jogo anterior restaurado automaticamente.', 'success');
    } else {
      BingoEngine.newGame();
    }
  }

  // ===========================================================
  // ENGINE HOOKS -> UI
  // ===========================================================
  function setupEngineHooks(){
    BingoEngine.on('stateChange', (state) => {
      ScreenManager.setStatusBadge(state);
      ScreenManager.updateControlButtons(state);
    });

    BingoEngine.on('reset', () => {
      ScreenManager.resetBoard();
      ScreenManager.setBallIdle();
      ScreenManager.renderHistory([]);
      ScreenManager.renderAlerts([]);
      ScreenManager.setAnnouncerText('Pronto para começar...');
      ScreenManager.setLastCall(null);
      ScreenManager.clearCountdown();
      ScreenManager.renderMiniStats();
    });

    BingoEngine.on('drawStart', () => {
      ScreenManager.startBallRolling();
      ScreenManager.setAnnouncerText('Sorteando...');
    });

    BingoEngine.on('ballRevealed', ({number, history}) => {
      ScreenManager.revealBall(number);
      ScreenManager.markCellDrawn(number, true);
      ScreenManager.renderHistory(history);
      ScreenManager.setLastCall(number);
      ScreenManager.renderMiniStats();
    });

    BingoEngine.on('cardsUpdated', () => {
      renderCardsGallery();
    });

    BingoEngine.on('alertsUpdated', ({alerts}) => {
      ScreenManager.renderAlerts(alerts);
      renderCardsGallery();
    });

    BingoEngine.on('speakingStart', (number) => {
      const letra = NumberWords.letraDaColuna(number);
      ScreenManager.setAnnouncerText(`🔊 ${letra}, número ${number}!`, true);
      ScreenManager.setSpeakerStatus(true, 'Narrando...');
    });

    BingoEngine.on('speakingEnd', () => {
      ScreenManager.setAnnouncerText('Aguardando próxima bola...', false);
      ScreenManager.setSpeakerStatus(false, 'Aguardando');
    });

    BingoEngine.on('repeatCall', (number) => {
      const letra = NumberWords.letraDaColuna(number);
      ScreenManager.setAnnouncerText(`🔊 Repetindo: ${letra}, número ${number}!`, true);
      ScreenManager.setSpeakerStatus(true, 'Repetindo chamada...');
      setTimeout(()=> ScreenManager.setSpeakerStatus(false,'Aguardando'), 1800);
    });

    BingoEngine.on('countdownTick', ({remaining, total}) => {
      ScreenManager.updateCountdown(remaining, total);
    });

    BingoEngine.on('undone', () => {
      ScreenManager.resetBoard();
      BingoEngine.drawnHistory.forEach(n => ScreenManager.markCellDrawn(n,false));
      if(BingoEngine.drawnHistory.length){
        ScreenManager.revealBall(BingoEngine.getLastNumber());
        ScreenManager.setLastCall(BingoEngine.getLastNumber());
      } else {
        ScreenManager.setBallIdle();
        ScreenManager.setLastCall(null);
      }
      ScreenManager.renderHistory(BingoEngine.drawnHistory);
      ScreenManager.renderMiniStats();
      renderCardsGallery();
      ScreenManager.toast('Último sorteio desfeito.', 'warn');
    });

    BingoEngine.on('winnersDetected', (winners) => {
      ScreenManager.updateControlButtons(BingoEngine.state);
      ScreenManager.showWinnerModal(winners);
      renderCardsGallery();

      const template = SettingsManager.get('victoryTemplate') || 'Bingo! Parabéns, {nome}!';
      winners.forEach((card, idx) => {
        const player = PlayerManager.getById(card.playerId);
        const text = template
          .replace('{nome}', player ? player.name : 'participante')
          .replace('{cartela}', card.id);
        setTimeout(() => VoiceAnnouncer.announceVictory(text), idx * 2500);
      });
    });

    BingoEngine.on('poolExhausted', () => {
      ScreenManager.toast('Todas as 75 bolas foram sorteadas!', 'warn');
    });

    BingoEngine.on('restored', () => {
      ScreenManager.updateControlButtons(BingoEngine.state);
    });
  }

  // ===========================================================
  // BOTÕES DE CONTROLE (ABA SORTEIO)
  // ===========================================================
  function setupControlButtons(){
    document.getElementById('btnStart').addEventListener('click', async () => {
      if(CardManager.getAll().length === 0){
        const ok = await ScreenManager.confirm('Nenhuma cartela cadastrada', 'Não há cartelas cadastradas. Deseja iniciar o sorteio mesmo assim?');
        if(!ok) return;
      }
      BingoEngine.startGame();
    });

    document.getElementById('btnPauseResume').addEventListener('click', () => {
      if(BingoEngine.state === BingoEngine.STATES.RUNNING){
        BingoEngine.pause();
      }else if(BingoEngine.state === BingoEngine.STATES.PAUSED){
        BingoEngine.resume();
      }
    });

    document.getElementById('btnDrawManual').addEventListener('click', () => {
      BingoEngine.drawNext(true);
    });

    document.getElementById('btnRepeat').addEventListener('click', () => {
      BingoEngine.repeatLastCall();
    });

    const btnMute = document.getElementById('btnMute');
    btnMute.addEventListener('click', () => {
      const newState = !VoiceAnnouncer.isMuted();
      VoiceAnnouncer.setMuted(newState);
      document.getElementById('muteLabel').textContent = newState ? 'Reativar Voz' : 'Silenciar';
      btnMute.classList.toggle('btn-red', newState);
      ScreenManager.toast(newState ? 'Locutor silenciado.' : 'Locutor reativado.', 'warn');
    });

    document.getElementById('btnUndo').addEventListener('click', async () => {
      const ok = await ScreenManager.confirm('Desfazer último sorteio', 'Tem certeza que deseja desfazer a última bola sorteada?');
      if(ok) BingoEngine.undoLast();
    });

    document.getElementById('btnFinish').addEventListener('click', async () => {
      const ok = await ScreenManager.confirm('Finalizar jogo', 'Tem certeza que deseja finalizar o jogo atual?');
      if(ok){
        BingoEngine.finish();
        ScreenManager.toast('Jogo finalizado e salvo no histórico.', 'success');
      }
    });

    document.getElementById('btnNewGame').addEventListener('click', async () => {
      const ok = await ScreenManager.confirm('Novo jogo', 'Isso reiniciará o sorteio e desmarcará todas as cartelas (os cadastros de participantes/cartelas são mantidos). Deseja continuar?');
      if(ok){
        BingoEngine.newGame();
        ScreenManager.toast('Novo jogo iniciado.', 'success');
      }
    });

    document.getElementById('btnRecover').addEventListener('click', async () => {
      const hasCurrent = PersistenceManager.loadCurrentGame();
      const hasFinished = PersistenceManager.loadFinishedGame();
      if(!hasCurrent && !hasFinished){
        ScreenManager.toast('Nenhum jogo salvo encontrado.', 'error');
        return;
      }
      const ok = await ScreenManager.confirm('Recuperar jogo', 'Deseja recuperar o último jogo salvo (jogo atual ou último finalizado)?');
      if(!ok) return;
      const restored = BingoEngine.restoreGame() ;
      if(restored){
        ScreenManager.resetBoard();
        BingoEngine.drawnHistory.forEach(n => ScreenManager.markCellDrawn(n,false));
        if(BingoEngine.drawnHistory.length){
          ScreenManager.revealBall(BingoEngine.getLastNumber());
          ScreenManager.setLastCall(BingoEngine.getLastNumber());
        }
        ScreenManager.renderHistory(BingoEngine.drawnHistory);
        AlertManager.evaluateAll();
        ScreenManager.renderAlerts(AlertManager.activeAlerts);
        ScreenManager.renderMiniStats();
        renderCardsGallery();
        ScreenManager.toast('Jogo recuperado com sucesso.', 'success');
      }
    });

    document.getElementById('btnTelao').addEventListener('click', () => ScreenManager.openTelao());
    document.getElementById('btnTelaoWindow').addEventListener('click', () => {
      const win = window.open(window.location.href, '_blank');
      ScreenManager.toast('Nova janela aberta: clique em "Modo Telão" nela e arraste para o monitor/projetor.', 'success');
    });
  }

  // ===========================================================
  // PARTICIPANTES
  // ===========================================================
  function setupPlayersUI(){
    const form = document.getElementById('playerForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('playerId').value;
      const name = document.getElementById('playerName').value.trim();
      const doc = document.getElementById('playerDoc').value.trim();
      const phone = document.getElementById('playerPhone').value.trim();
      if(!name){ ScreenManager.toast('Informe o nome do participante.', 'error'); return; }

      if(id){
        PlayerManager.update(id, {name, doc, phone});
        ScreenManager.toast('Participante atualizado.', 'success');
      }else{
        PlayerManager.create({name, doc, phone});
        ScreenManager.toast('Participante cadastrado.', 'success');
      }
      form.reset();
      document.getElementById('playerId').value = '';
      renderPlayersTable();
      populateCardPlayerSelect();
    });

    document.getElementById('btnPlayerCancel').addEventListener('click', () => {
      form.reset();
      document.getElementById('playerId').value = '';
    });

    document.getElementById('playerSearch').addEventListener('input', (e) => {
      renderPlayersTable(e.target.value);
    });

    document.getElementById('btnExportPlayers').addEventListener('click', () => {
      downloadText('participantes.csv', PlayerManager.exportCSV());
    });

    document.getElementById('importPlayersFile').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const text = await file.text();
      const { imported, errors } = PlayerManager.importCSV(text);
      renderPlayersTable();
      populateCardPlayerSelect();
      ScreenManager.toast(`${imported} participante(s) importado(s).${errors.length? ' '+errors.length+' erro(s).':''}`, errors.length?'warn':'success');
      e.target.value = '';
    });
  }

  function renderPlayersTable(filter=''){
    const tbody = document.querySelector('#playersTable tbody');
    const list = PlayerManager.search(filter);
    if(list.length === 0){
      tbody.innerHTML = `<tr><td colspan="5" class="empty-hint">Nenhum participante cadastrado.</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(p => `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.doc||'—')}</td>
        <td>${escapeHtml(p.phone||'—')}</td>
        <td>${p.cardIds.length}</td>
        <td class="row-actions">
          <button class="icon-btn" data-print-player="${p.id}" title="Imprimir todas as cartelas" aria-label="Imprimir todas as cartelas"><i class="fa-solid fa-print"></i></button>
          <button class="icon-btn" data-edit-player="${p.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn danger" data-del-player="${p.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-print-player]').forEach(btn => {
      btn.addEventListener('click', () => {
        const player = PlayerManager.getById(btn.dataset.printPlayer);
        if(!player) return;
        const cards = CardManager.getByPlayer(player.id);
        if(!cards.length){
          ScreenManager.toast('Este participante ainda não possui cartelas cadastradas.', 'warn');
          return;
        }
        openPlayerCardsPrintSelector(player, cards);
      });
    });

    tbody.querySelectorAll('[data-edit-player]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = PlayerManager.getById(btn.dataset.editPlayer);
        if(!p) return;
        document.getElementById('playerId').value = p.id;
        document.getElementById('playerName').value = p.name;
        document.getElementById('playerDoc').value = p.doc;
        document.getElementById('playerPhone').value = p.phone;
        document.querySelector('.tab-btn[data-tab="participantes"]').click();
        window.scrollTo({top:0, behavior:'smooth'});
      });
    });
    tbody.querySelectorAll('[data-del-player]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await ScreenManager.confirm('Excluir participante', 'Isso também removerá o vínculo com cartelas. Deseja continuar?');
        if(!ok) return;
        const id = btn.dataset.delPlayer;
        // Remove cartelas vinculadas também
        CardManager.getByPlayer(id).forEach(c => CardManager.remove(c.id));
        PlayerManager.remove(id);
        renderPlayersTable();
        renderCardsGallery();
        populateCardPlayerSelect();
        ScreenManager.toast('Participante removido.', 'success');
      });
    });
  }

  // ===========================================================
  // CARTELAS
  // ===========================================================
  const COLS = ['B','I','N','G','O'];
  const COL_RANGES = { B:[1,15], I:[16,30], N:[31,45], G:[46,60], O:[61,75] };

  function populateCardPlayerSelect(){
    const sel = document.getElementById('cardPlayer');
    const current = sel.value;
    sel.innerHTML = PlayerManager.getAll().map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    if(current) sel.value = current;
  }

  function buildCardGridEditor(gridData){
    const wrap = document.getElementById('cardGridEditor');
    wrap.innerHTML = '';
    COLS.forEach(col => {
      const [min,max] = COL_RANGES[col];
      const colDiv = document.createElement('div');
      colDiv.className = `card-col col-${col.toLowerCase()}`;
      const header = document.createElement('div');
      header.className = 'card-col-header';
      header.textContent = col;
      colDiv.appendChild(header);
      for(let row=0; row<5; row++){
        const input = document.createElement('input');
        input.className = 'card-cell-input';
        input.dataset.col = col;
        input.dataset.row = row;
        if(col === 'N' && row === 2){
          input.value = 'FREE';
          input.classList.add('free');
          input.disabled = true;
        } else if(gridData && gridData[col]) {
          input.value = gridData[col][row];
        }
        input.setAttribute('inputmode','numeric');
        input.setAttribute('placeholder', `${min}-${max}`);
        colDiv.appendChild(input);
      }
      wrap.appendChild(colDiv);
    });
  }

  function readGridFromEditor(){
    const grid = { B:[], I:[], N:[], G:[], O:[] };
    document.querySelectorAll('#cardGridEditor .card-cell-input').forEach(input => {
      const col = input.dataset.col;
      const row = Number(input.dataset.row);
      grid[col][row] = (col==='N' && row===2) ? 'FREE' : Number(input.value);
    });
    return grid;
  }

  function setupCardsUI(){
    const printButton = document.getElementById('btnPrintGeneratedCard');

    document.getElementById('btnGenerateRandom').addEventListener('click', () => {
      const grid = CardManager.randomCardNumbers();
      const errors = CardManager.validateGrid(grid);
      if(errors.length){
        document.getElementById('cardFormError').textContent = errors.join(' ');
        printButton.hidden = true;
        return;
      }
      document.getElementById('cardFormError').textContent = '';
      buildCardGridEditor(grid);
      printButton.hidden = false;
    });

    printButton.addEventListener('click', () => {
      const grid = readGridFromEditor();
      const errors = CardManager.validateGrid(grid);
      const errorEl = document.getElementById('cardFormError');
      if(errors.length){
        errorEl.textContent = errors.join(' ');
        return;
      }
      errorEl.textContent = '';
      const playerSelect = document.getElementById('cardPlayer');
      const playerName = playerSelect.selectedOptions[0]?.textContent || 'Não informado';
      const cardId = document.getElementById('cardId').value;
      printBingoCard(grid, playerName, cardId);
    });

    document.getElementById('cardForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('cardId').value;
      const playerId = document.getElementById('cardPlayer').value;
      const errorEl = document.getElementById('cardFormError');
      errorEl.textContent = '';
      if(!playerId){ errorEl.textContent = 'Selecione um participante.'; return; }
      const grid = readGridFromEditor();
      try{
        if(id){
          CardManager.update(id, {playerId, grid});
          ScreenManager.toast('Cartela atualizada.', 'success');
        }else{
          CardManager.create({playerId, grid});
          ScreenManager.toast('Cartela cadastrada.', 'success');
        }
        document.getElementById('cardForm').reset();
        document.getElementById('cardId').value = '';
        buildCardGridEditor();
        renderCardsGallery();
        renderPlayersTable();
      }catch(err){
        errorEl.textContent = err.message;
      }
    });

    document.getElementById('btnCardCancel').addEventListener('click', () => {
      document.getElementById('cardForm').reset();
      document.getElementById('cardId').value = '';
      printButton.hidden = true;
      buildCardGridEditor();
    });

    document.getElementById('cardSearch').addEventListener('input', renderCardsGallery);
    document.getElementById('cardStatusFilter').addEventListener('change', renderCardsGallery);

    document.getElementById('btnExportCards').addEventListener('click', () => {
      downloadText('cartelas.csv', CardManager.exportCSV());
    });

    document.getElementById('importCardsFile').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const text = await file.text();
      const { imported, errors } = CardManager.importCSV(text);
      renderCardsGallery();
      renderPlayersTable();
      ScreenManager.toast(`${imported} cartela(s) importada(s).${errors.length? ' '+errors.length+' erro(s).':''}`, errors.length?'warn':'success');
      e.target.value = '';
    });
  }

  function openPlayerCardsPrintSelector(player, cards){
    // Permite escolher cartelas específicas ou selecionar todas antes de gerar
    // um único documento de impressão (que pode ser salvo como um único PDF).
    document.getElementById('playerCardsPrintModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'playerCardsPrintModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Arial,sans-serif';
    const options = cards.map(card => `
      <label style="display:flex;align-items:center;gap:10px;padding:11px 12px;border:1px solid #ddd;border-radius:8px;margin:7px 0;cursor:pointer">
        <input type="checkbox" class="player-print-card-check" value="${escapeHtml(String(card.id))}" checked style="width:18px;height:18px">
        <span><strong>Cartela ${escapeHtml(String(card.id))}</strong></span>
      </label>`).join('');
    modal.innerHTML = `
      <section role="dialog" aria-modal="true" aria-labelledby="playerPrintTitle" style="background:#fff;color:#222;width:min(100%,480px);max-height:85vh;overflow:auto;border-radius:14px;padding:22px;box-shadow:0 12px 45px rgba(0,0,0,.3)">
        <h2 id="playerPrintTitle" style="margin:0 0 6px;font-size:21px">Imprimir cartelas</h2>
        <p style="margin:0 0 16px;color:#555">Participante: <strong>${escapeHtml(player.name)}</strong></p>
        <label style="display:flex;align-items:center;gap:10px;padding:12px;background:#f2f5f8;border-radius:8px;font-weight:700;cursor:pointer">
          <input type="checkbox" id="playerPrintSelectAll" checked style="width:18px;height:18px"> Selecionar todas (${cards.length})
        </label>
        <div style="margin:12px 0;max-height:42vh;overflow:auto">${options}</div>
        <p id="playerPrintCount" style="font-size:13px;color:#666;margin:8px 0 16px">${cards.length} cartela(s) selecionada(s)</p>
        <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap">
          <button type="button" id="playerPrintCancel" style="padding:10px 16px;border:1px solid #ccc;border-radius:8px;background:#fff;cursor:pointer">Cancelar</button>
          <button type="button" id="playerPrintSubmit" style="padding:10px 16px;border:0;border-radius:8px;background:#1769aa;color:#fff;font-weight:700;cursor:pointer">Imprimir selecionadas</button>
        </div>
      </section>`;
    document.body.appendChild(modal);

    const checks = [...modal.querySelectorAll('.player-print-card-check')];
    const selectAll = modal.querySelector('#playerPrintSelectAll');
    const count = modal.querySelector('#playerPrintCount');
    const submit = modal.querySelector('#playerPrintSubmit');
    const update = () => {
      const selected = checks.filter(check => check.checked).length;
      selectAll.checked = selected === checks.length;
      selectAll.indeterminate = selected > 0 && selected < checks.length;
      count.textContent = `${selected} cartela(s) selecionada(s)`;
      submit.disabled = selected === 0;
      submit.style.opacity = selected === 0 ? '.55' : '1';
    };
    selectAll.addEventListener('change', () => {
      checks.forEach(check => { check.checked = selectAll.checked; });
      update();
    });
    checks.forEach(check => check.addEventListener('change', update));
    modal.querySelector('#playerPrintCancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', event => { if(event.target === modal) modal.remove(); });
    submit.addEventListener('click', () => {
      const selectedIds = new Set(checks.filter(check => check.checked).map(check => check.value));
      const selectedCards = cards.filter(card => selectedIds.has(String(card.id)));
      if(!selectedCards.length) return;
      modal.remove();
      // Todas as cartelas selecionadas são montadas no mesmo documento/janela.
      printBingoCards(selectedCards.map(card => ({ card, playerName: player.name })));
    });
    update();
  }

  function printBingoCard(grid, playerName, cardId){
    printBingoCards([{ card: { grid, id: cardId || 'Não salva' }, playerName }]);
  }

  function printBingoCards(items){
    if(!items || !items.length) return;
    const cardsHtml = items.map(({card, playerName}) => {
      const rows = Array.from({length:5}, (_, row) =>
        ['B','I','N','G','O'].map(col => {
          const value = card.grid[col][row];
          return `<td class="${value === 'FREE' ? 'free' : ''}">${value === 'FREE' ? 'LIVRE' : escapeHtml(String(value))}</td>`;
        }).join('')
      ).map(row => `<tr>${row}</tr>`).join('');
      return `<section class="card">
        <h1>B I N G O</h1>
        <div class="meta"><span>Participante: <strong>${escapeHtml(playerName || 'Não informado')}</strong></span><span>Cartela: <strong>${escapeHtml(String(card.id || 'Não salva'))}</strong></span></div>
        <table aria-label="Cartela de bingo"><thead><tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="footer">Boa sorte!</div>
      </section>`;
    }).join('');

    const popup = window.open('', '_blank', 'width=900,height=900');
    if(!popup){
      ScreenManager.toast('Permita pop-ups no navegador para imprimir as cartelas.', 'warn');
      return;
    }
    popup.document.open();
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cartelas de Bingo</title>
      <style>
        *{box-sizing:border-box} body{font-family:Arial,sans-serif;color:#111;margin:0;padding:20px}
        .card{max-width:650px;margin:0 auto 28px;break-after:page;page-break-after:always}
        .card:last-child{break-after:auto;page-break-after:auto}
        h1{text-align:center;font-size:30px;letter-spacing:8px;margin:0 0 18px}
        .meta{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #222;padding-bottom:12px;margin-bottom:18px;font-size:15px}
        table{width:100%;border-collapse:collapse;table-layout:fixed} th{background:#222;color:#fff;font-size:28px;padding:12px}
        td{border:2px solid #222;text-align:center;font-size:30px;font-weight:700;height:92px} td.free{background:#e9e9e9;font-size:21px}
        .footer{text-align:center;margin-top:18px;font-size:12px;color:#555}
        @page{size:A4 portrait;margin:15mm}
        @media print{body{padding:0}.card{margin:0 auto;min-height:250mm}}
      </style></head><body>${cardsHtml}<script>window.addEventListener('load',()=>window.print());<\/script></body></html>`);
    popup.document.close();
  }

  function renderCardsGallery(){
    const gallery = document.getElementById('cardsGallery');
    const search = (document.getElementById('cardSearch').value || '').toLowerCase();
    const statusFilter = document.getElementById('cardStatusFilter').value;

    let list = CardManager.getAll();
    if(search){
      list = list.filter(c => {
        const p = PlayerManager.getById(c.playerId);
        return c.id.toLowerCase().includes(search) || (p && p.name.toLowerCase().includes(search));
      });
    }
    if(statusFilter) list = list.filter(c => c.status === statusFilter);

    if(list.length === 0){
      gallery.innerHTML = '<span class="empty-hint">Nenhuma cartela encontrada.</span>';
      return;
    }

    const statusLabels = { normal:'Em jogo', monitoring:'Monitorando (3)', attention:'Atenção (2)', imminent:'Iminente (1)', winner:'🏆 Vencedora' };

    gallery.innerHTML = list.map(c => {
      const player = PlayerManager.getById(c.playerId);
      const missing = CardManager.missingCount(c);
      const cellsHtml = COLS.map(col => c.grid[col].map(v => {
        if(v === 'FREE') return `<div class="mini-cell free">FREE</div>`;
        const marked = c.marked.includes(Number(v));
        return `<div class="mini-cell ${marked?'marked':''}">${v}</div>`;
      }).join('')).reduce((acc,cur,idx)=>{
        // transpose not needed since we render column by column sequentially but CSS grid is row-major
        return acc+cur;
      },'');
      // Build proper row-major order for 5x5 grid display
      let rows = '';
      for(let r=0;r<5;r++){
        COLS.forEach(col => {
          const v = c.grid[col][r];
          if(v === 'FREE'){ rows += `<div class="mini-cell free">FREE</div>`; }
          else{
            const marked = c.marked.includes(Number(v));
            rows += `<div class="mini-cell ${marked?'marked':''}">${v}</div>`;
          }
        });
      }
      return `
        <div class="mini-card">
          <div class="mc-head">
            <div>
              <div class="mc-name">${player ? escapeHtml(player.name) : 'Sem participante'}</div>
              <div class="mc-id">${c.id}</div>
            </div>
          </div>
          <div class="mini-card-grid">${rows}</div>
          <div class="mc-progress ${c.status}">${statusLabels[c.status]||c.status} ${c.status!=='winner'?`• faltam ${missing}`:''}</div>
          <div class="mc-actions">
            <button class="icon-btn" data-print-card="${c.id}" title="Imprimir cartela"><i class="fa-solid fa-print"></i></button>
            <button class="icon-btn" data-edit-card="${c.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
            <button class="icon-btn danger" data-del-card="${c.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `;
    }).join('');

    gallery.querySelectorAll('[data-print-card]').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = CardManager.getById(btn.dataset.printCard);
        if(!card) return;
        const player = PlayerManager.getById(card.playerId);
        printBingoCard(card.grid, player?.name || 'Sem participante', card.id);
      });
    });

    gallery.querySelectorAll('[data-edit-card]').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = CardManager.getById(btn.dataset.editCard);
        if(!c) return;
        document.getElementById('cardId').value = c.id;
        document.getElementById('cardPlayer').value = c.playerId;
        buildCardGridEditor(c.grid);
        document.getElementById('btnPrintGeneratedCard').hidden = false;
        document.querySelector('.tab-btn[data-tab="cartelas"]').click();
        window.scrollTo({top:0, behavior:'smooth'});
      });
    });
    gallery.querySelectorAll('[data-del-card]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await ScreenManager.confirm('Excluir cartela', 'Tem certeza que deseja excluir esta cartela?');
        if(!ok) return;
        CardManager.remove(btn.dataset.delCard);
        renderCardsGallery();
        renderPlayersTable();
        ScreenManager.toast('Cartela removida.', 'success');
      });
    });
  }

  // ===========================================================
  // CONFIGURAÇÕES
  // ===========================================================
  function setupConfigUI(){
    const s = SettingsManager;

    function populateVoices(){
      const sel = document.getElementById('cfgVoiceSelect');
      const voices = VoiceAnnouncer.getPtBrVoices().length ? VoiceAnnouncer.getPtBrVoices() : VoiceAnnouncer.getVoices();
      if(voices.length === 0){
        sel.innerHTML = '<option>Nenhuma voz encontrada</option>';
        document.getElementById('voiceFallbackMsg').style.display = VoiceAnnouncer.isSupported() ? 'none' : 'flex';
        return;
      }
      sel.innerHTML = voices.map(v => `<option value="${v.voiceURI}">${v.name} (${v.lang})</option>`).join('');
      const saved = s.get('voice.voiceURI');
      if(saved && voices.some(v=>v.voiceURI===saved)){
        sel.value = saved;
      }else{
        const def = VoiceAnnouncer.getDefaultVoice();
        if(def) sel.value = def.voiceURI;
      }
    }

    if(!VoiceAnnouncer.isSupported()){
      document.getElementById('voiceFallbackMsg').style.display = 'flex';
    }

    populateVoices();
    if(window.speechSynthesis){
      window.speechSynthesis.onvoiceschanged = () => populateVoices();
    }

    document.getElementById('cfgVoiceEnabled').checked = s.get('voice.enabled');
    document.getElementById('cfgRate').value = s.get('voice.rate');
    document.getElementById('cfgRateVal').textContent = s.get('voice.rate').toFixed(2);
    document.getElementById('cfgPitch').value = s.get('voice.pitch');
    document.getElementById('cfgPitchVal').textContent = s.get('voice.pitch').toFixed(2);
    document.getElementById('cfgVolume').value = s.get('voice.volume');
    document.getElementById('cfgVolumeVal').textContent = Math.round(s.get('voice.volume')*100)+'%';
    document.getElementById('cfgDelay').value = s.get('voice.delayBeforeSpeechMs');
    document.getElementById('cfgDelayVal').textContent = s.get('voice.delayBeforeSpeechMs');
    document.getElementById('cfgVoiceAlerts').checked = s.get('voice.announceAlerts');

    document.getElementById('cfgIntervalPreset').value = s.get('interval.isCustom') ? 'custom' : String(s.get('interval.presetSeconds'));
    document.getElementById('cfgIntervalCustom').value = s.get('interval.customSeconds');
    document.getElementById('cfgIntervalCustomWrap').style.display = s.get('interval.isCustom') ? 'flex' : 'none';
    document.getElementById('cfgAfterNarration').checked = s.get('interval.afterNarration');

    document.getElementById('cfgSoundEnabled').checked = s.get('sound.enabled');
    document.getElementById('cfgSoundVol').value = s.get('sound.volume');
    document.getElementById('cfgSoundVolVal').textContent = Math.round(s.get('sound.volume')*100)+'%';

    document.getElementById('cfgVictoryTemplate').value = s.get('victoryTemplate');

    document.getElementById('cfgVoiceEnabled').addEventListener('change', e => s.set('voice.enabled', e.target.checked));
    document.getElementById('cfgVoiceSelect').addEventListener('change', e => s.set('voice.voiceURI', e.target.value));
    document.getElementById('cfgRate').addEventListener('input', e => { s.set('voice.rate', parseFloat(e.target.value)); document.getElementById('cfgRateVal').textContent = parseFloat(e.target.value).toFixed(2); });
    document.getElementById('cfgPitch').addEventListener('input', e => { s.set('voice.pitch', parseFloat(e.target.value)); document.getElementById('cfgPitchVal').textContent = parseFloat(e.target.value).toFixed(2); });
    document.getElementById('cfgVolume').addEventListener('input', e => { s.set('voice.volume', parseFloat(e.target.value)); document.getElementById('cfgVolumeVal').textContent = Math.round(e.target.value*100)+'%'; });
    document.getElementById('cfgDelay').addEventListener('input', e => { s.set('voice.delayBeforeSpeechMs', parseInt(e.target.value)); document.getElementById('cfgDelayVal').textContent = e.target.value; });
    document.getElementById('cfgVoiceAlerts').addEventListener('change', e => s.set('voice.announceAlerts', e.target.checked));

    document.getElementById('cfgIntervalPreset').addEventListener('change', e => {
      if(e.target.value === 'custom'){
        s.set('interval.isCustom', true);
        document.getElementById('cfgIntervalCustomWrap').style.display = 'flex';
      }else{
        s.set('interval.isCustom', false);
        s.set('interval.presetSeconds', Number(e.target.value));
        document.getElementById('cfgIntervalCustomWrap').style.display = 'none';
      }
    });
    document.getElementById('cfgIntervalCustom').addEventListener('input', e => s.set('interval.customSeconds', Number(e.target.value)));
    document.getElementById('cfgAfterNarration').addEventListener('change', e => s.set('interval.afterNarration', e.target.checked));

    document.getElementById('cfgSoundEnabled').addEventListener('change', e => s.set('sound.enabled', e.target.checked));
    document.getElementById('cfgSoundVol').addEventListener('input', e => { s.set('sound.volume', parseFloat(e.target.value)); document.getElementById('cfgSoundVolVal').textContent = Math.round(e.target.value*100)+'%'; });

    document.getElementById('cfgVictoryTemplate').addEventListener('input', e => s.set('victoryTemplate', e.target.value));

    document.getElementById('btnTestVoice').addEventListener('click', () => {
      VoiceAnnouncer.speak('Olá! Eu sou o locutor virtual do Bingo 75 PRO. Estou pronto para anunciar as bolas da sua partida!', {immediate:true});
    });

    document.getElementById('btnBackupExport').addEventListener('click', () => {
      const obj = PersistenceManager.exportBackupObject();
      downloadText(`bingo75-backup-${Date.now()}.json`, JSON.stringify(obj, null, 2));
    });

    document.getElementById('importBackupFile').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      try{
        const text = await file.text();
        const obj = JSON.parse(text);
        const ok = await ScreenManager.confirm('Importar backup', 'Isso substituirá os dados atuais pelos dados do backup. Deseja continuar?');
        if(!ok){ e.target.value=''; return; }
        PersistenceManager.importBackupObject(obj);
        ScreenManager.toast('Backup importado! Recarregando...', 'success');
        setTimeout(()=>location.reload(), 1200);
      }catch(err){
        ScreenManager.toast('Arquivo de backup inválido.', 'error');
      }
      e.target.value = '';
    });

    document.getElementById('btnResetAll').addEventListener('click', async () => {
      const ok = await ScreenManager.confirm('Apagar todos os dados', 'ATENÇÃO: isso apagará permanentemente jogos, participantes, cartelas e configurações. Deseja continuar?');
      if(!ok) return;
      PersistenceManager.resetAll();
      ScreenManager.toast('Todos os dados foram apagados. Recarregando...', 'warn');
      setTimeout(()=>location.reload(), 1200);
    });
  }

  // ===========================================================
  // TELÃO
  // ===========================================================
  function setupTelaoUI(){
    document.getElementById('btnExitTelao').addEventListener('click', () => ScreenManager.closeTelao());
    document.getElementById('btnFullscreen').addEventListener('click', () => {
      const el = document.getElementById('telaoOverlay');
      if(!document.fullscreenElement){
        el.requestFullscreen().catch(()=>{});
      }else{
        document.exitFullscreen().catch(()=>{});
      }
    });
  }

  // ===========================================================
  // VITÓRIA + PEDRA MAIOR
  // ===========================================================
  function setupWinnerAndBigStoneUI(){
    document.getElementById('btnCloseWinner').addEventListener('click', () => {
      ScreenManager.closeWinnerModal();
    });

    document.getElementById('btnOpenBigStone').addEventListener('click', () => {
      ScreenManager.closeWinnerModal();
      const candidates = BigStoneManager.startFromWinners(BingoEngine.winners);
      ScreenManager.showBigStoneModal(candidates);
      VoiceAnnouncer.announceBigStoneIntro();
    });

    document.getElementById('btnBigStoneAddName').addEventListener('click', () => {
      const input = document.getElementById('bigStoneNewName');
      if(BigStoneManager.addExtraName(input.value)){
        input.value = '';
        ScreenManager.showBigStoneModal(BigStoneManager.candidates);
      }
    });

    document.getElementById('btnBigStoneDraw').addEventListener('click', () => {
      const winner = BigStoneManager.draw();
      if(!winner) return;
      SoundManager.bigStone();
      document.getElementById('bigStoneResult').innerHTML = `🏆 <strong>${escapeHtml(winner.name)}</strong> venceu a Pedra Maior!`;
      VoiceAnnouncer.announceBigStoneWinner(winner.name);
      ScreenManager.launchConfettiOnBigStone && ScreenManager.launchConfettiOnBigStone();
    });

    document.getElementById('btnCloseBigStone').addEventListener('click', () => {
      ScreenManager.closeBigStoneModal();
      BigStoneManager.reset();
    });
  }

  // ===========================================================
  // UTILITÁRIOS
  // ===========================================================
  function downloadText(filename, text){
    const blob = new Blob([text], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

})();
