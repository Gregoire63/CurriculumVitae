<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useVault } from '~/composables/useVault'
import { detailLines, weekFor } from '~/lib/proposals'
import type { RawProposal } from '~/lib/proposals'
import { useNutrition } from '~/composables/useNutrition'

/**
 * Le connecteur, vu du téléphone.
 *
 * Trois états, dans cet ordre : pas de passkey → en poser un ; passkey mais pas de
 * session → se déverrouiller ; session → l'état du miroir et la boîte de réception
 * des propositions.
 *
 * Le point délicat est la validation. Une proposition n'est PAS un message : c'est
 * une écriture en attente sur des données qui pilotent des calories et une
 * progression. On montre donc la phrase, le détail brut, et on dit clairement
 * quand l'application ne sait pas l'appliquer toute seule — auquel cas le bouton
 * ne prétend rien faire, il note simplement que c'est réglé.
 */
const props = defineProps<{ snapshot: () => Record<string, unknown> }>()
const emit = defineEmits<{ flash: [msg: string] }>()

const v = useVault()
const bootstrap = ref('')
const showDetail = ref<string | null>(null)

onMounted(() => { void v.hydrate() })

const statut = computed(() => {
  if (!v.state.value.registered) return 'a-poser'
  return v.state.value.connected ? 'ouvert' : 'verrouille'
})

const miroirLabel = computed(() => {
  if (!v.mirrorAt.value) return 'jamais envoyé'
  const d = new Date(v.mirrorAt.value)
  const min = Math.round((Date.now() - d.getTime()) / 60000)
  if (min < 1) return 'à l’instant'
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  return h < 36 ? `il y a ${h} h` : `le ${d.toLocaleDateString('fr-FR')}`
})

const applicable = (p: RawProposal) => v.applicable(p)

/**
 * Une semaine se relit en TABLEAU, pas en liste de clés.
 *
 * Quatorze repas affichés en « jours[3].slots.dinner = din-poulet » ne se valident
 * pas : on ne peut pas voir d'un coup d'œil qu'un plat revient trois fois ou qu'un
 * jeudi soir est vide. Le nom du plat plutôt que son identifiant, pour la même
 * raison — c'est ce qu'il mangera, pas ce que la base stocke.
 */
const { library } = useNutrition()
const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const nomPlat = (id: string) => library.value.recipes[id]?.name ?? id
function semaine(p: RawProposal) {
  const w = weekFor(p, id => !!library.value.recipes[id])
  if (!w) return null
  return {
    lundi: w.lundi,
    nom: w.nom,
    lignes: w.jours.map((j, i) => ({
      jour: DOW[i],
      off: j.off,
      midi: j.slots.lunch ? nomPlat(j.slots.lunch) : '—',
      soir: j.slots.dinner ? nomPlat(j.slots.dinner) : '—',
    })),
  }
}

async function doRegister() {
  if (await v.register(bootstrap.value.trim())) {
    bootstrap.value = ''
    emit('flash', 'Passkey enregistré ✓')
    await v.push(props.snapshot, true)
  }
}
async function doLogin() {
  if (await v.login()) emit('flash', 'Déverrouillé ✓')
}
async function doPush() {
  emit('flash', (await v.push(props.snapshot, true)) ? 'Miroir envoyé ✓' : (v.error.value ?? 'Envoi impossible'))
}
async function doApply(p: RawProposal) {
  if (await v.apply(p)) { emit('flash', 'Appliqué ✓'); await v.push(props.snapshot, true) }
  else emit('flash', v.error.value ?? 'Échec')
}
async function doRefuse(p: RawProposal) {
  if (await v.resolve(p, 'refused')) emit('flash', 'Refusé')
}
</script>

