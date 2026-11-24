/* ===========================================================
   alerts.js — AlertManager
   Avalia a proximidade de vitória de cada cartela após cada
   sorteio e gera alertas visuais/sonoros com três níveis:
   3 faltando (monitorando), 2 faltando (atenção), 1 faltando (iminente).
=========================================================== */
(function(global){

  const AlertManager = {
    activeAlerts: [], // {cardId, playerName, level, missing, cardId}
    lastLevels: {},   // cardId -> level, para evitar repetição excessiva

    levelFor(missing){
      if(missing === 3) return 'monitoring';
      if(missing === 2) return 'attention';
      if(missing === 1) return 'imminent';
      return null;
    },

    /** Reavalia todas as cartelas e retorna { alerts, changed, newAlerts } */
    evaluateAll(){
      const alerts = [];
      const newAlertsTriggered = [];

      CardManager.getAll().forEach(card => {
        if(card.status === 'winner') return;
        const missing = CardManager.missingCount(card);
        const level = this.levelFor(missing);

        if(level){
          card.status = level;
          const player = PlayerManager.getById(card.playerId);
          const alertObj = {
            cardId: card.id,
            playerName: player ? player.name : 'Desconhecido',
            level, missing
          };
          alerts.push(alertObj);

          if(this.lastLevels[card.id] !== level){
            newAlertsTriggered.push(alertObj);
          }
        }else{
          if(card.status !== 'winner') card.status = 'normal';
        }
        this.lastLevels[card.id] = level;
      });

      // Ordenar por proximidade (iminente primeiro)
      const order = { imminent:0, attention:1, monitoring:2 };
      alerts.sort((a,b)=> order[a.level]-order[b.level]);

      this.activeAlerts = alerts;
      CardManager.save();
      return { alerts, newAlerts: newAlertsTriggered };
    },

    reset(){
      this.activeAlerts = [];
      this.lastLevels = {};
    },

    messageFor(alert){
      if(alert.level === 'imminent') return `FALTA APENAS 1 NÚMERO! — ${alert.playerName}`;
      if(alert.level === 'attention') return `ATENÇÃO! ${alert.playerName} A 2 NÚMEROS DO BINGO!`;
      return `${alert.playerName} está monitorando (3 números faltando)`;
    }
  };

  global.AlertManager = AlertManager;
})(window);
