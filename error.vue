<template>
  <NuxtLayout name="404">
      <section class="error_container">
        <div class="container">
          <div class="row"> 
            <div class="col-sm-12">
              <div class="col-sm-10 col-sm-offset-1  text-center">
                <div class="four_zero_four_bg">
                  <h1 class="text-center ">404</h1>
                </div>
                
                <div class="contant_box_404">
                  <h3 class="h2">
                    {{ frSelect?'Vous semblait perdu ':'Look like you\'re lost' }}
                  </h3>
                  
                  <p>{{ frSelect?'La page que vous cherchez n\'existe pas !':'The page you are looking for not avaible!' }}</p>
                  <button class="contact_button" @click="$router.push({ path: '/' })">
                    {{ frSelect?'Retour à l\'acceuil':'Go to Home' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
       </div>
    </section>
  </NuxtLayout>
</template>

<script setup>
import { SiteStore } from './stores/Site.js'
import { onMounted } from 'vue'

onMounted(() => {
  if(import.meta.client)
    SiteStore().setLangage(localStorage?.getItem('langage'))
})

const frSelect = computed(() => {
  return SiteStore().getLangage == 'fr'
})
</script>
  
<style scoped>
.error_container {
    text-align: center;
    align-content: center;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
}

.page_404  img{ width:100%;}

.four_zero_four_bg{
  background-image: url(/public/404.gif);
  height: 400px;
  background-position: center;
}
 
.four_zero_four_bg h1{
 font-size:80px;
}
 
.four_zero_four_bg h3{
  font-size:80px;
}

.contant_box_404{ margin-top:-50px;}
</style>