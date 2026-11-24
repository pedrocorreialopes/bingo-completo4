/* ===========================================================
   settings.js — SettingsManager
   Configurações globais: locutor, intervalo, efeitos sonoros,
   texto de vitória. Persistidas via PersistenceManager.
=========================================================== */
(function(global){

  const DEFAULTS = {
    voice: {
      enabled: true,
      voiceURI: null,       // selecionado pelo usuário / auto
      rate: 0.95,
      pitch: 1.0,
      volume: 1.0,
      delayBeforeSpeechMs: 650,
      announceAlerts: true
    },
    interval: {
      presetSeconds: 10,
      customSeconds: 10,
      isCustom: false,
      afterNarration: true
    },
    sound: {
      enabled: true,
      volume: 0.6
    },
    victoryTemplate: 'Bingo! Parabéns, {nome}, cartela número {cartela}!'
  };

  function deepMerge(base, override){
    const out = Array.isArray(base) ? [...base] : {...base};
    if(!override) return out;
    for(const k in override){
      if(override[k] && typeof override[k] === 'object' && !Array.isArray(override[k])){
        out[k] = deepMerge(base[k] || {}, override[k]);
      }else{
        out[k] = override[k];
      }
    }
    return out;
  }

  const SettingsManager = {
    data: null,

    load(){
      const saved = PersistenceManager.loadSettings();
      this.data = deepMerge(DEFAULTS, saved || {});
      return this.data;
    },

    save(){
      PersistenceManager.saveSettings(this.data);
    },

    get(path){
      return path.split('.').reduce((o,k)=> (o ? o[k] : undefined), this.data);
    },

    set(path, value){
      const parts = path.split('.');
      let obj = this.data;
      for(let i=0;i<parts.length-1;i++){
        obj = obj[parts[i]];
      }
      obj[parts[parts.length-1]] = value;
      this.save();
    },

    getIntervalSeconds(){
      const i = this.data.interval;
      return i.isCustom ? Number(i.customSeconds)||10 : Number(i.presetSeconds)||10;
    },

    reset(){
      this.data = JSON.parse(JSON.stringify(DEFAULTS));
      this.save();
    }
  };

  global.SettingsManager = SettingsManager;
})(window);
