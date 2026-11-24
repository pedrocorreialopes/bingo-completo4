/* ===========================================================
   players.js — PlayerManager
   Cadastro completo de participantes: CRUD, pesquisa,
   importação/exportação CSV.
=========================================================== */
(function(global){

  const PlayerManager = {
    players: [],

    load(){
      this.players = PersistenceManager.loadPlayers();
      return this.players;
    },

    save(){
      PersistenceManager.savePlayers(this.players);
    },

    getAll(){ return this.players; },

    getById(id){ return this.players.find(p => p.id === id); },

    create({name, doc='', phone=''}){
      const player = {
        id: PersistenceManager.nextId('P'),
        name: name.trim(),
        doc: (doc||'').trim(),
        phone: (phone||'').trim(),
        cardIds: [],
        createdAt: new Date().toISOString()
      };
      this.players.push(player);
      this.save();
      return player;
    },

    update(id, {name, doc, phone}){
      const p = this.getById(id);
      if(!p) return null;
      if(name != null) p.name = name.trim();
      if(doc != null) p.doc = doc.trim();
      if(phone != null) p.phone = phone.trim();
      this.save();
      return p;
    },

    remove(id){
      this.players = this.players.filter(p => p.id !== id);
      this.save();
    },

    search(term){
      const t = (term||'').toLowerCase().trim();
      if(!t) return this.players;
      return this.players.filter(p =>
        p.name.toLowerCase().includes(t) ||
        (p.doc||'').toLowerCase().includes(t) ||
        (p.phone||'').toLowerCase().includes(t)
      );
    },

    linkCard(playerId, cardId){
      const p = this.getById(playerId);
      if(p && !p.cardIds.includes(cardId)){
        p.cardIds.push(cardId);
        this.save();
      }
    },

    unlinkCard(playerId, cardId){
      const p = this.getById(playerId);
      if(p){
        p.cardIds = p.cardIds.filter(c => c !== cardId);
        this.save();
      }
    },

    exportCSV(){
      const header = 'id,nome,identificador,telefone,qtdCartelas\n';
      const rows = this.players.map(p =>
        [p.id, csvEscape(p.name), csvEscape(p.doc), csvEscape(p.phone), p.cardIds.length].join(',')
      );
      return header + rows.join('\n');
    },

    importCSV(text){
      const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
      if(lines.length === 0) return { imported:0, errors:[] };
      let start = 0;
      // detectar cabeçalho
      if(/nome/i.test(lines[0])) start = 1;
      let imported = 0;
      const errors = [];
      for(let i=start;i<lines.length;i++){
        const cols = parseCSVLine(lines[i]);
        const name = (cols[1] || cols[0] || '').trim();
        if(!name){ errors.push(`Linha ${i+1}: nome vazio`); continue; }
        const doc = cols[2] || '';
        const phone = cols[3] || '';
        this.create({name, doc, phone});
        imported++;
      }
      return { imported, errors };
    }
  };

  function csvEscape(str){
    str = String(str ?? '');
    if(str.includes(',') || str.includes('"') || str.includes('\n')){
      return '"' + str.replace(/"/g,'""') + '"';
    }
    return str;
  }

  function parseCSVLine(line){
    const result = [];
    let cur = '';
    let inQuotes = false;
    for(let i=0;i<line.length;i++){
      const ch = line[i];
      if(inQuotes){
        if(ch === '"'){
          if(line[i+1] === '"'){ cur+='"'; i++; } else { inQuotes = false; }
        }else cur += ch;
      }else{
        if(ch === '"') inQuotes = true;
        else if(ch === ','){ result.push(cur); cur=''; }
        else cur += ch;
      }
    }
    result.push(cur);
    return result;
  }

  global.PlayerManager = PlayerManager;
  global.csvParseLine = parseCSVLine;
})(window);
