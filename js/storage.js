/* ===========================================================
   storage.js — PersistenceManager
   Camada única de leitura/gravação em localStorage.
   Mantém: jogo atual, último jogo finalizado, participantes,
   cartelas e configurações — com backup/restauração completos.
=========================================================== */
(function(global){

  const KEYS = {
    CURRENT_GAME: 'bingo75_currentGame',
    LAST_FINISHED: 'bingo75_lastFinishedGame',
    PLAYERS: 'bingo75_players',
    CARDS: 'bingo75_cards',
    SETTINGS: 'bingo75_settings',
    SEQ: 'bingo75_seq'
  };

  function safeGet(key){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }catch(e){
      console.error('Erro ao ler storage', key, e);
      return null;
    }
  }

  function safeSet(key, value){
    try{
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    }catch(e){
      console.error('Erro ao gravar storage', key, e);
      return false;
    }
  }

  const PersistenceManager = {
    KEYS,

    // ---- Jogo atual (autosave contínuo) ----
    saveCurrentGame(state){ return safeSet(KEYS.CURRENT_GAME, state); },
    loadCurrentGame(){ return safeGet(KEYS.CURRENT_GAME); },
    clearCurrentGame(){ localStorage.removeItem(KEYS.CURRENT_GAME); },

    // ---- Último jogo finalizado (histórico separado) ----
    saveFinishedGame(state){ return safeSet(KEYS.LAST_FINISHED, state); },
    loadFinishedGame(){ return safeGet(KEYS.LAST_FINISHED); },

    // ---- Participantes ----
    savePlayers(list){ return safeSet(KEYS.PLAYERS, list); },
    loadPlayers(){ return safeGet(KEYS.PLAYERS) || []; },

    // ---- Cartelas ----
    saveCards(list){ return safeSet(KEYS.CARDS, list); },
    loadCards(){ return safeGet(KEYS.CARDS) || []; },

    // ---- Configurações ----
    saveSettings(obj){ return safeSet(KEYS.SETTINGS, obj); },
    loadSettings(){ return safeGet(KEYS.SETTINGS); },

    // ---- IDs sequenciais ----
    nextId(prefix){
      const seq = safeGet(KEYS.SEQ) || {};
      seq[prefix] = (seq[prefix] || 0) + 1;
      safeSet(KEYS.SEQ, seq);
      return `${prefix}${String(seq[prefix]).padStart(3,'0')}`;
    },

    // ---- Backup completo (exportação/importação JSON) ----
    exportBackupObject(){
      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        currentGame: this.loadCurrentGame(),
        lastFinishedGame: this.loadFinishedGame(),
        players: this.loadPlayers(),
        cards: this.loadCards(),
        settings: this.loadSettings()
      };
    },

    importBackupObject(obj){
      if(!obj || typeof obj !== 'object') throw new Error('Arquivo de backup inválido');
      if(obj.currentGame) this.saveCurrentGame(obj.currentGame);
      if(obj.lastFinishedGame) this.saveFinishedGame(obj.lastFinishedGame);
      if(Array.isArray(obj.players)) this.savePlayers(obj.players);
      if(Array.isArray(obj.cards)) this.saveCards(obj.cards);
      if(obj.settings) this.saveSettings(obj.settings);
      return true;
    },

    resetAll(){
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    }
  };

  global.PersistenceManager = PersistenceManager;
})(window);
