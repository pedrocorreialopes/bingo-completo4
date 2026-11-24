/* ===========================================================
   cards.js — CardManager
   Cadastro e gerenciamento de cartelas de Bingo 75.
   Estrutura: 5 colunas (B,I,N,G,O) x 5 linhas, com espaço
   livre (FREE) no centro da coluna N, conforme padrão oficial.
=========================================================== */
(function(global){

  const RANGES = {
    B: [1,15],
    I: [16,30],
    N: [31,45],
    G: [46,60],
    O: [61,75]
  };
  const COLS = ['B','I','N','G','O'];

  function randomCardNumbers(){
    const grid = {};
    COLS.forEach(col => {
      const [min,max] = RANGES[col];
      const pool = [];
      for(let n=min;n<=max;n++) pool.push(n);
      // shuffle
      for(let i=pool.length-1;i>0;i--){
        const j = Math.floor(Math.random()*(i+1));
        [pool[i],pool[j]] = [pool[j],pool[i]];
      }
      grid[col] = pool.slice(0,5);
    });
    grid.N[2] = 'FREE'; // centro livre
    return grid;
  }

  function validateGrid(grid){
    const errors = [];
    const allNumbers = [];
    COLS.forEach(col => {
      const [min,max] = RANGES[col];
      const arr = grid[col];
      if(!Array.isArray(arr) || arr.length !== 5){
        errors.push(`Coluna ${col} deve ter 5 números.`);
        return;
      }
      arr.forEach((val, idx) => {
        if(col === 'N' && idx === 2 && (val === 'FREE' || val === '' || val == null)){
          return; // espaço livre permitido
        }
        const n = Number(val);
        if(!Number.isInteger(n) || n < min || n > max){
          errors.push(`${col}${idx+1}: valor "${val}" fora da faixa ${min}-${max}.`);
          return;
        }
        if(allNumbers.includes(n)){
          errors.push(`Número ${n} duplicado na cartela.`);
        }
        allNumbers.push(n);
      });
    });
    if(allNumbers.length !== 24 && errors.length === 0){
      errors.push('A cartela deve conter exatamente 24 números + espaço livre.');
    }
    return errors;
  }

  function flattenNumbers(grid){
    const nums = [];
    COLS.forEach(col => {
      grid[col].forEach(v => {
        if(v !== 'FREE' && v !== '' && v != null) nums.push(Number(v));
      });
    });
    return nums;
  }

  const CardManager = {
    cards: [],

    load(){
      this.cards = PersistenceManager.loadCards();
      return this.cards;
    },

    save(){
      PersistenceManager.saveCards(this.cards);
    },

    getAll(){ return this.cards; },
    getById(id){ return this.cards.find(c => c.id === id); },
    getByPlayer(playerId){ return this.cards.filter(c => c.playerId === playerId); },

    validateGrid,
    randomCardNumbers,
    flattenNumbers,
    COLS, RANGES,

    create({playerId, grid}){
      const errors = validateGrid(grid);
      if(errors.length) throw new Error(errors.join(' '));
      const card = {
        id: PersistenceManager.nextId('C'),
        playerId,
        grid,
        numbers: flattenNumbers(grid),
        marked: [],
        status: 'normal', // normal | monitoring | attention | imminent | winner
        winAt: null,
        createdAt: new Date().toISOString()
      };
      this.cards.push(card);
      this.save();
      PlayerManager.linkCard(playerId, card.id);
      return card;
    },

    update(id, {playerId, grid}){
      const card = this.getById(id);
      if(!card) throw new Error('Cartela não encontrada.');
      if(grid){
        const errors = validateGrid(grid);
        if(errors.length) throw new Error(errors.join(' '));
        card.grid = grid;
        card.numbers = flattenNumbers(grid);
      }
      if(playerId && playerId !== card.playerId){
        PlayerManager.unlinkCard(card.playerId, card.id);
        card.playerId = playerId;
        PlayerManager.linkCard(playerId, card.id);
      }
      this.save();
      return card;
    },

    remove(id){
      const card = this.getById(id);
      if(card) PlayerManager.unlinkCard(card.playerId, card.id);
      this.cards = this.cards.filter(c => c.id !== id);
      this.save();
    },

    resetAllMarks(){
      this.cards.forEach(c => { c.marked = []; c.status = 'normal'; c.winAt = null; });
      this.save();
    },

    /** Marca um número em todas as cartelas que o contenham. Retorna lista de cartelas afetadas. */
    markNumberEverywhere(number){
      const affected = [];
      this.cards.forEach(c => {
        if(c.numbers.includes(number) && !c.marked.includes(number)){
          c.marked.push(number);
          affected.push(c);
        }
      });
      if(affected.length) this.save();
      return affected;
    },

    unmarkNumberEverywhere(number){
      this.cards.forEach(c => {
        c.marked = c.marked.filter(n => n !== number);
        if(c.status === 'winner' && !this.isComplete(c)) {
          c.status = 'normal';
          c.winAt = null;
        }
      });
      this.save();
    },

    missingCount(card){
      return card.numbers.filter(n => !card.marked.includes(n)).length;
    },

    isComplete(card){
      return this.missingCount(card) === 0;
    },

    exportCSV(){
      const header = 'id,participanteId,B,I,N,G,O\n';
      const rows = this.cards.map(c => {
        const cols = COLS.map(col => c.grid[col].join('|'));
        return [c.id, c.playerId, ...cols].join(',');
      });
      return header + rows.join('\n');
    },

    importCSV(text){
      const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
      if(lines.length === 0) return { imported:0, errors:[] };
      let start = 0;
      if(/participante/i.test(lines[0])) start = 1;
      let imported = 0;
      const errors = [];
      for(let i=start;i<lines.length;i++){
        const cols = global.csvParseLine(lines[i]);
        const playerId = cols[1];
        if(!playerId || !PlayerManager.getById(playerId)){
          errors.push(`Linha ${i+1}: participante "${playerId}" não encontrado.`);
          continue;
        }
        try{
          const grid = {};
          COLS.forEach((col, idx) => {
            grid[col] = (cols[2+idx]||'').split('|').map(v => v === 'FREE' ? 'FREE' : Number(v));
          });
          this.create({playerId, grid});
          imported++;
        }catch(e){
          errors.push(`Linha ${i+1}: ${e.message}`);
        }
      }
      return { imported, errors };
    }
  };

  global.CardManager = CardManager;
})(window);
