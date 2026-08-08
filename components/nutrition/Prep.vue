<script setup lang="ts">
import { computed, ref } from 'vue'
import { CAT_LABELS } from '~/data/nutritionProgram'
import { useNutrition } from '~/composables/useNutrition'
import { costPerDay, fmtEuro, lineCost, macrosOf, roundMacros } from '~/lib/nutritionStats'
import { isoOf, shiftIso } from '~/utils/sportStats'

// Onglet « Préparer » : trois étapes, dans l'ordre où on les fait.
//
//   1. je coche les plats et leurs portions ;
//   2. la liste de courses en sort, rangée par rayon ;
//   3. les conseils de préparation, à part.
//
// La liste se déduisait avant d'une fenêtre de 7 ou 14 jours du cycle livré : il
// fallait accepter le menu tel quel pour obtenir une liste juste, et le cycle
// s'affichait partout alors qu'il n'est qu'un pré-remplissage. Partir des portions
// réellement prévues rend la liste vraie pour trois jours comme pour deux semaines.
const props = defineProps<{ todayIso: string }>()

const {
  library, portionsOf, bumpPortions, setPortions, clearSelection, seedFromPlan,
  selectionSummary, selectionShopping, selectionPrep, daysCovered, stock, startDate, setStart,
  cost, isChecked, toggleChecked, clearChecked, setPrice, prices, baskets, addBasket, removeBasket,
} = useNutrition()

const step = ref<'plats' | 'courses' | 'prep'>('plats')

// Les plats qui se préparent à l'avance d'abord : ce sont eux qu'on cuisine en lot.
const dishes = computed(() => Object.values(library.value.recipes)
  .filter(r => !r.disabled && (r.kind === 'boite' || r.kind === 'diner'))
  .map(r => ({ r, macros: roundMacros(macrosOf(r.items, library.value.foods)) }))
  .sort((a, b) => Number(!!b.r.batch) - Number(!!a.r.batch) || a.r.name.localeCompare(b.r.name)))

const chosen = computed(() => dishes.value.filter(d => portionsOf(d.r.id) > 0))
const money = computed(() => cost(selectionShopping.value))
const totalLines = computed(() => selectionShopping.value.reduce((n, s) => n + s.lines.length, 0))
const doneLines = computed(() => selectionShopping.value
  .reduce((n, s) => n + s.lines.filter(l => isChecked(l.food.id)).length, 0))

const perDay = computed(() => costPerDay(money.value.total, Math.max(1, daysCovered.value)))

const leftInFridge = computed(() => Object.entries(stock.value)
  .filter(([, n]) => n > 0)
  .map(([id, n]) => ({ name: library.value.recipes[id]?.name ?? id, n })))

function onPrice(foodId: string, ev: Event) {
  const raw = (ev.target as HTMLInputElement).value.replace(',', '.').trim()
  const v = raw === '' ? null : Number.parseFloat(raw)
  setPrice(foodId, v !== null && Number.isFinite(v) ? v : null)
}
const priceOf = (foodId: string) => (prices.value[foodId] ?? '')

function saveBasket() {
  addBasket(money.value.total, Math.max(1, daysCovered.value), props.todayIso)
  clearChecked()
}

function reseed() {
  if (selectionSummary.value.portions > 0
    && !confirm('Remplacer ta sélection par les 14 jours pré-configurés ?')) return
  seedFromPlan()
}

/**
 * Le lundi à venir — et non le dimanche où l'on cuisine.
 *
 * Le CYCLE livré a son index 0 sur un LUNDI : c'est ce jour-là que commence le
 * plan. Démarrer un dimanche décalerait tous les menus d'un jour, et les plats
 * tomberaient à côté des jours de salle. Cuisiner la veille ne change pas le
 * premier jour du suivi : on prépare le dimanche, le plan démarre le lundi.
 */
