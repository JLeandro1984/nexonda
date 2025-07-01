import i18n from './lang.js';

export function traduzir(key) {
  //ToDo - obter tradução do idioma selecionado
  const json = i18n.getCurrentTranslations();
  return json[key] || key;
}