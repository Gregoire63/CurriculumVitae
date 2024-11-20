<template>
  <div style="width: 100%; height: calc(100vh - 80px)">
    <model-viewer
      id="paused"
      animation-name="Animation"
      src="models/technical_difficulties.glb"
      disable-pan
      autoplay
      camera-controls
      ar
      class="model"
    >
      <div class="text">Impossible de trouver se que vous cherchez !</div>
      <div slot="poster">
        <div class="lds-ellipsis">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    </model-viewer>
  </div>
</template>
<script setup></script>
<style scoped>
.text {
  font-family: 'Tilt Wrap';
  font-weight: 600;
  font-size: 30px;
  text-align: center;
  margin-top: 40px;
}
.model {
  width: 100%;
  height: 100%;
}
.lds-ellipsis {
  display: inline-block;
  position: absolute;
  left: calc(50% - 40px);
  top: calc(50% - 40px);
  width: 80px;
  height: 80px;
}
.lds-ellipsis div {
  position: absolute;
  top: 33px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #fff;
  animation-timing-function: cubic-bezier(0, 1, 1, 0);
}
.lds-ellipsis div:nth-child(1) {
  left: 8px;
  animation: lds-ellipsis1 0.6s infinite;
}
.lds-ellipsis div:nth-child(2) {
  left: 8px;
  animation: lds-ellipsis2 0.6s infinite;
}
.lds-ellipsis div:nth-child(3) {
  left: 32px;
  animation: lds-ellipsis2 0.6s infinite;
}
.lds-ellipsis div:nth-child(4) {
  left: 56px;
  animation: lds-ellipsis3 0.6s infinite;
}
@keyframes lds-ellipsis1 {
  0% {
    transform: scale(0);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes lds-ellipsis3 {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(0);
  }
}
@keyframes lds-ellipsis2 {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(24px, 0);
  }
}
</style>
