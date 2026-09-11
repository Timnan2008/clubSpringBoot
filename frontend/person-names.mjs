const clean = value => typeof value === 'string' ? value.trim() : '';
export function realNames(person) {
  return [...new Set([clean(person?.name), clean(person?.nameEn)].filter(Boolean))].join(' · ');
}
export function postName(person, english = false) {
  return clean(person?.nickname) || clean(english ? person?.nameEn : person?.name) || realNames(person);
}

export function searchName(person, query) {
  const q = clean(query).toLocaleLowerCase();
  if (!q) return {field: 'name', text: realNames(person)};
  const candidates = ['name', 'nameEn', 'nickname'].map(field => {
    const text = clean(person?.[field]), value = text.toLocaleLowerCase();
    return {field, text, score: value === q ? 3 : value.startsWith(q) ? 2 : value.includes(q) ? 1 : 0};
  }).filter(value => value.score > 0).sort((a,b) => b.score - a.score);
  return candidates[0] || {field: 'name', text: realNames(person)};
}
