/* ===========================================================
   winner.js — WinnerDetector
   Verifica, após cada sorteio, se alguma cartela foi completada.
   Suporta múltiplos ganhadores simultâneos na mesma bola.
=========================================================== */
(function(global){

  const WinnerDetector = {
    /** Retorna lista de cartelas recém-vencedoras (ainda não marcadas como winner) */
    checkWinners(lastNumber){
      const winners = [];
      CardManager.getAll().forEach(card => {
        if(card.status === 'winner') return;
        if(CardManager.isComplete(card)){
          card.status = 'winner';
          card.winAt = {
            number: lastNumber,
            datetime: new Date().toISOString()
          };
          winners.push(card);
        }
      });
      if(winners.length) CardManager.save();
      return winners;
    },

    getAllWinners(){
      return CardManager.getAll().filter(c => c.status === 'winner');
    }
  };

  global.WinnerDetector = WinnerDetector;
})(window);
