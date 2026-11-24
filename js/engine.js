/* ===========================================================
   engine.js — BingoEngine + BallDrawManager
   Motor central do sorteio: gera números aleatórios sem
   repetição, controla estados (idle/running/paused/finished),
   orquestra animação + narração + intervalo + detecção de vitória.
=========================================================== */
(function(global){

  const STATES = { IDLE:'idle', RUNNING:'running', PAUSED:'paused', FINISHED:'finished' };

  function shuffledPool(){
    const arr = [];
    for(let i=1;i<=75;i++) arr.push(i);
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]] = [arr[j],arr[i]];
    }
    return arr;
  }

  const BingoEngine = {
    state: STATES.IDLE,
    pool: [],          // números restantes
    drawnHistory: [],  // ordem cronológica dos sorteados
    startedAt: null,
    finishedAt: null,
    countdownTimer: null,
    countdownRemaining: 0,
    autoMode: true,
    winners: [],        // ganhadores confirmados da partida atual
    callbacks: {},      // hooks para UI

    on(event, fn){ this.callbacks[event] = fn; },
    emit(event, payload){ if(this.callbacks[event]) this.callbacks[event](payload); },

    // ---------------- Ciclo de vida ----------------
    newGame(){
      this.state = STATES.IDLE;
      this.pool = shuffledPool();
      this.drawnHistory = [];
      this.startedAt = null;
      this.finishedAt = null;
      this.winners = [];
      clearInterval(this.countdownTimer);
      this.countdownRemaining = 0;
      CardManager.resetAllMarks();
      AlertManager.reset();
      this.persist();
      this.emit('stateChange', this.state);
      this.emit('reset');
    },

    startGame(){
      if(this.state === STATES.FINISHED || this.pool.length === 0){
        this.newGame();
      }
      this.state = STATES.RUNNING;
      this.startedAt = this.startedAt || new Date().toISOString();
      this.persist();
      this.emit('stateChange', this.state);
      SoundManager.gameStart();
      this.scheduleNextDraw(1200);
    },

    pause(){
      if(this.state !== STATES.RUNNING) return;
      this.state = STATES.PAUSED;
      clearInterval(this.countdownTimer);
      this.persist();
      this.emit('stateChange', this.state);
      SoundManager.pause();
    },

    resume(){
      if(this.state !== STATES.PAUSED) return;
      this.state = STATES.RUNNING;
      this.persist();
      this.emit('stateChange', this.state);
      this.scheduleNextDraw(800);
    },

    finish(){
      this.state = STATES.FINISHED;
      this.finishedAt = new Date().toISOString();
      clearInterval(this.countdownTimer);
      VoiceAnnouncer.stopImmediate();
      this.persist(true);
      this.emit('stateChange', this.state);
    },

    // ---------------- Sorteio ----------------
    canDraw(){
      return this.pool.length > 0 && this.state !== STATES.FINISHED;
    },

    /** Executa um sorteio (manual ou automático). */
    drawNext(manual=false){
      if(!this.canDraw()) return null;
      if(this.state === STATES.PAUSED && !manual) return null;
      clearInterval(this.countdownTimer);

      const number = this.pool.pop();
      this.emit('drawStart', number);
      SoundManager.drawSpin();

      // Simula animação de sorteio (urna girando) antes de revelar
      setTimeout(() => {
        this.drawnHistory.push(number);
        this.persist();
        SoundManager.reveal();
        this.emit('ballRevealed', { number, history: this.drawnHistory });

        // Marca nas cartelas
        const affectedCards = CardManager.markNumberEverywhere(number);
        this.emit('cardsUpdated', affectedCards);

        // Avalia alertas de proximidade
        const { alerts, newAlerts } = AlertManager.evaluateAll();
        this.emit('alertsUpdated', { alerts, newAlerts });
        newAlerts.forEach(a => {
          SoundManager.alertProximity(a.level);
          if(SettingsManager.get('voice.announceAlerts') && a.level === 'imminent'){
            VoiceAnnouncer.speak(`${a.playerName}, falta apenas um número!`);
          }
        });

        // Narração da bola
        this.emit('speakingStart', number);
        VoiceAnnouncer.announceBall(number, {
          onEnd: () => {
            this.emit('speakingEnd', number);
            this.afterAnnounce(number);
          }
        });
      }, 900);

      return number;
    },

    /** Chamado após o fim da narração: checa vencedores e agenda próxima bola. */
    afterAnnounce(number){
      const winners = WinnerDetector.checkWinners(number);
      if(winners.length > 0){
        this.winners = winners;
        this.state = STATES.PAUSED; // interrompe sorteio automático
        clearInterval(this.countdownTimer);
        SoundManager.bingo();
        this.persist(true);
        this.emit('winnersDetected', winners);
        return; // não agenda próxima bola
      }

      if(this.pool.length === 0){
        this.finish();
        this.emit('poolExhausted');
        return;
      }

      if(this.state === STATES.RUNNING && this.autoMode){
        this.scheduleNextDraw();
      }
    },

    /** Agenda a contagem regressiva e o próximo sorteio automático. */
    scheduleNextDraw(forceMs){
      clearInterval(this.countdownTimer);
      const seconds = forceMs ? Math.ceil(forceMs/1000) : SettingsManager.getIntervalSeconds();
      this.countdownRemaining = seconds;
      this.emit('countdownTick', { remaining: this.countdownRemaining, total: seconds });

      this.countdownTimer = setInterval(() => {
        if(this.state !== STATES.RUNNING){
          clearInterval(this.countdownTimer);
          return;
        }
        this.countdownRemaining -= 1;
        this.emit('countdownTick', { remaining: this.countdownRemaining, total: seconds });
        if(this.countdownRemaining <= 0){
          clearInterval(this.countdownTimer);
          if(this.state === STATES.RUNNING) this.drawNext(false);
        }
      }, 1000);
    },

    /** Desfaz o último sorteio (requer confirmação externa feita na UI). */
    undoLast(){
      if(this.drawnHistory.length === 0) return null;
      const number = this.drawnHistory.pop();
      this.pool.push(number);
      CardManager.unmarkNumberEverywhere(number);
      AlertManager.evaluateAll();
      this.persist();
      this.emit('undone', number);
      return number;
    },

    repeatLastCall(){
      const last = this.drawnHistory[this.drawnHistory.length - 1];
      if(last == null) return;
      this.emit('repeatCall', last);
      VoiceAnnouncer.repeatLast(last);
    },

    getLastNumber(){
      return this.drawnHistory[this.drawnHistory.length - 1] ?? null;
    },

    getProgress(){
      return {
        drawn: this.drawnHistory.length,
        remaining: this.pool.length,
        percent: Math.round((this.drawnHistory.length/75)*100)
      };
    },

    // ---------------- Persistência ----------------
    persist(toFinishedToo){
      const state = {
        state: this.state,
        pool: this.pool,
        drawnHistory: this.drawnHistory,
        startedAt: this.startedAt,
        finishedAt: this.finishedAt,
        winners: this.winners.map(w=>w.id),
        savedAt: new Date().toISOString()
      };
      PersistenceManager.saveCurrentGame(state);
      if(toFinishedToo){
        PersistenceManager.saveFinishedGame({
          ...state,
          players: PlayerManager.getAll(),
          cards: CardManager.getAll()
        });
      }
    },

    hasSavedGame(){
      const g = PersistenceManager.loadCurrentGame();
      return !!(g && g.drawnHistory && g.drawnHistory.length > 0 && g.state !== STATES.FINISHED);
    },

    restoreGame(){
      const g = PersistenceManager.loadCurrentGame();
      if(!g) return false;
      this.state = g.state === STATES.RUNNING ? STATES.PAUSED : g.state; // sempre retorna pausado por segurança
      this.pool = g.pool || shuffledPool();
      this.drawnHistory = g.drawnHistory || [];
      this.startedAt = g.startedAt;
      this.finishedAt = g.finishedAt;
      this.winners = [];
      this.emit('restored', g);
      this.emit('stateChange', this.state);
      return true;
    },

    STATES
  };

  global.BingoEngine = BingoEngine;
})(window);
