import { ILicense } from '@services/security/interface';
import { reactive } from 'vue';

const sharedState = reactive({
  type: null as 'student' | 'license' | null,
  license: null as ILicense | null,
});

export const useLicense = () => {
  const methods = {
    setLicense(license: ILicense | null) {
      sharedState.license = license;
    },
  };

  return { sharedState, methods };
};