<template>
  <div class="card">
    <div class="row-between mb-8">
      <div class="section-label">Connecteur Claude</div>
      <span class="muted" :class="{ 'export-warn': statut !== 'ouvert' }">
        {{ statut === 'ouvert' ? 'Déverrouillé' : statut === 'verrouille' ? 'Verrouillé' : 'Aucun passkey' }}
      </span>
    </div>

    <!-- 1. Poser le premier passkey -->
    <template v-if="statut === 'a-poser'">
      <p class="muted vt-txt">
        Pose ton passkey pour ouvrir le coffre. Il n’y en a qu’un, et une fois posé cette
        étape se ferme définitivement — le code de démarrage vient de tes variables Netlify.
      </p>
      <div v-if="!v.state.value.bootstrapReady" class="vt-warn">
        ⚠️ <b>NUXT_VAULT_BOOTSTRAP</b> n’est pas configuré côté serveur. Ajoute-le dans Netlify avant.
      </div>
      <template v-else>
        <input v-model="bootstrap" class="note-input mt-6" type="password" placeholder="Code de démarrage" autocomplete="off">
        <button class="btn-primary vt-go mt-6" :disabled="v.busy.value || !bootstrap.trim()" @click="doRegister">
          🔐 Enregistrer mon passkey
        </button>
      </template>
    </template>

    <!-- 2. Se déverrouiller -->
    <template v-else-if="statut === 'verrouille'">
      <p class="muted vt-txt">
        Cette page est publique. Déverrouille avec ton visage ou ton empreinte pour envoyer
        tes données au coffre et relever les propositions.
      </p>
      <button class="btn-primary vt-go mt-6" :disabled="v.busy.value" @click="doLogin">
        🔓 Déverrouiller
      </button>
    </template>

    <!-- 3. Ouvert -->
    <template v-else>
      <div class="row-between vt-row">
        <span class="muted">Miroir des données</span>
        <span class="mono">{{ miroirLabel }}</span>
      </div>
      <p class="muted vt-txt">
        C’est la copie que Claude lit depuis l’app sur ton téléphone. Elle sert aussi de
        sauvegarde : plus besoin d’exporter le JSON à la main.
      </p>
      <div class="nav-row mt-6">
        <button class="btn flex-1" :disabled="v.busy.value" @click="doPush">⬆ Envoyer maintenant</button>
        <button class="btn flex-1" @click="v.loadPending()">↻ Relever</button>
        <button class="btn flex-1" @click="v.logout()">Verrouiller</button>
      </div>

      <!-- Boîte de réception -->
      <div class="section-label mt-6">
        Propositions
        <span v-if="v.pendingCount.value" class="mono vt-count">{{ v.pendingCount.value }} en attente</span>
      </div>
      <p v-if="!v.pending.value.length" class="muted vt-txt">
        Rien en attente. Ce que Claude propose depuis une conversation atterrit ici, et
        <b>rien n’est écrit</b> avant que tu valides.
      </p>
      <div v-for="p in v.pending.value" :key="p.id" class="vt-prop">
        <div class="vt-p-sum">{{ p.summary }}</div>
        <div class="vt-p-meta mono muted">
          {{ p.action }} · {{ new Date(p.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) }}
        </div>
        <!-- Une semaine s'affiche d'office : c'est le contenu qu'on valide, pas un détail. -->
        <table v-if="semaine(p)" class="vt-week">
          <caption class="mono">{{ semaine(p)!.nom }} · à partir du {{ semaine(p)!.lundi }}</caption>
          <tr v-for="l in semaine(p)!.lignes" :key="l.jour" :class="{ off: l.off }">
            <th class="mono">{{ l.jour }}</th>
            <td v-if="l.off" colspan="2" class="vt-w-off">absent</td>
            <template v-else><td>{{ l.midi }}</td><td>{{ l.soir }}</td></template>
          </tr>
        </table>
        <button class="vt-p-toggle" @click="showDetail = showDetail === p.id ? null : p.id">
          {{ showDetail === p.id ? '▲ Masquer le détail' : '▼ Voir le détail' }}
        </button>
        <dl v-if="showDetail === p.id" class="vt-p-detail mono">
          <template v-for="l in detailLines(p)" :key="l.label">
            <dt>{{ l.label }}</dt><dd>{{ l.value }}</dd>
          </template>
        </dl>
        <p v-if="!applicable(p)" class="vt-p-manual">
          ✋ L’app ne sait pas appliquer ça toute seule — fais-le à la main, puis marque-le réglé.
        </p>
        <div class="nav-row">
          <button v-if="applicable(p)" class="btn-primary flex-1" @click="doApply(p)">Appliquer</button>
          <button class="btn flex-1" @click="doRefuse(p)">{{ applicable(p) ? 'Refuser' : 'Marquer réglé' }}</button>
        </div>
      </div>

      <div v-if="v.recent.value.length" class="vt-recent muted">
        Dernières décisions :
        <span v-for="r in v.recent.value" :key="r.id" class="vt-r">
          {{ r.status === 'applied' ? '✓' : '✕' }} {{ r.summary }}
        </span>
      </div>
    </template>

    <p v-if="v.error.value" class="vt-warn mt-6">{{ v.error.value }}</p>
  </div>
</template>
