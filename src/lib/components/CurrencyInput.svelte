<script lang="ts">
  import { getCurrency } from '../formatters';
  import type { Currency } from '../invoice';

  interface Props {
    value?: number;
    currency?: Currency | string;
    placeholder?: string;
    ariaLabel?: string;
    class?: string;
  }

  let {
    value = $bindable(0),
    currency = 'IDR',
    placeholder = '0',
    ariaLabel = 'Nominal',
    class: customClass = '',
  }: Props = $props();

  let isFocused = $state(false);
  let displayValue = $state('');

  let activeCurrency = $derived(
    typeof currency === 'string' ? getCurrency(currency) : currency
  );

  function formatDisplay(num: number): string {
    if (num === 0 && !isFocused) return '0';
    return new Intl.NumberFormat(activeCurrency.locale, {
      minimumFractionDigits: activeCurrency.code === 'JPY' ? 0 : 0,
      maximumFractionDigits: activeCurrency.code === 'JPY' ? 0 : 2,
    }).format(num);
  }

  $effect(() => {
    if (!isFocused) {
      displayValue = value !== undefined && value !== null ? formatDisplay(Number(value) || 0) : '0';
    }
  });

  function handleFocus() {
    isFocused = true;
    displayValue = value ? String(value) : '';
  }

  function handleInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/[^0-9.-]/g, '');
    displayValue = input.value;
    const parsed = parseFloat(raw);
    value = isNaN(parsed) ? 0 : parsed;
  }

  function handleBlur() {
    isFocused = false;
    displayValue = formatDisplay(value || 0);
  }
</script>

<div class="relative w-full">
  <input
    type="text"
    inputmode="decimal"
    value={displayValue}
    onfocus={handleFocus}
    oninput={handleInput}
    onblur={handleBlur}
    {placeholder}
    aria-label={ariaLabel}
    class="w-full text-right rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 tabular-nums transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 {customClass}"
  />
</div>
