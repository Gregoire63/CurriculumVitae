import { computed, onMounted, reactive, ref } from 'vue'
import { DEFAULT_LANGUAGE, usePortfolioStore } from '~/stores/portfolio'

/**
 * Langue de rendu d'une section montée en `Lazy… hydrate-on-visible`.
 *
 * « / » est prérendue en français. Si le visiteur est passé en anglais avant
 * qu'une section différée ne s'hydrate, le HTML reçu ne correspond plus au rendu
 * client : en production, Vue corrige alors les textes mais PAS les attributs
 * (alt, href, placeholder, download…), et la console signale l'écart.
 *
 * La section se rend donc d'abord dans la langue du HTML prérendu, puis bascule
 * sur la langue choisie juste après son montage — une mise à jour ordinaire, qui
 * corrige tout. `lang.isFrench` s'utilise comme `store.isFrench`, dans le script
 * comme dans le template.
 */
export function useLang() {
    const store = usePortfolioStore()
    const mounted = ref(false)
    onMounted(() => {
        mounted.value = true
    })
    const language = computed(() => (mounted.value ? store.language : DEFAULT_LANGUAGE))
    return reactive({
        language,
        isFrench: computed(() => language.value === 'fr'),
    })
}
