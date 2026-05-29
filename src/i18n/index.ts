import en from './en.json';
import es from './es.json';
import { SupportedLang } from '../types';

const messages: Record<SupportedLang, Record<string, string>> = { en, es };

export function translate(lang: SupportedLang, key: string, params?: Record<string, any>): string {
  let template = messages[lang][key] || key;
  if (params) {
    Object.keys(params).forEach(param => {
      // Reemplaza todas las ocurrencias del parámetro en la plantilla
      const value = params[param];
      template = template.replace(new RegExp(`{${param}}`, 'g'), String(value));
    });
  }
  return template;
}
