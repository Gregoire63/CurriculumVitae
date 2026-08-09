<script setup lang="ts">
import { computed, ref } from 'vue'
import { CAT_LABELS } from '~/data/nutritionProgram'
import { useNutrition } from '~/composables/useNutrition'
import { costPerDay, expandItems, fmtEuro, lineCost, listDays, macrosOf, roundMacros, slotsOf } from '~/lib/nutritionStats'
import { shiftIso } from '~/utils/sportStats'

// Onglet « Préparer » : trois étapes, dans l'ordre où on les fait.
//
//   1. je choisis ma semaine et j'ajuste les jours ;
//   2. la liste de courses en sort, rangée par rayon ;
//   3. le programme de cuisine, réparti entre dimanche et mercredi.
//
// Il fallait avant cocher des plats et saisir des portions à la main, sans jamais
// voir à quel jour ils correspondaient — et le plan livré s'étalait sur quatorze
// jours, ce qui n'a aucun sens en cuisine : ça ne tient ni dans un frigo ni dans
// les durées de conservation. Une semaine type dit QUEL jour on mange QUOI ; les
// portions, les courses et les sessions de cuisine s'en déduisent toutes seules.
const props = defineProps<{ todayIso: string }>()

const {
  library, week, menus, activeWeek, setActiveMenu, applyMenuFrom, appliedFrom,
  setMenuSlot, toggleMenuDayOff, duplicateMenu, renameMenu, removeMenu, blankMenu,
  selectionSummary, selectionShopping, cookSessions, daysCovered, stock, freezer, setFreezer,
  cost, isChecked, toggleChecked, clearChecked, setPrice, prices, baskets, addBasket, removeBasket,
} = useNutrition()

const step = ref<'semaine' | 'courses' | 'cuisine'>('semaine')
const openDow = ref<number | null>(null)
const DOW = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

// ─── 1. Ma semaine ──────────────────────────────────────────────────────────
const macrosFor = (id: string) => {
  const r = library.value.recipes[id]
  return r ? roundMacros(macrosOf(expandItems(r, library.value), library.value.foods)) : null
}

/**
 * Les plats proposés pour un créneau. Un déjeuner peut être un plat du soir et
 * l'inverse : la distinction boîte / dîner dit comment le plat se transporte, pas à
 * quelle heure il se mange. Refuser le mélange obligeait à dupliquer des recettes.
 */
