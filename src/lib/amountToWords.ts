/**
 * Production Amount to Words conversion service for PavtiBook Web.
 * Exact functional parity with Android amount_to_words_service.dart.
 * Generates accurate representations strictly from numeric totals for English, Marathi, and Hindi.
 * If amount is <= 0 or conversion fails, returns blank ('') to prevent displaying incorrect financial data.
 */

const unitsEn: Record<number, string> = {
  0: '',
  1: 'One',
  2: 'Two',
  3: 'Three',
  4: 'Four',
  5: 'Five',
  6: 'Six',
  7: 'Seven',
  8: 'Eight',
  9: 'Nine',
  10: 'Ten',
  11: 'Eleven',
  12: 'Twelve',
  13: 'Thirteen',
  14: 'Fourteen',
  15: 'Fifteen',
  16: 'Sixteen',
  17: 'Seventeen',
  18: 'Eighteen',
  19: 'Nineteen',
};

const tensEn: Record<number, string> = {
  2: 'Twenty',
  3: 'Thirty',
  4: 'Forty',
  5: 'Fifty',
  6: 'Sixty',
  7: 'Seventy',
  8: 'Eighty',
  9: 'Ninety',
};

const numbersMr: Record<number, string> = {
  0: '',
  1: 'एक',
  2: 'दोन',
  3: 'तीन',
  4: 'चार',
  5: 'पाच',
  6: 'सहा',
  7: 'सात',
  8: 'आठ',
  9: 'नऊ',
  10: 'दहा',
  11: 'अकरा',
  12: 'बारा',
  13: 'तेरा',
  14: 'चौदा',
  15: 'पंधरा',
  16: 'सोळा',
  17: 'सतरा',
  18: 'अठरा',
  19: 'एकोणीस',
  20: 'वीस',
  21: 'एकवीस',
  22: 'बावीस',
  23: 'तेवीस',
  24: 'चोवीस',
  25: 'पंचवीस',
  26: 'सव्वीस',
  27: 'सत्तावीस',
  28: 'अठ्ठावीस',
  29: 'एकोणतीस',
  30: 'तीस',
  31: 'एकतीस',
  32: 'बत्तीस',
  33: 'तेहतीस',
  34: 'चौतीस',
  35: 'पस्तीस',
  36: 'छत्तीस',
  37: 'सदतीस',
  38: 'अडतीस',
  39: 'एकेचाळीस',
  40: 'चाळीस',
  41: 'एक्केचाळीस',
  42: 'बेचाळीस',
  43: 'त्रेचाळीस',
  44: 'चव्वेचाळीस',
  45: 'पंचेचाळीस',
  46: 'शेहेचाळीस',
  47: 'सत्तेचाळीस',
  48: 'अठ्ठेचाळीस',
  49: 'एकोणपन्नास',
  50: 'पन्नास',
  51: 'एक्कावन्न',
  52: 'बावन्न',
  53: 'त्रेपन्न',
  54: 'चोपन्न',
  55: 'पंचावन्न',
  56: 'छप्पन्न',
  57: 'सत्तावन्न',
  58: 'अठ्ठावन्न',
  59: 'एकोणसाठ',
  60: 'साठ',
  61: 'एकसष्ठ',
  62: 'पासष्ठ',
  63: 'त्रेसष्ठ',
  64: 'चौसष्ठ',
  65: 'पासष्ठ',
  66: 'सहासष्ठ',
  67: 'सदुसष्ठ',
  68: 'अडुसष्ठ',
  69: 'एकोणसत्तर',
  70: 'सत्तर',
  71: 'एकाहत्तर',
  72: 'बाहत्तर',
  73: 'त्र्याहत्तर',
  74: 'चौऱ्याहत्तर',
  75: 'पंच्याहत्तर',
  76: 'शहात्तर',
  77: 'सत्त्याहत्तर',
  78: 'अठ्ठ्याहत्तर',
  79: 'एकोणऐंशी',
  80: 'ऐंशी',
  81: 'एक्याऐंशी',
  82: 'ब्याऐंशी',
  83: 'त्र्याऐंशी',
  84: 'चौऱ्याऐंशी',
  85: 'पंच्याऐंशी',
  86: 'शहाऐंशी',
  87: 'सत्त्याऐंशी',
  88: 'अठ्ठ्याऐंशी',
  89: 'एकोणनव्वद',
  90: 'नव्वद',
  91: 'एक्याण्णव',
  92: 'ब्याण्णव',
  93: 'त्र्याण्णव',
  94: 'चौऱ्याण्णव',
  95: 'पंच्याण्णव',
  96: 'शहाण्णव',
  97: 'सत्त्याण्णव',
  98: 'अठ्ठ्याण्णव',
  99: 'नव्व्याण्णव',
  100: 'शंभर',
};

