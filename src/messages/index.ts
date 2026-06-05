import { SupportedLang } from '../types';
import en from './en.json';
import es from './es.json';

const messages: Record<SupportedLang, Record<string, string>> = { en, es };

export function getMessage(lang: SupportedLang, key: string, params?: Record<string, any>): string {
  let template = messages[lang]?.[key] ?? messages[SupportedLang.ES]?.[key] ?? key;
  if (params) {
    Object.keys(params).forEach((param) => {
      template = template.replace(new RegExp(`{${param}}`, 'g'), String(params[param]));
    });
  }
  return template;
}

export function translate(lang: SupportedLang, key: string, params?: Record<string, any>): string {
  return getMessage(lang, key, params);
}