function optionsFor(slotId: string) {
  const kinds = slotId === 'pdj'
    ? ['pdj', 'collation']
    : slotId === 'lunch' || slotId === 'dinner'
      ? ['boite', 'diner']
      : ['collation', 'pdj']
  return Object.values(library.value.recipes)
    .filter(r => !r.disabled && kinds.includes(r.kind))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Les créneaux d'un jour : ils dépendent de la séance, réglée dans le planning. */
const daySlots = (dow: number) => slotsOf(week.value.gym[dow] === true)
const slotRecipe = (dow: number, slotId: string, fallback?: string) =>
  activeWeek.value?.days[dow]?.slots[slotId] ?? fallback ?? ''

const MAIN = new Set(['lunch', 'dinner'])
const days = computed(() => Array.from({ length: 7 }, (_, d) => {
  const slots = daySlots(d)
  const off = activeWeek.value?.days[d]?.off === true
  const main = slots.filter(s => MAIN.has(s.id))
  return {
    dow: d,
    name: DOW[d],
    off,
    gym: week.value.gym[d] === true,
    slots,
    main,
    others: slots.filter(s => !MAIN.has(s.id)),
    kcal: off ? 0 : main.reduce((n, s) => n + (macrosFor(slotRecipe(d, s.id, s.recipe))?.kcal ?? 0), 0),
  }
}))

/**
 * Le lundi à venir. On cuisine le dimanche, mais le plan DÉMARRE le lundi : c'est
 * le premier jour où l'on mange. Faire commencer la semaine la veille décalerait
 * les sept menus d'un jour, et les plats tomberaient à côté des jours de salle.
 */
const nextMonday = computed(() => {
  const dow = (new Date(props.todayIso + 'T00:00:00').getDay() + 6) % 7
  return dow === 0 ? props.todayIso : shiftIso(props.todayIso, 7 - dow)
})
const fmtDay = (iso: string) => `${iso.slice(8)}/${iso.slice(5, 7)}`
const launched = computed(() => appliedFrom.value === nextMonday.value)

function onRename() {
  const w = activeWeek.value
  if (!w || w.builtin) return
  const name = prompt('Nom de cette semaine', w.name)
  if (name) renameMenu(w.id, name)
}
function onRemove() {
  const w = activeWeek.value
  if (!w || w.builtin) return
  if (confirm(`Supprimer « ${w.name} » ? Les semaines livrées restent disponibles.`)) removeMenu(w.id)
}

// ─── 2. Courses ─────────────────────────────────────────────────────────────
const money = computed(() => cost(selectionShopping.value))
const totalLines = computed(() => selectionShopping.value.reduce((n, s) => n + s.lines.length, 0))
const doneLines = computed(() => selectionShopping.value
  .reduce((n, s) => n + s.lines.filter(l => isChecked(l.food.id)).length, 0))
const perDay = computed(() => costPerDay(money.value.total, Math.max(1, daysCovered.value)))

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

// ─── 3. Cuisine ─────────────────────────────────────────────────────────────
const leftInFridge = computed(() => Object.entries(stock.value)
  .filter(([, n]) => n > 0)
  .map(([id, n]) => ({ name: library.value.recipes[id]?.name ?? id, n })))
const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`)
</script>

<template>
  <div class="stack">
    <!-- Trois phrases, une fois pour toutes. Sans elles, l'écran demande de
         comprendre un modèle avant de pouvoir s'en servir — et on referme. -->
    <div class="card nu-how">
      <h4 class="nu-how-title">Comment ça marche</h4>
      <ol class="nu-how-list">
        <li><b>Tu règles UNE semaine</b> : ce que tu manges lundi, mardi… Elle se répète ensuite toute seule, tant que tu n'y touches pas.</li>
        <li><b>La liste de courses en sort</b> toute faite : les plats, mais aussi le petit-déjeuner et les collations, sans les jours où tu n'es pas là.</li>
        <li><b>Le dimanche, tu cuisines</b> tout ce qui tiendra jusqu'au jour où tu le mangeras. Ce qui ne tiendrait pas est repoussé au mercredi soir — l'appli te dit quoi, et dans quel ordre.</li>
      </ol>
    </div>

    <nav class="nu-steps">
      <button class="nu-step" :class="{ on: step === 'semaine' }" @click="step = 'semaine'">
        <span class="nu-step-n">1</span><span>Ma semaine</span>
      </button>
      <button class="nu-step" :class="{ on: step === 'courses' }" :disabled="!selectionSummary.portions" @click="step = 'courses'">
        <span class="nu-step-n">2</span><span>Courses</span>
        <span v-if="totalLines" class="nu-step-b mono">{{ doneLines }}/{{ totalLines }}</span>
      </button>
      <button class="nu-step" :class="{ on: step === 'cuisine' }" :disabled="!selectionSummary.portions" @click="step = 'cuisine'">
        <span class="nu-step-n">3</span><span>Cuisine</span>
      </button>
    </nav>

    <!-- ─── 1. Ma semaine ─────────────────────────────────────────────── -->
    <template v-if="step === 'semaine'">
      <div class="card nu-selsum">
        <div class="nu-selsum-main">
          <span class="nu-selsum-v mono">{{ daysCovered }}</span>
          <span class="nu-selsum-l">jour{{ daysCovered > 1 ? 's' : '' }} · {{ selectionSummary.portions }} portions à cuisiner</span>
        </div>
        <div class="muted">
          Une semaine type se répète tant que tu n'en changes pas. Modifie un jour, retire
          un week-end où tu n'es pas là : les courses et la cuisine suivent.
        </div>
        <button
          class="btn-primary" :class="{ done: launched }"
          @click="applyMenuFrom(nextMonday)"
        >
          {{ launched ? `✓ Lancée depuis lundi ${fmtDay(nextMonday)}` : `▶ Lancer à partir du lundi ${fmtDay(nextMonday)}` }}
        </button>
        <p class="muted center nu-launch-note">
          On cuisine le dimanche, mais la semaine démarre le <b>lundi</b> : c'est le premier
          jour où tu manges, pas le jour où tu prépares.
        </p>
      </div>

      <!-- Choix de la semaine. Les livrées sont en lecture seule : la première
           retouche en fait une copie, pour qu'on puisse toujours y revenir. -->
      <div class="card nu-weeks">
        <div class="section-label mb-8">Semaine appliquée</div>
        <div class="nu-week-chips">
          <button
            v-for="m in menus" :key="m.id"
            class="nu-week-chip" :class="{ on: m.id === activeWeek?.id }"
            @click="setActiveMenu(m.id)"
          >
            {{ m.name }}<span v-if="m.builtin" class="nu-week-lock">livrée</span>
          </button>
        </div>
        <div class="nav-row mt-6">
          <button class="btn" @click="duplicateMenu()">⧉ Dupliquer</button>
          <button class="btn" @click="blankMenu()">＋ Semaine vierge</button>
          <button class="btn" :disabled="activeWeek?.builtin" @click="onRename()">✎ Renommer</button>
          <button class="btn" :disabled="activeWeek?.builtin" @click="onRemove()">× Supprimer</button>
        </div>
        <p v-if="activeWeek?.builtin" class="nu-note mt-6">
          Semaine livrée avec le plan : elle reste intacte. Dès que tu changes un plat,
          une copie modifiable est créée — l'originale reste là pour y revenir.
        </p>
      </div>

      <div class="nu-week">
        <article v-for="d in days" :key="d.dow" class="card nu-day" :class="{ off: d.off }">
          <header class="nu-day-head">
            <span class="nu-day-name">{{ d.name }}</span>
            <span class="nu-day-tag mono" :class="{ gym: d.gym }">{{ d.gym ? 'salle' : 'repos' }}</span>
            <span v-if="!d.off && d.kcal" class="mono muted nu-day-kcal">{{ Math.round(d.kcal) }} kcal aux repas</span>
            <button class="nu-day-off" :class="{ on: d.off }" @click="toggleMenuDayOff(d.dow)">
              {{ d.off ? '↩ Je suis là' : '✈ Pas là' }}
            </button>
          </header>

          <p v-if="d.off" class="muted nu-day-empty">
            Rien de prévu : ni courses, ni portions à cuisiner pour ce jour.
          </p>
          <template v-else>
            <label v-for="s in d.main" :key="s.id" class="nu-mslot">
              <span class="nu-mslot-time mono">{{ s.time }}</span>
              <span class="nu-mslot-label">{{ s.label }}</span>
              <select
                class="nu-mslot-select"
                :value="slotRecipe(d.dow, s.id, s.recipe)"
                @change="setMenuSlot(d.dow, s.id, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">— rien ce jour-là —</option>
                <option v-for="r in optionsFor(s.id)" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
            </label>

            <!-- Petit-déjeuner et collations sont identiques presque tous les jours :
                 les afficher d'office noyait les deux seules lignes qu'on change
                 vraiment. Ils restent réglables, juste d'un cran plus loin. -->
            <button class="nu-day-more" @click="openDow = openDow === d.dow ? null : d.dow">
              {{ openDow === d.dow ? '▲ Masquer' : '▼ Petit-déjeuner et collations' }}
            </button>
            <template v-if="openDow === d.dow">
              <label v-for="s in d.others" :key="s.id" class="nu-mslot">
                <span class="nu-mslot-time mono">{{ s.time }}</span>
                <span class="nu-mslot-label">{{ s.label }}</span>
                <select
                  class="nu-mslot-select"
                  :value="slotRecipe(d.dow, s.id, s.recipe)"
                  @change="setMenuSlot(d.dow, s.id, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">— rien ce jour-là —</option>
                  <option v-for="r in optionsFor(s.id)" :key="r.id" :value="r.id">{{ r.name }}</option>
                </select>
              </label>
            </template>
          </template>
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
        Tout ce que la semaine mange est là : les plats, mais aussi le petit-déjeuner,
        les collations, le shaker et la créatine. Les jours où tu n'es pas là ne sont
        pas comptés, et un jour sans séance pèse moins de féculents.
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

    <!-- ─── 3. Cuisine ────────────────────────────────────────────────── -->
    <template v-else>
      <p class="nu-note">
        Une seule recette, du début à la fin. Les étapes sont dans l'ordre où on les
        fait et les quantités sont déjà additionnées : tu ne cuis pas le riz de
        quatre plats en quatre fois. Suis-les de haut en bas, tu finis avec tes
        boîtes prêtes.
      </p>

      <!-- La place au congélateur ne se devine pas, et elle change tout le
           programme : avec, une seule session suffit ; sans, il en faut deux. On
           demande donc, au lieu de supposer. -->
      <div class="card nu-freezer">
        <div class="section-label mb-8">Place au congélateur</div>
        <div class="nu-freezer-opts">
          <button class="nu-freezer-opt" :class="{ on: !freezer }" @click="setFreezer(false)">
            <b>Je n'ai pas la place</b>
            <span class="muted">Tout se garde au frigo. Deux sessions : dimanche, puis mercredi soir.</span>
          </button>
          <button class="nu-freezer-opt" :class="{ on: freezer }" @click="setFreezer(true)">
            <b>J'ai de la place</b>
            <span class="muted">Une seule session le dimanche. Les boîtes de fin de semaine sont congelées dès la fermeture.</span>
          </button>
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

      <section v-for="s in cookSessions" :key="s.id" class="card nu-cook" :class="s.id">
        <header class="nu-cook-head">
          <h4 class="nu-prep-title">{{ s.title }}</h4>
          <span v-if="s.minutes" class="nu-cook-min mono">≈ {{ fmtMin(s.minutes) }}</span>
        </header>
        <p class="muted nu-cook-when">{{ s.when }} · {{ s.dishes.reduce((n, d) => n + d.n, 0) }} portions</p>
        <p class="nu-note">{{ s.hint }}</p>

        <!-- Ce qu'on obtient à la fin : la liste des plats et pour quels jours.
             C'est le résultat, pas la marche à suivre — d'où sa place en tête. -->
        <div class="nu-cook-dishes">
          <div v-for="d in s.dishes" :key="d.recipeId" class="nu-cook-dish">
            <NutritionThumb :id="d.recipeId" :label="d.name" class="nu-cook-thumb" />
            <div class="nu-cook-dish-txt">
              <strong>{{ d.name }}<span v-if="d.frozen" class="nu-gel">congélateur</span></strong>
              <span class="muted">
                pour {{ listDays(d.days) }} ·
                {{ d.frozen ? 'congelé dès la fermeture' : `se garde ${d.keeps} jours au frigo` }}
              </span>
            </div>
            <span class="mono nu-cook-n">× {{ d.n }}</span>
          </div>
        </div>

        <!-- La seule façon de supprimer la session du mercredi. Personne n'y pense
             tout seul, et c'est pourtant le geste qui rend « je cuisine tout
             dimanche » réellement possible. -->
        <!-- Rappel discret, et seulement si ça change vraiment quelque chose : le
             jour où de la place se libère, cette session peut disparaître. -->
        <div v-if="s.freezable?.length" class="nu-freeze">
          <b>Si tu libères de la place au congélateur</b>,
          {{ s.freezable.reduce((n, d) => n + d.n, 0) }} de ces portions peuvent se cuisiner
          dimanche et se congeler dans la foulée —
          <template v-if="s.freezable.length === s.dishes.length">cette session disparaît alors complètement.</template>
          <template v-else>il ne resterait ici que {{ s.dishes.length - s.freezable.length }} plat(s).</template>
          <button class="btn nu-freeze-btn" @click="setFreezer(true)">J'ai de la place →</button>
        </div>

        <!-- Les ingrédients d'abord, la préparation ensuite : une recette se lit
             en deux temps, et chercher un poids ne doit pas obliger à relire une
             étape. -->
        <template v-if="s.ingredients.length">
          <div class="section-label nu-ing-head">Ingrédients — {{ s.dishes.reduce((n, d) => n + d.n, 0) }} portions</div>
          <p class="nu-note">
            Sors et pèse tout maintenant, avant d'allumer quoi que ce soit. Ce qui est
            marqué <b>cru</b> se pèse cru : c'est ce que la liste de courses annonce, et le
            seul repère qui ne bouge pas à la cuisson.
          </p>
          <ul class="nu-ing">
            <li v-for="i in s.ingredients" :key="i.foodId" class="nu-ing-l">
              <span class="nu-ing-q mono">{{ i.qty }}</span>
              <span class="nu-ing-n">
                {{ i.name }}<span v-if="i.raw" class="nu-ing-raw">cru</span>
                <span v-if="i.note" class="muted">{{ i.note }}</span>
              </span>
            </li>
          </ul>
        </template>

        <!-- La préparation. -->
        <div v-if="s.steps.length" class="section-label nu-ing-head">Préparation</div>
        <ol v-if="s.steps.length" class="nu-recipe">
          <li v-for="st in s.steps" :key="st.n" class="nu-rstep">
            <span class="nu-rstep-n mono">{{ st.n }}</span>
            <div class="nu-rstep-body">
              <h5 class="nu-rstep-title">{{ st.title }}</h5>
              <p class="nu-rstep-hint">{{ st.hint }}</p>
              <ul class="nu-rstep-lines">
                <li v-for="(l, i) in st.lines" :key="i">{{ l }}</li>
              </ul>
            </div>
          </li>
        </ol>
      </section>
    </template>
  </div>
</template>
