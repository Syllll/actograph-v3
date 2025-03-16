<template>
  <div class="row justify-center q-pa-lg">
    <DCard style="width: 40rem">
      <div class="column items-center">
        <p class="introText">
          Lors de l'achat de votre licence, vous avez reçu une clé de licence
          par email. Cette clé vous permet de profiter de l'ensemble des
          fonctionnalités de l'application.
        </p>

        <div ref="topAnchor"></div>

        <transition
          enter-active-class="animated bounceInLeft"
          leave-active-class="animated bounceOutRight"
          appear
        >
          <q-banner class="bg-danger" color="primary" v-if="errorInForm !== ''">
            {{ errorInForm }}
          </q-banner>
        </transition>
        <br />

        <form>
          <div class="text-center column items-center">
            <p class="text-bold" style="font-size: 1.2em; line-height: 1.1em">
              Veuillez saisir votre clé de licence
            </p>
            <q-input
              v-model="activationKey"
              mask="xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx"
              fill-mask="*"
              class="mask"
              outlined
              :disable="loading"
            />
          </div>

          <br />

          <div class="my-step-nav row justify-center">
            <d-btn
              class="q-ma-sm"
              @click="$router.back()"
              icon="chevron_left"
              :label="'Retour'"
            />
            <d-submit-btn
              class="q-ma-sm"
              @click="activatePro"
              :label="'Activer'"
              :loading="loading"
            />
          </div>
        </form>
      </div>
    </DCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import securityService from 'src/services/security/index.service';
import { useRouter } from 'vue-router';

const router = useRouter();

const { t } = useI18n();

// Reactive state
const loading = ref(false);
const errorInForm = ref('');
const activationKey = ref('');
const topAnchor = ref(null);

// Methods
const activatePro = async () => {
  loading.value = true;
  errorInForm.value = '';

  let result = false;

  try {
    const key = activationKey.value.replace(/ /g, '');
    result = await securityService.activatePro(key);

    if (result === true) {
      router.push({
        name: 'gateway_loading',
      });
    } else {
      errorInForm.value = 'Clé de licence invalide';
    }
  } catch (error) {
    errorInForm.value = 'Clé de licence invalide';
  }

  if (result === true) {
    router.push({
      name: 'user',
    });
  }

  loading.value = false;
};

</script>

<style scoped lang="scss">
.mask {
  width: 30em;

  &:deep() {
    .q-field__native {
      text-align: center;
      font-size: 1.3em;
      line-height: 1em;

      /* @media (max-width: $breakpoint-sm) {
        font-size: 0.8em;
        width: 22em;
      } */
    }
  }
}

.introText {
  max-width: 30rem;
  text-align: center;
}
</style>
