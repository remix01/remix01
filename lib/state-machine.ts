export const POVPRASEVANJE_TRANSITIONS: Record<string, string[]> = {
  odprto: ['dodeljeno', 'preklicano'],
  dodeljeno: ['v_izvedbi', 'preklicano'],
  v_izvedbi: ['zakljuceno', 'sporno'],
  zakljuceno: ['ocenjeno', 'sporno'],
  ocenjeno: [], // terminal
  sporno: ['zakljuceno', 'preklicano'],
  preklicano: [], // terminal
}

export const PONUDBA_TRANSITIONS: Record<string, string[]> = {
  poslana: ['sprejeta', 'zavrnjena', 'umaknjena'],
  sprejeta: ['v_izvedbi', 'umaknjena'],
  v_izvedbi: ['zakljucena'],
  zakljucena: [],
  zavrnjena: [],
  umaknjena: [],
}
