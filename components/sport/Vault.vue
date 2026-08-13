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
const showReset = ref(false)

/**
 * Le diagnostic du serveur, affiché tant que tout n'est pas en place.
 *
 * Une variable d'environnement oubliée se manifestait par « Aucun passkey » —
 * c'est-à-dire exactement ce qu'affiche une installation saine où l'on n'a encore
 * rien fait. On cherchait donc côté navigateur un problème qui était côté serveur.
 */
interface Health {
  pret: boolean
  env: Record<string, boolean>
  bootstrap?: { longueur: number, espaces_parasites: boolean }
  store: string
  driver: string
  miroir?: { pousse_le: string, seances: number, pesees: number } | null
  propositions_en_attente?: number
}
const health = ref<Health | null>(null)

onMounted(async () => {
  await v.hydrate()
  try { health.value = await $fetch<Health>('/api/vault/health') }
  catch { health.value = null }
})

const manquantes = computed(() =>
  Object.entries(health.value?.env ?? {}).filter(([, ok]) => !ok).map(([k]) => k))

async function doReset() {
  try {
    await $fetch('/api/auth/reset', { method: 'POST', body: { bootstrap: bootstrap.value.trim() } })
    bootstrap.value = ''
    showReset.value = false
    await v.refresh()
    emit('flash', 'Passkey effacé — tu peux en poser un nouveau')
  }
  catch { emit('flash', 'Code de démarrage invalide') }
}

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

/**
 * Un code refusé ne dit rien tout seul.
 *
 * « 403 » laisse chercher entre une faute de frappe, un remplissage automatique du
 * navigateur et un retour à la ligne collé dans la variable Netlify. Comparer les
 * deux LONGUEURS tranche en une seconde, et ne révèle rien du code.
 */
const indice = computed(() => {
  const b = health.value?.bootstrap
  if (!b || !b.longueur) return ''
  const tape = bootstrap.value.trim().length
  if (b.espaces_parasites) return `⚠️ La variable Netlify contient un espace ou un retour à la ligne parasite — retire-le.`
  if (!tape) return `Le serveur attend un code de ${b.longueur} caractères.`
  if (tape !== b.longueur) return `Tu tapes ${tape} caractères, le serveur en attend ${b.longueur}.`
  return `${tape} caractères des deux côtés : la longueur correspond.`
})

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

    <!-- Ce qui manque côté serveur, dit avant qu'on cherche ailleurs -->
    <div v-if="health && !health.pret" class="vt-warn">
      <b>Le serveur n'est pas prêt.</b>
      <template v-if="manquantes.length">
        Variables absentes dans Netlify : <b>{{ manquantes.join(', ') }}</b>.
      </template>
      <template v-if="health.store !== 'ok'">
        Stockage ({{ health.driver }}) : {{ health.store }}.
      </template>
    </div>

    <!-- Le serveur va bien mais n'a rien à lire.
         C'est le manque qui se diagnostique le plus mal : côté conversation, Claude
         dit « je n'ai pas accès à tes données », ce qui se lit comme une panne du
         connecteur. Vu d'ici, c'est un bouton à presser une fois. -->
    <div v-else-if="health && health.pret && health.miroir === null" class="vt-warn">
      <b>Le serveur est prêt, mais il n'a encore aucune donnée.</b>
      Tant que le miroir n'est pas envoyé, Claude répondra qu'il n'a rien à lire.
      Déverrouille et touche <b>⬆ Envoyer maintenant</b>.
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
        <p v-if="indice" class="muted vt-hint mono">{{ indice }}</p>
        <button class="btn-primary vt-go mt-6" :disabled="v.busy.value || !bootstrap.trim()" @click="doRegister">
          🔐 Enregistrer mon passkey
        </button>
        <p class="muted vt-txt">
          Tu n'as pas encore de passkey&nbsp;: <b>ton appareil va en créer un</b>. Après ce
          bouton, il te demandera ton visage, ton empreinte ou ton code de déverrouillage.
          Le champ ci-dessus n'est pas le passkey, c'est le code de démarrage de tes
          variables Netlify.
        </p>
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
      <!-- Le double des clés. Sans lui, un téléphone perdu ferme le coffre pour
           toujours : il n'y a qu'un passkey et rien ne sait le supprimer. -->
      <button class="vt-p-toggle mt-6" @click="showReset = !showReset">
        {{ showReset ? '▲ Annuler' : 'Téléphone perdu ? Reposer un passkey' }}
      </button>
      <template v-if="showReset">
        <p class="muted vt-txt">
          Efface le passkey enregistré pour pouvoir en poser un nouveau. Demande le code
          de démarrage de tes variables Netlify — c'est le même que la première fois.
        </p>
        <input v-model="bootstrap" class="note-input mt-6" type="password" placeholder="Code de démarrage" autocomplete="off">
        <button class="btn mt-6 vt-go" :disabled="!bootstrap.trim()" @click="doReset">🗝 Effacer le passkey</button>
      </template>

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
