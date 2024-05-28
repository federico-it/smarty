<template>
  <div id="nav">
    <div class="flex py-6 px-8 items-center gap-x-6 ">
      <a href="/">
        <div class="flex items-center gap-x-6">
      <img class="w-14 rounded-md" src="/images.png">
      <div class="flex flex-col">
      <span class=" text-lg font-bold uppercase italic">Smarty</span>
      <span class=" text-xs font-bold  italic">Smart Life Web App</span>
    </div>
    </div>
    </a>
    
    </div>
    <div v-if="!loginState" class="italic mb-6 font-semibold px-8">Benvenuto inserisci la tua mail e la tua password di Smart Life per iniziare.</div>
    <div >
    <el-form v-if="!loginState" :model="loginForm" :inline="false">
      <div class=" gap-x-2 justify-center sm:flex  px-8 flex flex-col sm:flex-row ">
      <el-form-item label="Email" size="medium">
        <el-input v-model="loginForm.username"></el-input>
      </el-form-item>
      <el-form-item  label="Password">
        <el-input type="password" v-model="loginForm.password"></el-input>
      </el-form-item>
      <el-form-item class="bottone">
        <el-button type="primary" @submit="login()" @click="login()">Login</el-button>
      </el-form-item>
    </div>

    </el-form>
    
    <template v-else>
      <div class="mb-6">
      <el-button type="default" @click="refreshDevices()">Aggiorna</el-button>
      <el-button type="default" @click="logout()">Esci</el-button>
    </div>
    </template>
    <div v-if="!loginState" class="text-[12px]">N.B. Funziona solamente se l'account è stato creato con mail e password. Gli accessi con Google o Apple non Funzionano!</div>
  </div>
  </div>
  <div id="devices">
    <div v-for="device in devicesSorted" :key="device.id">
      <el-card class="device" :style="device.data.online === false ? 'filter: opacity(0.65) grayscale(1);' : ''">
        <el-tooltip effect="light" :content="device.type" :offset="-20"
          :visible-arrow="false">
          <el-avatar :src="`/device_icons/${device.type}.png`" shape="square">
            <img src="/device_icons/default.png"/>
          </el-avatar>
        </el-tooltip>
        <span class="device-name">{{ device.name }}</span>
        <template v-if="device.type === 'scene'">
          <el-button type="default" circle size="large"
            class="trigger"
            @click="triggerScene(device);"
          ><i class="material-icons-round">play_arrow</i></el-button>
        </template>
        <template v-else>
          <el-button type="default" circle size="large"
            :class="device.data.state ? 'state-on' : 'state-off'"
            :disabled="!device.data.online"
            @click="toggleDevice(device);"
          ><i class="material-icons-round">{{ device.data.online ? 'power_settings_new' : 'cloud_off' }}</i></el-button>
        </template>
      </el-card>
    </div>
  </div>
  <div id="footer" class="absolute bottom-0 left-0 right-0 "><div class="mb-3 flex justify-center "><span class="uppercase mr-2">Smarty ©</span><span>{{ date }}&nbsp - &nbsp</span><span>Made with ❤️ by&nbsp;</span><a class="hover:text-sky-600 " target="_blank" href="https://federicomengascini.com">Federico</a></div></div>
</template>

<script>
export default {
  name: 'Home'
}
</script>

<script setup="" >
/* eslint-disable no-unused-vars */
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from "element-plus"

import tuya from '@/libs/tuya'
const year = new Date()
const date = `${year.getFullYear()}`;
const homeAssistantClient = new tuya.HomeAssistantClient(
  JSON.parse(localStorage.getItem('session'))
)

const loginState = ref(false)
const devices = ref([])

const devicesSorted = computed(() => {
  const order = { true: 0, undefined: 1, false: 2 }
  return devices.value.slice().sort((d1, d2) =>
    order[d1.data.online] > order[d2.data.online] ? 1 : -1
  )
})

const loginForm = ref({ username: '', password: '' })

onMounted(async () => {
  // TODO handle expired session
  loginState.value = !!homeAssistantClient.getSession()
  if (!loginState.value) {
    localStorage.clear()
  }
  devices.value = JSON.parse(localStorage.getItem('devices')) || []
})

const login = async () => {
  try {
    await homeAssistantClient.login(
      loginForm.value.username,
      loginForm.value.password
    )
    localStorage.setItem('session', JSON.stringify(homeAssistantClient.getSession()))
    loginState.value = true
    loginForm.value = { username: '', password: '' }
    refreshDevices()
  } catch (err) {
    ElMessage.error(`Oops, login error. (${err})`)
  }
}

