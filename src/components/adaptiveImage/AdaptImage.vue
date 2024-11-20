<template>
  <picture>
    <source type="image/png" :srcset="getSrcSet('png')" />
    <source type="image/webp" :srcset="getSrcSet('webp')" />
    <img
      :src="defaultSrc"
      :srcset="getDefaultSrcSet()"
      :sizes="sizes"
      loading="lazy"
      decoding="async"
      style="width: 100%; aspect-ratio: 16/9"
    />
  </picture>
</template>

<script setup>
const props = defineProps(['src'])

const getSrcSet = (format) => {
  return `/${props.src}.${format}?width=100 100w, /${props.src}.${format}`
}

const getDefaultSrcSet = () => {
  return `/${props.src}.png?width=100 100w, /${props.src}.png`
}

const defaultSrc = `/${props.src}.png`
const sizes = '(max-width: 900px) 100vw, 50vw'
</script>
