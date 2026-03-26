<template>
  <div class="row justify-center q-pa-lg">
    <DCard style="width: 40rem">
      <div class="column items-center">
        <p class="introText">
          {{ $t('gateway.activateProIntro') }}
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
              {{ $t('gateway.activateProEnterKey') }}
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
              :label="$t('gateway.back')"
            />
            <d-submit-btn
              class="q-ma-sm"
              @click="methods.activatePro"
              :label="$t('gateway.activate')"
              :loading="loading"
            />
          </div>
        </form>
      </div>
    </DCard>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import securityService from 'src/services/security/index.service';

export default defineComponent({
  name: 'ActivatePro',
  setup() {
    const router = useRouter();
    const { t } = useI18n();

    const loading = ref(false);
    const errorInForm = ref('');
    const activationKey = ref('');
    const topAnchor = ref(null);

    const methods = {
      activatePro: async () => {
        loading.value = true;
        errorInForm.value = '';

        try {
          const key = activationKey.value.replace(/ /g, '');
          const result = await securityService.activatePro(key);

          if (result === true) {
            router.push({
              name: 'gateway_loading',
            });
          } else {
            errorInForm.value = t('gateway.invalidLicenseKey');
          }
        } catch (error) {
          errorInForm.value = t('gateway.invalidLicenseKey');
        } finally {
          loading.value = false;
        }
      },
    };

    return {
      loading,
      errorInForm,
      activationKey,
      topAnchor,
      methods,
    };
  },
});
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
