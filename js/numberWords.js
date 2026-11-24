/* ===========================================================
   numberWords.js — Conversão de números para extenso em PT-BR
   Usado pelo locutor virtual para falar os números corretamente.
=========================================================== */
(function(global){
  const UNIDADES = ['zero','um','dois','três','quatro','cinco','seis','sete','oito','nove'];
  const DEZ_DEZENOVE = ['dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const DEZENAS = ['', '', 'vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];

  /** Converte número de 0 a 99 para texto por extenso em português. */
  function numeroParaExtenso(n){
    n = Math.trunc(Math.abs(n));
    if(n < 10) return UNIDADES[n];
    if(n < 20) return DEZ_DEZENOVE[n-10];
    const dezena = Math.floor(n/10);
    const unidade = n % 10;
    if(unidade === 0) return DEZENAS[dezena];
    return `${DEZENAS[dezena]} e ${UNIDADES[unidade]}`;
  }

  // Mapeamento fonético das letras do bingo para pronúncia natural em PT-BR
  const LETRA_FONETICA = {
    B: 'Bê',
    I: 'I',
    N: 'Êne',
    G: 'Gê',
    O: 'Ó'
  };

  function letraDaColuna(numero){
    if(numero >= 1 && numero <= 15) return 'B';
    if(numero >= 16 && numero <= 30) return 'I';
    if(numero >= 31 && numero <= 45) return 'N';
    if(numero >= 46 && numero <= 60) return 'G';
    if(numero >= 61 && numero <= 75) return 'O';
    return null;
  }

  function fraseChamada(numero){
    const letra = letraDaColuna(numero);
    const fonetica = LETRA_FONETICA[letra] || letra;
    const extenso = numeroParaExtenso(numero);
    return `${fonetica}, número ${extenso}!`;
  }

  global.NumberWords = { numeroParaExtenso, letraDaColuna, LETRA_FONETICA, fraseChamada };
})(window);
