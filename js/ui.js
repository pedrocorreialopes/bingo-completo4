/* ===========================================================
   ui.js — ScreenManager
   Responsável por toda a renderização de telas: tabuleiro,
   bola 3D, histórico, alertas, estatísticas, tabelas, modo telão,
   modais (confirmação, vitória, pedra maior) e tabs.
=========================================================== */
(function(global){

  const COLS = ['B','I','N','G','O'];
  const COL_RANGES = { B:[1,15], I:[16,30], N:[31,45], G:[46,60], O:[61,75] };

  function letterOf(n){ return NumberWords.letraDaColuna(n); }
  function colorClass(letter){ return 'color-' + letter.toLowerCase(); }

  const ScreenManager = {

    // ---------------- TABS ----------------
    initTabs(){
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
          document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
          btn.classList.add('active');
          document.querySelector(`.tab-panel[data-tab="${btn.dataset.tab}"]`).classList.add('active');
          if(btn.dataset.tab === 'estatisticas') ScreenManager.renderStats();
        });
      });
    },

    // ---------------- TABULEIRO PRINCIPAL ----------------
    buildBoard(){
      const grid = document.getElementById('boardGrid');
      grid.innerHTML = '';
      COLS.forEach(col => {
        const [min,max] = COL_RANGES[col];
        const colDiv = document.createElement('div');
        colDiv.className = `board-col col-${col.toLowerCase()}`;
        const header = document.createElement('div');
        header.className = 'board-col-header';
        header.textContent = col;
        colDiv.appendChild(header);
        for(let n=min;n<=max;n++){
          const cell = document.createElement('div');
          cell.className = 'board-cell';
          cell.id = `cell-${n}`;
          cell.textContent = n;
          colDiv.appendChild(cell);
        }
        grid.appendChild(colDiv);
      });
    },

    buildTelaoBoard(){
      const grid = document.getElementById('telaoBoard');
      grid.innerHTML = '';
      COLS.forEach(col => {
        const [min,max] = COL_RANGES[col];
        const colDiv = document.createElement('div');
        colDiv.className = `board-col col-${col.toLowerCase()}`;
        const header = document.createElement('div');
        header.className = 'board-col-header';
        header.textContent = col;
        colDiv.appendChild(header);
        for(let n=min;n<=max;n++){
          const cell = document.createElement('div');
          cell.className = 'board-cell';
          cell.id = `telao-cell-${n}`;
          cell.textContent = n;
          colDiv.appendChild(cell);
        }
        grid.appendChild(colDiv);
      });
    },

    markCellDrawn(number, highlight=false){
      const cell = document.getElementById(`cell-${number}`);
      if(cell){
        cell.classList.add('drawn');
        if(highlight){
          cell.classList.add('current');
          setTimeout(()=>cell.classList.remove('current'), 2200);
        }
      }
      const tcell = document.getElementById(`telao-cell-${number}`);
      if(tcell){
        tcell.classList.add('drawn');
        if(highlight){
          tcell.classList.add('current');
          setTimeout(()=>tcell.classList.remove('current'), 2200);
        }
      }
    },

    resetBoard(){
      document.querySelectorAll('.board-cell').forEach(c => c.classList.remove('drawn','current'));
    },

    // ---------------- BOLA 3D ----------------
    setBallIdle(){
      const stage = document.getElementById('ballStage');
      stage.className = 'ball-stage idle';
      document.getElementById('mainBallLetter').textContent = '?';
      document.getElementById('mainBallNumber').textContent = '--';
    },

    startBallRolling(){
      const stage = document.getElementById('ballStage');
      stage.className = 'ball-stage rolling';
    },

    revealBall(number){
      const letter = letterOf(number);
      const stage = document.getElementById('ballStage');
      stage.className = `ball-stage reveal ${colorClass(letter)}`;
      document.getElementById('mainBallLetter').textContent = letter;
      document.getElementById('mainBallNumber').textContent = number;

      const tball = document.getElementById('telaoBall');
      tball.className = `telao-ball ${colorClass(letter)}`;
      document.getElementById('telaoBallLetter').textContent = letter;
      document.getElementById('telaoBallNumber').textContent = number;
    },

    // ---------------- HISTÓRICO ----------------
    renderHistory(history){
      const wrap = document.getElementById('historyChips');
      const telaoWrap = document.getElementById('telaoHistory');
      if(history.length === 0){
        wrap.innerHTML = '<span class="empty-hint">Nenhuma bola sorteada</span>';
        telaoWrap.innerHTML = '';
        return;
      }
      const recent = history.slice(-20).reverse();
      wrap.innerHTML = recent.map(n => {
        const l = letterOf(n);
        return `<div class="history-chip ${l.toLowerCase()}" title="${l}-${n}">${n}</div>`;
      }).join('');

      const telaoRecent = history.slice(-12).reverse();
      telaoWrap.innerHTML = telaoRecent.map(n => {
        const l = letterOf(n);
        return `<div class="history-chip ${l.toLowerCase()}">${n}</div>`;
      }).join('');
    },

    renderFullHistory(history){
      const wrap = document.getElementById('fullHistory');
      if(history.length === 0){
        wrap.innerHTML = '<span class="empty-hint">Nenhuma bola sorteada ainda</span>';
        return;
      }
      wrap.innerHTML = history.map((n,idx) => {
        const l = letterOf(n);
        return `<div class="history-chip ${l.toLowerCase()}" title="${idx+1}ª bola">${n}</div>`;
      }).join('');
    },

    // ---------------- COUNTDOWN ----------------
    updateCountdown(remaining, total){
      const val = document.getElementById('countdownValue');
      const ring = document.getElementById('countdownRing');
      const telaoVal = document.getElementById('telaoCountdown');
      if(remaining < 0) remaining = 0;
      val.textContent = remaining;
      telaoVal.textContent = remaining;
      const circumference = 2*Math.PI*52;
      const pct = total > 0 ? remaining/total : 0;
      ring.style.strokeDashoffset = circumference * (1-pct);
    },

    clearCountdown(){
      document.getElementById('countdownValue').textContent = '--';
      document.getElementById('telaoCountdown').textContent = '--';
    },

    // ---------------- LOCUTOR ----------------
    setAnnouncerText(text, speaking=false){
      document.getElementById('announcerText').textContent = text;
      const caption = document.getElementById('announcerCaption');
      caption.classList.toggle('speaking', speaking);
    },

    setSpeakerStatus(active, label){
      document.getElementById('speakerDot').classList.toggle('active', active);
      document.getElementById('speakerStatusText').textContent = label;
    },

    setLastCall(number){
      if(number == null){
        document.getElementById('lastCallText').textContent = '—';
        return;
      }
      const l = letterOf(number);
      document.getElementById('lastCallText').textContent = `${l} — ${number}`;
    },

    // ---------------- ALERTAS ----------------
    renderAlerts(alerts){
      const wrap = document.getElementById('alertsList');
      const telaoWrap = document.getElementById('telaoAlerts');
      if(alerts.length === 0){
        wrap.innerHTML = '<span class="empty-hint">Nenhum alerta no momento</span>';
        telaoWrap.innerHTML = '';
        return;
      }
      const render = (a) => `<div class="alert-item ${a.level}">
          <span class="alert-name">${a.playerName}</span>
          <span>${a.missing} número(s) faltando</span>
        </div>`;
      wrap.innerHTML = alerts.slice(0,15).map(render).join('');
      telaoWrap.innerHTML = alerts.filter(a=>a.level==='imminent').slice(0,6).map(render).join('');
    },

    // ---------------- STATUS BADGE ----------------
    setStatusBadge(state){
      const badge = document.getElementById('gameStatusBadge');
      const map = {
        idle: ['Aguardando','status-idle'],
        running: ['Em andamento','status-running'],
        paused: ['Pausado','status-paused'],
        finished: ['Finalizado','status-finished']
      };
      const [label, cls] = map[state] || map.idle;
      badge.textContent = label;
      badge.className = `status-badge ${cls}`;
    },

    updateControlButtons(state){
      const $ = id => document.getElementById(id);
      const S = BingoEngine.STATES;
      $('btnStart').disabled = (state === S.RUNNING || state === S.PAUSED);
      $('btnPauseResume').disabled = (state === S.IDLE || state === S.FINISHED);
      $('btnDrawManual').disabled = (state === S.IDLE || state === S.FINISHED || BingoEngine.pool.length===0);
      $('btnRepeat').disabled = BingoEngine.drawnHistory.length === 0;
      $('btnUndo').disabled = BingoEngine.drawnHistory.length === 0 || state === S.FINISHED;
      $('btnFinish').disabled = (state === S.IDLE || state === S.FINISHED);

      if(state === S.PAUSED){
        $('btnPauseResume').innerHTML = '<i class="fa-solid fa-play"></i> Continuar';
      }else{
        $('btnPauseResume').innerHTML = '<i class="fa-solid fa-pause"></i> Pausar';
      }
    },

    // ---------------- MINI STATS (sidebar) ----------------
    renderMiniStats(){
      const prog = BingoEngine.getProgress();
      const grid = document.getElementById('miniStatsGrid');
      grid.innerHTML = `
        <div class="mini-stat"><div class="val">${prog.drawn}</div><div class="lbl">Sorteadas</div></div>
        <div class="mini-stat"><div class="val">${prog.remaining}</div><div class="lbl">Restantes</div></div>
        <div class="mini-stat"><div class="val">${prog.percent}%</div><div class="lbl">Progresso</div></div>
        <div class="mini-stat"><div class="val">${CardManager.getAll().length}</div><div class="lbl">Cartelas</div></div>
      `;
      document.getElementById('telaoDrawnCount').textContent = prog.drawn;
    },

    // ---------------- ESTATÍSTICAS COMPLETAS ----------------
    renderStats(){
      const prog = BingoEngine.getProgress();
      const cards = CardManager.getAll();
      const counts = { monitoring:0, attention:0, imminent:0, winner:0 };
      cards.forEach(c => { if(counts[c.status] !== undefined) counts[c.status]++; });

      let timeStr = '—';
      if(BingoEngine.startedAt){
        const start = new Date(BingoEngine.startedAt);
        const end = BingoEngine.finishedAt ? new Date(BingoEngine.finishedAt) : new Date();
        const diffMin = Math.floor((end-start)/60000);
        const diffSec = Math.floor(((end-start)%60000)/1000);
        timeStr = `${diffMin}min ${diffSec}s`;
      }

      const items = [
        [prog.drawn, 'Bolas Sorteadas'],
        [prog.remaining, 'Bolas Restantes'],
        [prog.percent+'%', 'Progresso do Jogo'],
        [PlayerManager.getAll().length, 'Participantes'],
        [cards.length, 'Total de Cartelas'],
        [counts.monitoring, 'Monitorando (3)'],
        [counts.attention, 'Atenção (2)'],
        [counts.imminent, 'Iminente (1)'],
        [counts.winner, 'Cartelas Vencedoras'],
        [timeStr, 'Tempo de Partida']
      ];
      document.getElementById('statsGrid').innerHTML = items.map(([v,l]) =>
        `<div class="stat-card"><div class="sv">${v}</div><div class="sl">${l}</div></div>`
      ).join('');

      this.renderFullHistory(BingoEngine.drawnHistory);
    },

    // ---------------- MODAIS ----------------
    confirm(title, message){
      return new Promise(resolve => {
        const overlay = document.getElementById('modalConfirm');
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        overlay.classList.add('open');
        const okBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');
        const cleanup = () => {
          overlay.classList.remove('open');
          okBtn.removeEventListener('click', onOk);
          cancelBtn.removeEventListener('click', onCancel);
        };
        const onOk = () => { cleanup(); resolve(true); };
        const onCancel = () => { cleanup(); resolve(false); };
        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
      });
    },

    showWinnerModal(winners){
      const overlay = document.getElementById('modalWinner');
      const list = document.getElementById('winnerList');
      const meta = document.getElementById('winnerMeta');
      list.innerHTML = winners.map(c => {
        const player = PlayerManager.getById(c.playerId);
        return `<div class="winner-entry">
          <div class="wn-name">${player ? player.name : 'Desconhecido'}</div>
          <div class="wn-meta">Cartela ${c.id} • Última bola: ${BingoEngine.getLastNumber()}</div>
        </div>`;
      }).join('');
      const now = new Date();
      meta.textContent = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`;
      document.getElementById('btnOpenBigStone').style.display = winners.length > 1 ? 'inline-flex' : 'none';
      overlay.classList.add('open');
      this.launchConfetti();
    },

    closeWinnerModal(){
      document.getElementById('modalWinner').classList.remove('open');
    },

    showBigStoneModal(candidates){
      const overlay = document.getElementById('modalBigStone');
      document.getElementById('bigStoneCandidates').innerHTML = candidates.map(c =>
        `<div class="bigstone-chip">${c.name}</div>`
      ).join('');
      document.getElementById('bigStoneResult').textContent = '';
      overlay.classList.add('open');
    },

    closeBigStoneModal(){
      document.getElementById('modalBigStone').classList.remove('open');
    },

    // ---------------- CONFETTI ----------------
    launchConfetti(){
      const canvas = document.getElementById('confettiCanvas');
      const ctx = canvas.getContext('2d');
      const parent = canvas.parentElement;
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
      const colors = ['#f4c430','#2ecc71','#e74c3c','#2196f3','#9b59b6','#ffffff'];
      let particles = [];
      for(let i=0;i<140;i++){
        particles.push({
          x: Math.random()*canvas.width,
          y: -20 - Math.random()*canvas.height*0.5,
          r: 4+Math.random()*6,
          c: colors[Math.floor(Math.random()*colors.length)],
          vy: 2+Math.random()*4,
          vx: -2+Math.random()*4,
          rot: Math.random()*360,
          vr: -8+Math.random()*16
        });
      }
      let frame = 0;
      const maxFrames = 220;
      function draw(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.rot += p.vr;
          ctx.save();
          ctx.translate(p.x,p.y);
          ctx.rotate(p.rot*Math.PI/180);
          ctx.fillStyle = p.c;
          ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*0.6);
          ctx.restore();
        });
        frame++;
        if(frame < maxFrames){
          requestAnimationFrame(draw);
        }else{
          ctx.clearRect(0,0,canvas.width,canvas.height);
        }
      }
      draw();
    },

    // ---------------- TOASTS ----------------
    toast(message, type='success'){
      const container = document.getElementById('toastContainer');
      const el = document.createElement('div');
      el.className = `toast ${type}`;
      el.textContent = message;
      container.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    },

    // ---------------- TELÃO ----------------
    openTelao(){
      document.getElementById('telaoOverlay').classList.add('open');
    },
    closeTelao(){
      document.getElementById('telaoOverlay').classList.remove('open');
      if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
    }
  };

  global.ScreenManager = ScreenManager;
})(window);