const numbersHi: Record<number, string> = {
  0: '',
  1: 'एक',
  2: 'दो',
  3: 'तीन',
  4: 'चार',
  5: 'पाँच',
  6: 'छह',
  7: 'सात',
  8: 'आठ',
  9: 'नौ',
  10: 'दस',
  11: 'ग्यारह',
  12: 'बारह',
  13: 'तेरह',
  14: 'चौदह',
  15: 'पंद्रह',
  16: 'सोलह',
  17: 'सत्रह',
  18: 'अठारह',
  19: 'उन्नीस',
  20: 'बीस',
  21: 'इक्कीस',
  22: 'बाईस',
  23: 'तेईस',
  24: 'चौबीस',
  25: 'पच्चीस',
  26: 'छब्बीस',
  27: 'सत्ताईस',
  28: 'अट्ठाईस',
  29: 'उनतीस',
  30: 'तीस',
  31: 'इकत्तीस',
  32: 'बत्तीस',
  33: 'तैंतीस',
  34: 'चौंतीस',
  35: 'पैंतीस',
  36: 'छत्तीस',
  37: 'सैंतीस',
  38: 'अड़तीस',
  39: 'उनतालीस',
  40: 'चालीस',
  41: 'इकतालीस',
  42: 'बयालीस',
  43: 'तैंतालीस',
  44: 'चवालीस',
  45: 'पैंतालीस',
  46: 'छियालीस',
  47: 'सैंतालीस',
  48: 'अड़तालीस',
  49: 'उनचास',
  50: 'पचास',
  51: 'इक्यावन',
  52: 'बावन',
  53: 'तिरपन',
  54: 'चौवन',
  55: 'पचपन',
  56: 'छप्पन',
  57: 'सत्तावन',
  58: 'अट्ठावन',
  59: 'उनसठ',
  60: 'साठ',
  61: 'इकसठ',
  62: 'बासठ',
  63: 'तिरसठ',
  64: 'चौंसठ',
  65: 'पैंसठ',
  66: 'छियासठ',
  67: 'सरसठ',
  68: 'अड़सठ',
  69: 'उनहत्तर',
  70: 'सत्तर',
  71: 'इकहत्तर',
  72: 'बहत्तर',
  73: 'तिहत्तर',
  74: 'चौहत्तर',
  75: 'पचहत्तर',
  76: 'छिहत्तर',
  77: 'सतहत्तर',
  78: 'अठहत्तर',
  79: 'उन्नासी',
  80: 'अस्सी',
  81: 'इक्यासी',
  82: 'बयासी',
  83: 'तिरासी',
  84: 'चौरासी',
  85: 'पचासी',
  86: 'छियासी',
  87: 'सत्तासी',
  88: 'अठासी',
  89: 'नवासी',
  90: 'नब्बे',
  91: 'इक्यानवे',
  92: 'बानवे',
  93: 'तिरानवे',
  94: 'चौरानवे',
  95: 'पंचानवे',
  96: 'छियानवे',
  97: 'सत्तानवे',
  98: 'अट्ठानवे',
  99: 'निन्यानवे',
  100: 'एक सौ',
};

