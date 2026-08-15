export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  decimals: number;
  region: string;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', decimals: 2, region: 'Europa' },
  { code: 'USD', name: 'Dólar Americano', symbol: '$', flag: '🇺🇸', decimals: 2, region: 'América do Norte' },
  { code: 'AOA', name: 'Kwanza Angolano', symbol: 'Kz', flag: '🇦🇴', decimals: 2, region: 'África' },
  { code: 'MZN', name: 'Metical Moçambicano', symbol: 'MT', flag: '🇲🇿', decimals: 2, region: 'África' },
  { code: 'BRL', name: 'Real Brasileiro', symbol: 'R$', flag: '🇧🇷', decimals: 2, region: 'América Latina' },
  { code: 'GBP', name: 'Libra Esterlina', symbol: '£', flag: '🇬🇧', decimals: 2, region: 'Europa' },
  { code: 'KWD', name: 'Dinar Kuwaitiano', symbol: 'KD', flag: '🇰🇼', decimals: 3, region: 'Médio Oriente' },
  { code: 'ZAR', name: 'Rand Sul-Africano', symbol: 'R', flag: '🇿🇦', decimals: 2, region: 'África' },
  { code: 'JPY', name: 'Iene Japonês', symbol: '¥', flag: '🇯🇵', decimals: 0, region: 'Ásia' },
  { code: 'CNY', name: 'Yuan Chinês', symbol: '¥', flag: '🇨🇳', decimals: 2, region: 'Ásia' },
  { code: 'STN', name: 'Dobra de São Tomé', symbol: 'Db', flag: '🇸🇹', decimals: 2, region: 'África' },
  { code: 'CVE', name: 'Escudo Cabo-verdiano', symbol: 'Esc', flag: '🇨🇻', decimals: 2, region: 'África' },
  { code: 'XOF', name: 'Franco CFA (BCEAO)', symbol: 'FCFA', flag: '🇸🇳', decimals: 0, region: 'África' },
  { code: 'XAF', name: 'Franco CFA (BEAC)', symbol: 'FCFA', flag: '🇨🇲', decimals: 0, region: 'África' },
  { code: 'CHF', name: 'Franco Suíço', symbol: 'CHF', flag: '🇨🇭', decimals: 2, region: 'Europa' },
  { code: 'CAD', name: 'Dólar Canadiano', symbol: 'CA$', flag: '🇨🇦', decimals: 2, region: 'América do Norte' },
  { code: 'AUD', name: 'Dólar Australiano', symbol: 'A$', flag: '🇦🇺', decimals: 2, region: 'Oceania' },
  { code: 'INR', name: 'Rupia Indiana', symbol: '₹', flag: '🇮🇳', decimals: 2, region: 'Ásia' },
  { code: 'AED', name: 'Dirham dos EAU', symbol: 'AED', flag: '🇦🇪', decimals: 2, region: 'Médio Oriente' },
  { code: 'SGD', name: 'Dólar de Singapura', symbol: 'S$', flag: '🇸🇬', decimals: 2, region: 'Ásia' },
  { code: 'SEK', name: 'Coroa Sueca', symbol: 'kr', flag: '🇸🇪', decimals: 2, region: 'Europa' },
];

export const CURRENCY_MAP = new Map<string, CurrencyInfo>(
  SUPPORTED_CURRENCIES.map(c => [c.code, c])
);

// Fallback rates against EUR (1 EUR = X currency)
export const FALLBACK_RATES_BASE_EUR: Record<string, number> = {
  EUR: 1.0,
  USD: 1.09,
  AOA: 1015.50,
  MZN: 69.40,
  BRL: 6.12,
  GBP: 0.84,
  KWD: 0.33,
  ZAR: 19.85,
  JPY: 168.20,
  CNY: 7.82,
  STN: 24.50,
  CVE: 110.26,
  XOF: 655.95,
  XAF: 655.95,
  CHF: 0.94,
  CAD: 1.48,
  AUD: 1.64,
  INR: 91.20,
  AED: 3.99,
  SGD: 1.45,
  SEK: 11.25,
};

/**
 * Format monetary amount according to currency code and locale options
 */
export function formatCurrency(
  amount: number | null | undefined, 
  currencyCode: string = 'EUR', 
  customOptions?: { compact?: boolean; hideSymbol?: boolean }
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0,00';
  }

  const currency = CURRENCY_MAP.get(currencyCode.toUpperCase()) || {
    code: currencyCode.toUpperCase(),
    symbol: currencyCode,
    decimals: 2,
    flag: '🏳️'
  };

  const decimals = currency.decimals;

  if (customOptions?.compact && Math.abs(amount) >= 1_000_000) {
    const formattedNum = (amount / 1_000_000).toLocaleString('pt-PT', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    });
    return customOptions.hideSymbol ? `${formattedNum}M` : `${formattedNum}M ${currency.symbol}`;
  }

  if (customOptions?.compact && Math.abs(amount) >= 10_000) {
    const formattedNum = (amount / 1_000).toLocaleString('pt-PT', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    });
    return customOptions.hideSymbol ? `${formattedNum}k` : `${formattedNum}k ${currency.symbol}`;
  }

  const formattedValue = amount.toLocaleString('pt-PT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  if (customOptions?.hideSymbol) {
    return formattedValue;
  }

  // Symbol placement preferences
  if (['USD', 'GBP', 'BRL', 'CAD', 'AUD', 'INR'].includes(currency.code)) {
    return `${currency.symbol} ${formattedValue}`;
  } else {
    return `${formattedValue} ${currency.symbol}`;
  }
}

export function getStoredCustomRates(): Record<string, { rate: number; updatedAt: string; isManual: boolean }> {
  try {
    const raw = localStorage.getItem('app_custom_exchange_rates');
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
}

export function saveCustomRate(code: string, rate: number): void {
  const custom = getStoredCustomRates();
  custom[code] = {
    rate,
    updatedAt: new Date().toISOString(),
    isManual: true
  };
  localStorage.setItem('app_custom_exchange_rates', JSON.stringify(custom));
  window.dispatchEvent(new Event('exchangeRatesUpdated'));
}

export function resetCustomRate(code: string): void {
  const custom = getStoredCustomRates();
  delete custom[code];
  localStorage.setItem('app_custom_exchange_rates', JSON.stringify(custom));
  window.dispatchEvent(new Event('exchangeRatesUpdated'));
}

export function getEffectiveRatesMap(baseApiRates: Record<string, number> = FALLBACK_RATES_BASE_EUR): Record<string, number> {
  const custom = getStoredCustomRates();
  const merged = { ...FALLBACK_RATES_BASE_EUR, ...baseApiRates };
  Object.keys(custom).forEach(code => {
    if (custom[code] && typeof custom[code].rate === 'number' && custom[code].rate > 0) {
      merged[code] = custom[code].rate;
    }
  });
  return merged;
}

/**
 * Converts value from baseCurrency to targetCurrency using a rates map (base EUR)
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  ratesBaseEur: Record<string, number> = FALLBACK_RATES_BASE_EUR
): number {
  if (fromCurrency === toCurrency) return amount;
  
  const effective = getEffectiveRatesMap(ratesBaseEur);
  const fromRate = effective[fromCurrency] || FALLBACK_RATES_BASE_EUR[fromCurrency] || 1;
  const toRate = effective[toCurrency] || FALLBACK_RATES_BASE_EUR[toCurrency] || 1;

  // Amount in EUR = amount / fromRate
  const amountInEur = amount / fromRate;
  // Amount in toCurrency = amountInEur * toRate
  return amountInEur * toRate;
}
