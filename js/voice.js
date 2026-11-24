/* ===========================================================
   voice.js — VoiceAnnouncer (Locutor Virtual)
   Módulo central de narração via Web Speech API (SpeechSynthesis).
   Responsável por: selecionar voz pt-BR, falar chamadas de bola,
   repetir última chamada, silenciar, anunciar vitórias/pedra maior.
=========================================================== */
(function(global){

  const synth = window.speechSynthesis || null;
  const supported = !!synth;

  let voices = [];
  let lastUtteranceText = '';
  let speaking = false;
  let queue = [];
  let onSpeakStartCb = null;
  let onSpeakEndCb = null;
  let muted = false;

  function loadVoices(){
    if(!supported) return [];
    voices = synth.getVoices() || [];
    return voices;
  }

  if(supported){
    loadVoices();
    synth.onvoiceschanged = loadVoices;
  }

  function ptBrVoices(){
    return voices.filter(v => /pt-BR|pt_BR/i.test(v.lang) || /português/i.test(v.name));
  }

  function pickDefaultVoice(){
    const ptVoices = ptBrVoices();
    if(ptVoices.length === 0) return voices[0] || null;
    // Preferir vozes com indícios de voz masculina/apresentador
    const maleHints = /male|homem|ricardo|daniel|felipe|antonio|carlos/i;
    const male = ptVoices.find(v => maleHints.test(v.name));
    return male || ptVoices[0];
  }

  function getSelectedVoice(){
    const uri = SettingsManager.get('voice.voiceURI');
    if(uri){
      const found = voices.find(v => v.voiceURI === uri);
      if(found) return found;
    }
    return pickDefaultVoice();
  }

  function buildUtterance(text){
    const u = new SpeechSynthesisUtterance(text);
    const v = getSelectedVoice();
    if(v) u.voice = v;
    u.lang = (v && v.lang) || 'pt-BR';
    u.rate = SettingsManager.get('voice.rate');
    u.pitch = SettingsManager.get('voice.pitch');
    u.volume = SettingsManager.get('voice.volume');
    return u;
  }

  function processQueue(){
    if(!supported || speaking || queue.length === 0 || muted) return;
    const { text, onEnd } = queue.shift();
    const u = buildUtterance(text);
    speaking = true;
    lastUtteranceText = text;
    if(onSpeakStartCb) onSpeakStartCb(text);
    u.onend = () => {
      speaking = false;
      if(onSpeakEndCb) onSpeakEndCb(text);
      if(onEnd) onEnd();
      processQueue();
    };
    u.onerror = () => {
      speaking = false;
      if(onSpeakEndCb) onSpeakEndCb(text);
      if(onEnd) onEnd();
      processQueue();
    };
    synth.speak(u);
  }

  const VoiceAnnouncer = {
    isSupported(){ return supported; },

    isSpeaking(){ return speaking; },

    onSpeakStart(cb){ onSpeakStartCb = cb; },
    onSpeakEnd(cb){ onSpeakEndCb = cb; },

    getVoices(){ return voices; },
    getPtBrVoices(){ return ptBrVoices(); },
    getDefaultVoice(){ return pickDefaultVoice(); },

    setMuted(val){
      muted = val;
      if(muted && supported){
        synth.cancel();
        queue = [];
        speaking = false;
      }
    },
    isMuted(){ return muted; },

    /** Fala um texto arbitrário, respeitando fila (não interrompe fala em curso). */
    speak(text, {onEnd, immediate=false} = {}){
      if(!supported || muted || !SettingsManager.get('voice.enabled')){
        if(onEnd) setTimeout(onEnd, 10);
        return;
      }
      if(immediate){
        synth.cancel();
        queue = [];
        speaking = false;
      }
      queue.push({ text, onEnd });
      processQueue();
    },

    /** Anuncia uma bola sorteada (número 1-75) após o delay configurado. */
    announceBall(numero, {onEnd} = {}){
      const frase = NumberWords.fraseChamada(numero);
      const delay = SettingsManager.get('voice.delayBeforeSpeechMs') || 0;
      setTimeout(() => {
        this.speak(frase, { onEnd });
      }, delay);
      return frase;
    },

    /** Repete a última chamada (sem novo sorteio). */
    repeatLast(lastNumero, {onEnd} = {}){
      if(lastNumero == null){
        if(onEnd) onEnd();
        return;
      }
      const frase = NumberWords.fraseChamada(lastNumero);
      this.speak(frase, { onEnd, immediate: true });
    },

    announceVictory(text, {onEnd} = {}){
      this.speak(text, { onEnd, immediate: false });
    },

    announceBigStoneIntro(onEnd){
      this.speak('Vamos à pedra maior!', { onEnd });
    },

    announceBigStoneWinner(nome, onEnd){
      this.speak(`${nome} venceu a pedra maior! Parabéns!`, { onEnd });
    },

    /** Para qualquer fala em andamento imediatamente (comando explícito). */
    stopImmediate(){
      if(supported){
        synth.cancel();
      }
      queue = [];
      speaking = false;
    },

    getLastUtteranceText(){ return lastUtteranceText; }
  };

  global.VoiceAnnouncer = VoiceAnnouncer;
})(window);
