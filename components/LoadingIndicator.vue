<template>
    <div class="loading_background">
      <div class="loading_background_left" id="loading_background_left">
        <svg
        version="1.0"
        xmlns="http://www.w3.org/2000/svg"
        width="240.000000pt"
        height="219.000000pt"
        viewBox="0 0 240.000000 219.000000"
        preserveAspectRatio="xMidYMid meet"
        class="g_letter"
      >
        <g
          transform="translate(0.000000,219.000000) scale(0.100000,-0.100000)"
          fill="#FFF"
          stroke="none"
        >
          <path
            d="M5 2178 c-3 -7 -4 -497 -3 -1088 l3 -1075 79 -3 79 -3 625 623 c344
          343 668 667 721 721 l95 98 -54 54 -54 55 -438 0 -439 0 3 -147 3 -148 173 -3
          c129 -2 172 -6 172 -15 0 -12 -632 -638 -651 -645 -5 -2 -8 261 -7 635 l3 638
          418 1 c230 1 421 4 424 8 4 4 -60 74 -142 156 l-150 150 -428 0 c-333 0 -429
          -3 -432 -12z"
            />
          </g>
        </svg>
      </div>
      <div class="loading_background_right" id="loading_background_right">
        <svg
          version="1.0"
          xmlns="http://www.w3.org/2000/svg"
          width="240.000000pt"
          height="219.000000pt"
          viewBox="0 0 240.000000 219.000000"
          preserveAspectRatio="xMidYMid meet"
          class="r_letter"
        >
          <g
            transform="translate(0.000000,219.000000) scale(0.100000,-0.100000)"
            fill="#FFF"
            stroke="none"
          >
            <path
              d="M1330 2183 c0 -5 162 -170 361 -369 316 -316 360 -364 351 -380 -6
          -11 -324 -331 -706 -713 -383 -381 -693 -697 -690 -702 3 -5 93 -9 200 -9 188
          1 195 2 221 24 16 13 138 135 273 271 135 135 253 251 264 257 16 9 56 -27
          300 -271 l282 -282 99 3 100 3 3 110 2 110 -275 275 c-151 151 -275 280 -275
          285 0 6 124 134 275 285 l275 274 0 96 0 95 -323 323 -322 322 -208 0 c-114 0
          -207 -3 -207 -7z"
            />
          </g>
        </svg>
      </div>
    </div>
</template>
<script setup>
import { onMounted } from 'vue';
onMounted(()=>{
  setTimeout(()=>{
    document.getElementById("loading_background_right").classList.toggle("right_disapear")
  },1000)
  setTimeout(()=>{
    document.getElementById("loading_background_left").classList.toggle("left_disapear")
  },1100)
})
</script>
<style scoped>
.loading_background{
    width: 100vw;
    height: 100dvh;
    position: fixed;
    pointer-events: none;
    z-index: 10;
    top: 0;
    right: 0;
}
.loading_background_left, .loading_background_right{
  pointer-events: all;
  width: 50%;
  height: 100%;
  position: absolute;
  transition: all 1.5s ease;
  overflow: visible;
  top: 0;
}
.loading_background_left{
  left: 0;
  background-color: var(--secondary);
}
.loading_background_right{
  background-color: var(--secondary_1);
  box-shadow: -10px 0 10px 1px rgba(0, 0, 0, 0.1);
  right: 0;
}
.left_disapear{
  transform: translateX(-140%);
}
.right_disapear{
  transform: translateX(140%);
}
.g_letter, .r_letter{
    position: absolute;
    top: 50%;
    transform: translateX(50%) translateY(-50%);
    width: 200px;
    z-index: 1;
}
.r_letter{
  left: -40%;
}
.g_letter{
  right: 0;
}
</style>