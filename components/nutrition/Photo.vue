<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { usePhotos } from '~/composables/usePhotos'
import { humanBytes } from '~/lib/photoSize'

// Bouton photo d'un plat, réutilisé dans la bibliothèque, la todo de cuisine et
// la journée. Une photo par plat : la nouvelle remplace l'ancienne.

const props = withDefaults(defineProps<{
  /** Identifiant du plat. C'est la clé de stockage. */
  id: string
  /** Nom affiché dans l'aperçu plein écran. */
  label?: string
  /** `sm` en ligne de liste, `md` en pastille de carte, `cover` en bandeau. */
  size?: 'sm' | 'md' | 'cover'
}>(), { label: '', size: 'sm' })

const { has, metaOf, put, remove, urlOf, busy, error } = usePhotos()

// Erreur LOCALE : `error` est partagée par le module, l'afficher directement
// ferait apparaître le message sous les vingt boutons photo de la liste à la fois.
const localErr = ref<string | null>(null)
const input = ref<HTMLInputElement | null>(null)
const thumb = ref<string | null>(null)
const fullUrl = ref<string | null>(null)
const open = ref(false)

const meta = computed(() => metaOf(props.id))
const loading = computed(() => busy.value === props.id)

/**
 * Illustration de repli, livrée avec l'appli : un plat sans photo affichait un
 * carré vide, et une bibliothèque de seize carrés vides ne donne envie de rien.
 * Ce sont des visuels flous et volontairement abstraits — ils situent le plat sans
 * prétendre le montrer. Ils disparaissent dès qu'une vraie photo est prise, et les
 * plats créés à la main n'en ont pas (le @error masque l'image manquante).
 */
const demo = ref<string | null>(`/plats-demo/${props.id}.webp`)
watch(() => props.id, (id) => { demo.value = `/plats-demo/${id}.webp` })
const shown = computed(() => thumb.value ?? demo.value)
const isDemo = computed(() => !thumb.value && !!demo.value)

async function refresh() {
  thumb.value = has(props.id) ? await urlOf(props.id, 'thumb') : null
}
watch(() => [props.id, meta.value?.at] as const, refresh, { immediate: true })

function pick() {
  // Volontairement SANS l'attribut `capture` : avec, le téléphone ouvre directement
  // l'appareil photo et interdit de choisir une image déjà prise. Sans, iOS et
  // Android proposent les deux — et le plat a souvent été photographié avant
  // qu'on pense à ouvrir l'appli.
  input.value?.click()
}

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  localErr.value = null
  if (file && !(await put(props.id, file))) localErr.value = error.value
  // Réinitialise la valeur : sans ça, reprendre le MÊME fichier ne déclenche
  // aucun événement `change` et la reprise d'une photo semble ne rien faire.
  if (input.value) input.value.value = ''
}

async function preview() {
  fullUrl.value = await urlOf(props.id, 'full')
  open.value = true
}

async function drop() {
  await remove(props.id)
  open.value = false
}

onUnmounted(() => { open.value = false })
</script>

<template>
  <div class="nu-photo" :class="size">
    <input ref="input" type="file" accept="image/jpeg,image/png,image/webp" class="nu-photo-input" @change="onFile">

    <button
      v-if="shown"
      class="nu-photo-thumb" :class="{ demo: isDemo }"
      :title="isDemo ? `Illustration — touche pour photographier ${label}` : `Photo — ${meta?.at.replace('T', ' à ')}`"
      @click="isDemo ? pick() : preview()"
    >
      <img :src="shown" alt="" loading="lazy" @error="demo = null">
      <span v-if="isDemo" class="nu-photo-badge">📷</span>
      <span v-if="loading" class="nu-photo-badge">…</span>
    </button>
    <button v-else class="nu-photo-add" :disabled="loading" :title="`Ajouter une photo${label ? ` — ${label}` : ''}`" @click="pick">
      {{ loading ? '…' : '📷' }}
    </button>

    <!-- Aperçu plein format + actions. Les blobs pleins ne sont chargés qu'ici :
         la liste ne décode que des vignettes de 192 px. -->
    <Teleport to="body">
      <div v-if="open" class="sport-app sport-portal">
        <div class="nu-photo-overlay" @click.self="open = false">
          <div class="nu-photo-box">
            <img v-if="fullUrl" :src="fullUrl" :alt="label">
            <div class="nu-photo-meta">
              <div>
                <div class="nu-photo-name">{{ label || 'Plat' }}</div>
                <div class="mono">
                  {{ meta?.at.replace('T', ' à ') }} · {{ meta ? `${meta.w}×${meta.h}` : '' }}
                  · {{ meta ? humanBytes(meta.bytes) : '' }}
                </div>
              </div>
              <div class="nu-photo-acts">
                <button class="btn" :disabled="loading" @click="pick">Remplacer</button>
                <button class="btn ghost danger" @click="drop">Supprimer</button>
                <button class="btn ghost" @click="open = false">Fermer</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <p v-if="localErr" class="nu-photo-err">{{ localErr }}</p>
  </div>
</template>
