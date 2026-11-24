/* ===========================================================
   bigstone.js — BigStoneManager (Pedra Maior)
   Sistema independente de desempate entre múltiplos ganhadores.
   Não interfere no sorteio principal.
=========================================================== */
(function(global){

  const BigStoneManager = {
    candidates: [], // {name, cardId}
    winner: null,

    startFromWinners(winnerCards){
      this.candidates = winnerCards.map(c => {
        const player = PlayerManager.getById(c.playerId);
        return { name: player ? player.name : 'Desconhecido', cardId: c.id };
      });
      this.winner = null;
      return this.candidates;
    },

    addExtraName(name){
      name = (name||'').trim();
      if(!name) return false;
      this.candidates.push({ name, cardId: null });
      return true;
    },

    draw(){
      if(this.candidates.length === 0) return null;
      const idx = Math.floor(Math.random() * this.candidates.length);
      this.winner = this.candidates[idx];
      return this.winner;
    },

    reset(){
      this.candidates = [];
      this.winner = null;
    }
  };

  global.BigStoneManager = BigStoneManager;
})(window);
