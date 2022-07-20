<script setup lang="ts">
import { ref } from 'vue'
defineProps({ msg: { type: String, default: 'hello' } })
const count = ref(0)
</script>

<template>
  <h1 v-once>{{ msg }}</h1>
  <p v-for="id in [0, 1, 2]" :key="id" v-memo="[id === 0, count]">
    <button type="button" @click="count++">count {{ id }}: {{ count }}</button>
  </p>
</template>