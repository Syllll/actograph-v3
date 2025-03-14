
<template>
    <DCard>
        <q-card-section>
            <div class="text-h6">{{ title }}</div>
            <div class="text-subtitle2">{{ subtitle }}</div>
        </q-card-section>

        <q-card-section>
            <slot>{{ description }}</slot>
        </q-card-section>

        <q-separator />

        <q-card-actions class="row justify-center">
            <d-submit-btn @click="$emit('activate')">{{ buttonLabel }}</d-submit-btn>
        </q-card-actions>
    </DCard>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'VersionCard',
    props: {
        title: {
            type: String,
            required: true
        },
        subtitle: {
            type: String,
            default: ''
        },
        description: {
            type: String,
            default: ''
        },
        buttonLabel: {
            type: String,
            default: 'Activer'
        }
    },
    emits: ['activate']
});
</script>