const nextMonday = computed(() => {
  const d = new Date(props.todayIso + 'T00:00:00')
  const dow = (d.getDay() + 6) % 7 // 0 = lundi
  return dow === 0 ? props.todayIso : shiftIso(props.todayIso, 7 - dow)
})
const startLabel = computed(() => {
  if (!startDate.value) return 'Pas encore démarré'
  const d = new Date(startDate.value + 'T00:00:00')
  return `Démarré le ${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`
})
</script>

<template>
  <div class="stack">
    <nav class="nu-steps">
      <button class="nu-step" :class="{ on: step === 'plats' }" @click="step = 'plats'">
        <span class="nu-step-n">1</span><span>Ce que je cuisine</span>
        <span v-if="selectionSummary.portions" class="nu-step-b mono">{{ selectionSummary.portions }}</span>
      </button>
      <button class="nu-step" :class="{ on: step === 'courses' }" :disabled="!selectionSummary.portions" @click="step = 'courses'">
        <span class="nu-step-n">2</span><span>Courses</span>
        <span v-if="totalLines" class="nu-step-b mono">{{ doneLines }}/{{ totalLines }}</span>
      </button>
      <button class="nu-step" :class="{ on: step === 'prep' }" :disabled="!selectionSummary.portions" @click="step = 'prep'">
        <span class="nu-step-n">3</span><span>Préparation</span>
      </button>
    </nav>

    <!-- ─── 1. Ce que je cuisine ──────────────────────────────────────── -->
    <template v-if="step === 'plats'">
      <div class="card nu-selsum">
        <div class="nu-selsum-main">
          <span class="nu-selsum-v mono">{{ selectionSummary.portions }}</span>
          <span class="nu-selsum-l">portion{{ selectionSummary.portions > 1 ? 's' : '' }} · {{ selectionSummary.dishes }} plat{{ selectionSummary.dishes > 1 ? 's' : '' }}</span>
        </div>
        <div class="muted">
          <template v-if="selectionSummary.portions">
            De quoi couvrir environ <b>{{ daysCovered }} jours</b> de midis et de dîners.
          </template>
          <template v-else>
            Coche les plats que tu vas cuisiner et indique combien de portions de chacun.
            La liste de courses et les conseils de préparation en découlent.
          </template>
        </div>
        <div class="nav-row">
          <button class="btn" @click="reseed()">↺ Partir des 14 jours livrés</button>
          <button v-if="selectionSummary.portions" class="btn" @click="clearSelection()">Tout vider</button>
        </div>
      </div>

      <!-- Le démarrage n'existe que pour pré-remplir les 14 premiers jours. Passé
           ce délai plus rien n'est proposé d'office : c'est la sélection qui pilote. -->
      <div class="card nu-start">
        <div class="row-between">
          <div class="section-label">Démarrage du plan livré</div>
          <span class="mono muted">{{ startLabel }}</span>
        </div>
        <p class="muted mt-6">
          Les 14 premiers jours sont pré-remplis avec le menu calculé pour toi. Au-delà,
          l'appli ne propose plus rien d'elle-même — tu choisis.
          <br>
          Le plan commence un <b>lundi</b> : c'est le premier jour où tu manges, pas le
          jour où tu cuisines. Démarrer la veille décalerait tous les menus d'un jour.
        </p>
        <div class="nav-row mt-6">
          <button class="btn" :class="{ sel: startDate === nextMonday }" @click="setStart(nextMonday)">
            Lundi {{ nextMonday.slice(8) }}/{{ nextMonday.slice(5, 7) }}
          </button>
          <button class="btn" :class="{ sel: startDate === props.todayIso }" @click="setStart(props.todayIso)">Aujourd'hui</button>
          <button v-if="startDate" class="btn" @click="setStart(null)">Effacer</button>
        </div>
      </div>

      <div v-if="leftInFridge.length" class="card nu-fridge">
        <div class="section-label mb-8">Reste au frigo</div>
        <div class="nu-fridge-list">
          <span v-for="f in leftInFridge" :key="f.name" class="nu-fridge-item">
            {{ f.name }} <b class="mono">× {{ f.n }}</b>
          </span>
        </div>
      </div>

      <div class="nu-grid">
        <article v-for="{ r, macros } in dishes" :key="r.id" class="card nu-plat" :class="{ picked: portionsOf(r.id) > 0 }">
          <NutritionThumb :id="r.id" :label="r.name" class="nu-plat-cover" />
          <div class="nu-plat-body">
            <div class="nu-plat-kind mono">
              {{ r.kind === 'boite' ? 'Déjeuner' : 'Dîner' }}<template v-if="r.batch"> · à l'avance</template>
            </div>
            <h4 class="nu-plat-name">{{ r.name }}</h4>
            <div class="nu-plat-macros">
              <span class="nu-plat-kcal mono">{{ macros.kcal }}</span>
              <span class="mono muted">{{ macros.p }} P · {{ macros.g }} G · {{ macros.l }} L</span>
            </div>
            <p class="nu-plat-items muted">{{ r.items.map(i => `${library.foods[i.food]?.name ?? i.food} ${i.g} g`).join(' · ') }}</p>
            <p v-if="r.steps" class="nu-plat-steps muted">{{ r.steps }}</p>
            <div class="nu-stepper">
              <button class="nu-stepper-b" :disabled="!portionsOf(r.id)" @click="bumpPortions(r.id, -1)">−</button>
              <input
                class="nu-stepper-v mono" type="number" inputmode="numeric" min="0" max="30"
                :value="portionsOf(r.id)"
                @input="setPortions(r.id, Number((($event.target as HTMLInputElement).value)) || 0)"
              >
              <button class="nu-stepper-b" @click="bumpPortions(r.id, 1)">+</button>
              <span class="nu-stepper-l muted">portions</span>
            </div>
          </div>
        </article>
      </div>
    </template>

    <!-- ─── 2. Courses ────────────────────────────────────────────────── -->
    <template v-else-if="step === 'courses'">
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

      <p class="nu-note">
        La liste couvre les plats choisis <b>et</b> le quotidien — petit-déjeuner,
        collations, shaker, créatine — dosé sur les {{ daysCovered }} jours que ta
        sélection représente. Ces aliments-là ne se choisissent pas, mais ils s'achètent.
      </p>
      <p v-if="money.missing.length" class="muted">
        Saisis le prix au kilo à côté de chaque aliment — une seule fois, il est mémorisé.
        Tant qu'il en manque, le total affiché est un minimum, pas le vrai prix du caddie.
      </p>

      <div class="row-between">
        <div class="section-label">{{ doneLines }} / {{ totalLines }} pris</div>
        <button class="btn" :disabled="!doneLines" @click="clearChecked()">Tout décocher</button>
      </div>

      <!-- Rangée par rayon et dans l'ordre des allées : on remonte le magasin une
           fois, au lieu de faire des allers-retours en suivant l'ordre des recettes. -->
      <div v-for="s in selectionShopping" :key="s.cat" class="card no-pad nu-shop-cat">
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
    </template>

    <!-- ─── 3. Préparation ────────────────────────────────────────────── -->
    <template v-else>
      <p class="muted">
        Regroupé par geste et non par recette : on ne cuit pas le riz de quatre plats
        en quatre fois. C'est l'ordre dans lequel on occupe une cuisine.
      </p>
      <div v-for="g in selectionPrep" :key="g.id" class="card nu-prep">
        <h4 class="nu-prep-title">{{ g.title }}</h4>
        <p class="nu-note">{{ g.hint }}</p>
        <ul class="nu-prep-steps">
          <li v-for="(st, i) in g.steps" :key="i">{{ st }}</li>
        </ul>
      </div>
      <div class="card nu-prep">
        <h4 class="nu-prep-title">Les plats retenus</h4>
        <div v-for="{ r } in chosen" :key="r.id" class="nu-prep-recipe">
          <div class="row-between">
            <strong class="flex-1">{{ r.name }}</strong>
            <span class="mono">× {{ portionsOf(r.id) }}</span>
          </div>
          <p v-if="r.steps" class="nu-steps">{{ r.steps }}</p>
        </div>
      </div>
    </template>
  </div>
</template>
