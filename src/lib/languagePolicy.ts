/**
 * Language Policy and System Prompt directives for AI Services
 * Supports the 7 standard languages: pt-BR, pt-PT, en, fr, de, ru, es
 */

export const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  'pt-BR': 'Português (Brasil)',
  'pt-PT': 'Português (Portugal / Angola)',
  'en': 'English',
  'fr': 'Français',
  'de': 'Deutsch',
  'ru': 'Русский',
  'es': 'Español'
};

/**
 * Builds structured language prompt instructions to attach to AI requests.
 */
export function buildLanguagePrompt(languageCode: string): string {
  const code = languageCode || 'pt-PT';
  const name = LANGUAGE_DISPLAY_NAMES[code] || 'Português (Portugal / Angola)';

  return `[DIRETIVA DE IDIOMA E INTERNACIONALIZAÇÃO]
Responda exclusivamente em **${name} (${code})**. Traduza títulos, explicações, botões, mensagens de erro, exemplos e texto de interface. Preserve códigos contabilísticos (ex: PGC Angola, IFRS, IAS, SNC, NBC), nomes próprios de entidades, números, fórmulas, unidades e a estrutura Markdown. Não misture idiomas, salvo quando uma expressão técnica original for indispensável. Se o utilizador pedir uma tradução, traduza apenas para o idioma selecionado (${code}).`;
}

export function getLanguageName(languageCode: string): string {
  return LANGUAGE_DISPLAY_NAMES[languageCode] || 'Português';
}
