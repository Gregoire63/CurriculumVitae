<template>
  <picture>
    <source type="image/webp" :srcset="getSrcSet()" />
    <img
      :src="props.src"
      :srcset="getSrcSet()"
      loading="lazy"
      decoding="async"
      :alt="props.alt"
      style="width: 100%;
      height: 100%;
      border-radius: 10px;
      object-fit: contain;"
    />
  </picture>
</template>

<script setup>
const props = defineProps(['src', 'alt'])

const getSrcSet = () => {
  return `${props.src}?width=100 100w, ${props.src}`
}

</script>