const logout = () => {
  homeAssistantClient.dropSession()
  localStorage.clear()
  loginState.value = false
  loginForm.value = { username: '', password: '' }
  devices.value = []
}

const refreshDevices = async () => {
  // TODO handle expired session
  try {
    const discoveryResponse = await homeAssistantClient.deviceDiscovery()
    const discoveryDevices = discoveryResponse.payload.devices || []
    devices.value = discoveryDevices
    localStorage.setItem('devices', JSON.stringify(discoveryDevices))
  } catch (err) {
    ElMessage.error(`Oops, errore aggiornamento dispositivi. (${err})`)
  }
}

const toggleDevice = async (device) => {
  // TODO handle expired session
  // TODO change icon to el-icon-loading
  try {
    const newState = !device.data.state
    await homeAssistantClient.deviceControl(device.id, 'turnOnOff', newState)
    device.data.state = newState
  } catch (err) {
    ElMessage.error(`Oops, device control error. (${err})`)
  }
}

const triggerScene = async (device) => {
  // TODO handle expired session
  // TODO change icon to el-icon-loading
  try {
    await homeAssistantClient.deviceControl(device.id, 'turnOnOff', true)
  } catch (err) {
    ElMessage.error(`Oops, device control error. (${err})`)
  }
}
</script>
<style lang="postcss">
.el-form-item__content {
  @apply col-span-6 pr-0 sm:flex sm:pr-0;
}
.el-form-item{
  @apply grid grid-cols-8
}
.el-button{
  @apply col-span-3
}
.el-form-item__label{
  @apply col-span-2 justify-start
}
.bottone{
  @apply flex justify-center;
  .el-form-item__content{
    @apply pr-0 justify-center;
  }
}
</style>
<style scoped>
/*** iPhone and iOS Form Input Zoom Fixes ***/
/* Fix Input Zoom on devices older than iPhone 5: */
@media screen and (device-aspect-ratio: 2/3) {
    select, textarea, input[type="text"], input[type="password"],
    input[type="datetime"], input[type="datetime-local"],
    input[type="date"], input[type="month"], input[type="time"],
    input[type="week"], input[type="number"], input[type="email"],
    input[type="url"]{ font-size: 16px; }
}

/* Fix Input Zoom on iPhone 5, 5C, 5S, iPod Touch 5g */
@media screen and (device-aspect-ratio: 40/71) {
    select, textarea, input[type="text"], input[type="password"],
    input[type="datetime"], input[type="datetime-local"],
    input[type="date"], input[type="month"], input[type="time"],
    input[type="week"], input[type="number"], input[type="email"],
    input[type="url"]{ font-size: 16px; }
}

/* Fix Input Zoom on iPhone 6, iPhone 6s, iPhone 7  */
@media screen and (device-aspect-ratio: 375/667) {
    select, textarea, input[type="text"], input[type="password"],
    input[type="datetime"], input[type="datetime-local"],
    input[type="date"], input[type="month"], input[type="time"],
    input[type="week"], input[type="number"], input[type="email"], 
    input[type="tel"], input[type="url"]{ font-size: 16px; }
}

/* Fix Input Zoom on iPhone 6 Plus, iPhone 6s Plus, iPhone 7 Plus, iPhone 8, iPhone X, XS, XS Max  */
@media screen and (device-aspect-ratio: 9/16) {
    select, textarea, input[type="text"], input[type="password"],
    input[type="datetime"], input[type="datetime-local"],
    input[type="date"], input[type="month"], input[type="time"],
    input[type="week"], input[type="number"], input[type="email"],
    input[type="tel"], input[type="url"]{ font-size: 16px; }
}
#nav {
  margin: 0 auto;

}

.el-card.device {
  max-width: 800px;
  margin: 0 auto;
  margin-bottom: 16px;
}
.el-card.device :deep(.el-card__body) {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}
.el-card.device :deep(.el-card__body :last-child) {
  margin-left: auto;
}

.el-button.state-on:enabled {
  color: #f9f9f9;
  background-color: #7dd8ba;
}
.el-button.state-off:enabled {
  color: #a3a4a7;
  background-color: #f9f9f9;
}
.el-button.trigger:enabled {
  color: #f9f9f9;
  background-color: #9eabce;
}
.el-button.el-button--large {
  padding: 9px;
  font-size: 20px;
  line-height: 0px;
}

.el-avatar {
  background: transparent;
  margin-right: 16px;
}
</style>
