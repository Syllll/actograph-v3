<template>
    <div class="fit row justify-center items-start q-pt-xl">
        <DCard style="max-width: 60rem;">
            <div class="row justify-center items-center">
                <h1>Bienvenue sur l'application ActoGraph.
                </h1>
                <p> Veuillez choisir une version afin d'accéder à l'application.</p>
            </div>
            <div class="row justify-center q-col-gutter-md">
                <VersionCard class="col-6" title="Version étudiante" subtitle="Gratuite"
                    description="Cette version est gratuite et réservée aux étudiants opérant dans un contexte académique."
                    buttonLabel="Je suis étudiant" 
                    @click="() => $router.push({ name: 'user' })"
                    />
                <VersionCard class="col-6" title="Version professionnelle" subtitle="Sous licence : pro ou ultimate"
                    description="Cette version est complète et sécurisée. Elle est destinée à un usage professionnel."
                    buttonLabel="Je suis un pro" 
                    @click="() => $router.push({ name: 'gateway_activate-pro' })"
                    />
            </div>
        </DCard>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import EmptyLayout from '@lib-improba/components/layouts/empty/Index.vue';
import VersionCard from './_components/VersionCard.vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@lib-improba/composables/use-auth';

export default defineComponent({
    components: { EmptyLayout, VersionCard },
    setup() {
        const router = useRouter();
        const auth = useAuth(router);

        return {
            auth,
        };
    },
});
</script>
