<script setup lang="ts">
import { computed, ref } from 'vue'
import { CAT_LABELS, CAT_ORDER } from '~/data/nutritionProgram'
import type { FoodCat } from '~/data/nutritionProgram'
import { useNutrition } from '~/composables/useNutrition'
import { costPerDay, fmtEuro, lineCost } from '~/lib/nutritionStats'
import { shiftIso } from '~/utils/sportStats'

// Onglet « Courses » : liste agrégée sur 7 ou 14 jours, cochable, avec saisie du prix
// au kilo. Les prix sont vides au départ et mémorisés une fois pour toutes : ils varient
// trop d'une enseigne à l'autre pour être pré-remplis honnêtement.
const props = defineProps<{ todayIso: string }>()

const { shoppingWindow, cost, isChecked, toggleChecked, clearChecked, setPrice, prices, baskets, addBasket, removeBasket } = useNutrition()

const days = ref(14)
const from = computed(() => shiftIso(props.todayIso, 0))
const list = computed(() => shoppingWindow(from.value, days.value))
const money = computed(() => cost(list.value))

// Ordre magasin, et on saute les catégories vides.
const sections = computed(() => CAT_ORDER
  .map(cat => list.value.find(s => s.cat === cat))
  .filter((s): s is { cat: FoodCat, lines: typeof list.value[number]['lines'] } => !!s && s.lines.length > 0))

const totalLines = computed(() => list.value.reduce((n, s) => n + s.lines.length, 0))
const doneLines = computed(() => list.value.reduce((n, s) => n + s.lines.filter(l => isChecked(l.food.id)).length, 0))
const perDay = computed(() => costPerDay(money.value.total, days.value))

function onPrice(foodId: string, ev: Event) {
  const raw = (ev.target as HTMLInputElement).value.replace(',', '.').trim()
  const v = raw === '' ? null : Number.parseFloat(raw)
  setPrice(foodId, v !== null && Number.isFinite(v) ? v : null)
}
const priceOf = (foodId: string) => (prices.value[foodId] ?? '')

function saveBasket() {
  addBasket(money.value.total, days.value, props.todayIso)
  clearChecked()
}
</script>

<template>
  <div class="stack">
    <div class="nav-row">
      <button class="btn" :class="{ sel: days === 7 }" @click="days = 7">7 jours</button>
      <button class="btn" :class="{ sel: days === 14 }" @click="days = 14">14 jours</button>
      <button class="btn" :disabled="!doneLines" @click="clearChecked()">Tout décocher</button>
    </div>

    <div class="stat-grid">
      <div class="stat">
        <div class="stat-v">{{ money.total > 0 ? fmtEuro(money.total) : '—' }}</div>
        <div class="stat-l">{{ money.missing.length ? `Minimum · ${money.missing.length} prix manquants` : 'Total du panier' }}</div>
      </div>
      <div class="stat">
        <div class="stat-v">{{ perDay > 0 ? fmtEuro(perDay) : '—' }}</div>
        <div class="stat-l">Par jour couvert</div>
      </div>
    </div>

    <p v-if="money.missing.length" class="muted">
      Saisis le prix au kilo à côté de chaque aliment — une seule fois, il est mémorisé.
      Tant qu'il en manque, le total affiché est un minimum, pas le vrai prix du caddie.
    </p>

    <div class="section-label">Liste · {{ doneLines }} / {{ totalLines }} pris</div>

    <div v-for="s in sections" :key="s.cat" class="card no-pad nu-shop-cat">
      <h4 class="nu-cat-title">{{ CAT_LABELS[s.cat] }}</h4>
      <div v-for="l in s.lines" :key="l.food.id" class="nu-shop-line" :class="{ done: isChecked(l.food.id) }">
        <button class="nu-shop-check" :aria-label="`Cocher ${l.food.name}`" @click="toggleChecked(l.food.id)">
          {{ isChecked(l.food.id) ? '☑' : '☐' }}
        </button>
        <div class="nu-shop-name">
          {{ l.food.name }}
          <span v-if="l.food.buy" class="muted">{{ l.food.buy }}</span>
        </div>
        <div class="nu-shop-qty mono">{{ l.qty }}</div>
        <label class="nu-price">
          <input
            type="number" inputmode="decimal" step="0.05" min="0" placeholder="€/kg"
            :value="priceOf(l.food.id)" @input="onPrice(l.food.id, $event)"
          >
          <span v-if="prices[l.food.id]" class="nu-price-sum mono">{{ fmtEuro(lineCost(l.grams, prices[l.food.id])) }}</span>
        </label>
      </div>
    </div>

    <button class="btn-primary" :disabled="money.total <= 0" @click="saveBasket()">
      💶 Enregistrer ce panier{{ money.total > 0 ? ` — ${fmtEuro(money.total)}` : '' }}
    </button>
    <p class="muted center">Enregistrer archive le total et décoche la liste pour la prochaine fois.</p>

    <template v-if="baskets.length">
      <div class="section-label">Historique des courses</div>
      <div class="card no-pad">
        <div v-for="(b, i) in baskets" :key="b.date + i" class="nu-basket">
          <span class="mono">{{ b.date }}</span>
          <span class="muted">{{ b.days }} jours · {{ fmtEuro(costPerDay(b.total, b.days)) }}/jour</span>
          <strong class="mono">{{ fmtEuro(b.total) }}</strong>
          <button class="nu-del" aria-label="Supprimer" @click="removeBasket(i)">×</button>
        </div>
      </div>
    </template>
  </div>
</template>
