<template>
  <div class="carrousel-container">
    <input v-for="(item, index) in items" :key="index" type="radio" name="slider" :id="'item-' + (index + 1)" :checked="index === 0" @change="selected = index">
    <div class="carrousel-cards">
      <label v-for="(item, index) in items" :key="index" class="carrousel-card" :for="'item-' + (index + 1)" :id="'song-' + (index + 1)" :style="getCardStyle(index)">
        <video v-if="item.type === 'video'" :src="item.src" loop muted autoplay></video>
        <AdaptImage v-else :src="item.src" :alt="item.title"></AdaptImage>
        <div class="carrousel-title">{{ item.title }}</div>
      </label>
    </div>
  </div>
</template>
<script setup>
import { ref, computed } from 'vue';
import AdaptImage from "../adaptiveImage/AdaptImage.vue"
const props = defineProps(['items'])
const selected = ref(0)

const items = computed(()=>props.items)
const getCardStyle = (index) => {
  const totalItems = items.value.length;
  const prevIndex = (selected.value - 1 + totalItems) % totalItems;
  const nextIndex = (selected.value + 1) % totalItems;

  if (index === selected.value) {
    return {
      transform: 'translatex(0) scale(1)',
      opacity: 1,
      zIndex: 1
    };
  } else if (index === nextIndex) {
    return {
      transform: 'translatex(40%) scale(.8)',
      opacity: .4,
      zIndex: 0
    };
  } else if (index === prevIndex) {
    return {
      transform: 'translatex(-40%) scale(.8)',
      opacity: .4,
      zIndex: 0
    };
  } else {
    return {
      display: 'none'
    };
  }
}
</script>
<style scoped>

input[type=radio] {
  display: none;
}

.carrousel-card {
  position: absolute;
  width: 80%;
  height: 100%;
  left: 0;
  right: 0;
  margin: auto;
  transition: transform .4s ease;
  cursor: pointer;
  overflow: hidden;
}

.carrousel-container {
  width: 70%;
  max-height: 600px;
  margin: auto;
  height: 100%;
  transform-style: preserve-3d;
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
}

.carrousel-cards {
  position: relative;
  width: 100%;
  height: 100%;
  margin-bottom: 20px;
}

video {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  object-fit: contain;
}
.carrousel-title {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 14px;
}
@media (max-width: 800px) {

  .carrousel-container {
    max-height: 400px;
    height: 50%;
  }
}
</style>