function convertEnglish(n: number): string {
  if (n === 0) return 'Zero Rupees Only';

  function helper(num: number): string {
    if (num < 20) {
      return unitsEn[num] || '';
    }
    if (num < 100) {
      const tensVal = tensEn[Math.floor(num / 10)] || '';
      const unitsVal = unitsEn[num % 10] || '';
      return unitsVal ? `${tensVal} ${unitsVal}` : tensVal;
    }
    if (num < 1000) {
      const hundredVal = `${unitsEn[Math.floor(num / 100)]} Hundred`;
      const rem = num % 100;
      return rem !== 0 ? `${hundredVal} and ${helper(rem)}` : hundredVal;
    }
    if (num < 100000) {
      const thousandVal = `${helper(Math.floor(num / 1000))} Thousand`;
      const rem = num % 1000;
      return rem !== 0 ? `${thousandVal} ${helper(rem)}` : thousandVal;
    }
    if (num < 10000000) {
      const lakhVal = `${helper(Math.floor(num / 100000))} Lakh`;
      const rem = num % 100000;
      return rem !== 0 ? `${lakhVal} ${helper(rem)}` : lakhVal;
    }
    const croreVal = `${helper(Math.floor(num / 10000000))} Crore`;
    const rem = num % 10000000;
    return rem !== 0 ? `${croreVal} ${helper(rem)}` : croreVal;
  }

  return `${helper(n).trim()} Rupees Only`;
}

function convertMarathi(n: number): string {
  if (n === 0) return 'शून्य रुपये फक्त';

  function helper(num: number): string {
    if (num <= 100) {
      return numbersMr[num] || '';
    }
    if (num < 1000) {
      const h = Math.floor(num / 100);
      const rem = num % 100;
      const hStr = h === 1 ? 'एकशे' : `${numbersMr[h]}शे`;
      return rem !== 0 ? `${hStr} ${helper(rem)}` : hStr;
    }
    if (num < 100000) {
      const th = Math.floor(num / 1000);
      const rem = num % 1000;
      const thStr = `${helper(th)} हजार`;
      return rem !== 0 ? `${thStr} ${helper(rem)}` : thStr;
    }
    if (num < 10000000) {
      const lk = Math.floor(num / 100000);
      const rem = num % 100000;
      const lkStr = `${helper(lk)} लाख`;
      return rem !== 0 ? `${lkStr} ${helper(rem)}` : lkStr;
    }
    const cr = Math.floor(num / 10000000);
    const rem = num % 10000000;
    const crStr = `${helper(cr)} कोटी`;
    return rem !== 0 ? `${crStr} ${helper(rem)}` : crStr;
  }

  return `${helper(n).trim()} रुपये फक्त`;
}

function convertHindi(n: number): string {
  if (n === 0) return 'शून्य रुपये मात्र';

  function helper(num: number): string {
    if (num <= 100) {
      return numbersHi[num] || '';
    }
    if (num < 1000) {
      const h = Math.floor(num / 100);
      const rem = num % 100;
      const hStr = `${numbersHi[h]} सौ`;
      return rem !== 0 ? `${hStr} ${helper(rem)}` : hStr;
    }
    if (num < 100000) {
      const th = Math.floor(num / 1000);
      const rem = num % 1000;
      const thStr = `${helper(th)} हजार`;
      return rem !== 0 ? `${thStr} ${helper(rem)}` : thStr;
    }
    if (num < 10000000) {
      const lk = Math.floor(num / 100000);
      const rem = num % 100000;
      const lkStr = `${helper(lk)} लाख`;
      return rem !== 0 ? `${lkStr} ${helper(rem)}` : lkStr;
    }
    const cr = Math.floor(num / 10000000);
    const rem = num % 10000000;
    const crStr = `${helper(cr)} करोड़`;
    return rem !== 0 ? `${crStr} ${helper(rem)}` : crStr;
  }

  return `${helper(n).trim()} रुपये मात्र`;
}

export class AmountToWordsService {
  /**
   * Main entry point to convert an amount to words strictly from numeric total.
   * If amount <= 0 or conversion fails, returns blank ('').
   */
  static convert(amount: number | null | undefined, languageCode: string = 'mr'): string {
    if (amount == null || isNaN(amount) || !isFinite(amount) || amount <= 0) {
      return '';
    }

    try {
      const integerPart = Math.floor(amount);
      if (integerPart <= 0) return '';

      const lang = languageCode.toLowerCase().trim();
      if (lang === 'en' || lang === 'english') {
        return convertEnglish(integerPart);
      } else if (lang === 'hi' || lang === 'hindi') {
        return convertHindi(integerPart);
      } else {
        return convertMarathi(integerPart);
      }
    } catch {
      return '';
    }
  }
}
