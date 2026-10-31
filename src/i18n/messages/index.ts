import type { Locale } from '../config';
import type { Translation } from '../translate';
import { en } from './en';
import { fr } from './fr';
import { hi } from './hi';
import { ru } from './ru';

/** Registry of dictionaries. Add new languages here (and in ../config.ts). */
export const MESSAGES: Record<Locale, Translation> = { en, fr, hi, ru };
