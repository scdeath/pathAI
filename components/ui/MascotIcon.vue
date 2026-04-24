<template>
  <!-- Mascota KoraChile: buho brujula -->
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
    <defs>
      <linearGradient :id="gradId" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#1A73E8"/>
        <stop offset="100%" stop-color="#0891b2"/>
      </linearGradient>
      <radialGradient :id="cheekId" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stop-color="#fca5a5" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#fca5a5" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <!-- cuerpo redondo -->
    <circle cx="20" cy="20" r="18" :fill="`url(#${gradId})`"/>

    <!-- orejas -->
    <path d="M7 11 L10 5 L14 10 Z" :fill="`url(#${gradId})`" />
    <path d="M33 11 L30 5 L26 10 Z" :fill="`url(#${gradId})`" />

    <!-- cara interna -->
    <ellipse cx="20" cy="22" rx="12" ry="11" fill="#ffffff" fill-opacity="0.95"/>

    <!-- ojos -->
    <circle cx="15" cy="19" r="3.2" fill="#0f172a"/>
    <circle cx="25" cy="19" r="3.2" fill="#0f172a"/>
    <circle cx="16" cy="18" r="1.1" fill="#ffffff"/>
    <circle cx="26" cy="18" r="1.1" fill="#ffffff"/>

    <!-- pico (brujula) -->
    <polygon points="20,22 18,25 22,25" fill="#f59e0b"/>
    <polygon points="20,28 18,25 22,25" fill="#d97706"/>

    <!-- mejillas -->
    <circle cx="12" cy="24" r="2" :fill="`url(#${cheekId})`"/>
    <circle cx="28" cy="24" r="2" :fill="`url(#${cheekId})`"/>
  </svg>
</template>

<script setup lang="ts">
import { useId } from 'vue'

// ID estable entre SSR/cliente para evitar hydration mismatch.
const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
const gradId = `mascot-grad-${uid}`
const cheekId = `mascot-cheek-${uid}`
</script>
