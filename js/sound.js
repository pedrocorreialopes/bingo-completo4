/* ===========================================================
   sound.js — Efeitos sonoros via Web Audio API (sintetizados,
   sem dependência de arquivos externos — funciona 100% offline)
=========================================================== */
(function(global){

  let ctx = null;
  function getCtx(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(AC) ctx = new AC();
    }
    return ctx;
  }

  function envelopeTone(freq, duration, type='sine', startGain=0.25, when=0){
    const settings = SettingsManager.data.sound;
    if(!settings.enabled) return;
    const c = getCtx();
    if(!c) return;
    if(c.state === 'suspended') c.resume();
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(startGain * settings.volume, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  const SoundManager = {
    unlock(){
      const c = getCtx();
      if(c && c.state === 'suspended') c.resume();
    },
    gameStart(){
      envelopeTone(523,0.15,'triangle',0.3,0);
      envelopeTone(659,0.15,'triangle',0.3,0.15);
      envelopeTone(784,0.25,'triangle',0.3,0.3);
    },
    drawSpin(){
      envelopeTone(300,0.4,'sawtooth',0.08,0);
    },
    reveal(){
      envelopeTone(880,0.12,'square',0.2,0);
      envelopeTone(1046,0.18,'square',0.2,0.1);
    },
    alertProximity(level){
      if(level === 'imminent'){
        envelopeTone(1200,0.12,'square',0.25,0);
        envelopeTone(1200,0.12,'square',0.25,0.18);
      }else{
        envelopeTone(900,0.14,'square',0.18,0);
      }
    },
    bingo(){
      [523,659,784,1046,1318].forEach((f,i)=> envelopeTone(f,0.35,'triangle',0.3, i*0.14));
    },
    bigStone(){
      [440,554,659,880].forEach((f,i)=> envelopeTone(f,0.3,'sine',0.25, i*0.18));
    },
    victory(){
      const notes=[523,659,784,1046,784,1046,1318];
      notes.forEach((f,i)=> envelopeTone(f,0.3,'triangle',0.28, i*0.15));
    },
    pause(){
      envelopeTone(300,0.2,'sine',0.2,0);
    },
    click(){
      envelopeTone(700,0.06,'square',0.12,0);
    }
  };

  global.SoundManager = SoundManager;
})(window);
