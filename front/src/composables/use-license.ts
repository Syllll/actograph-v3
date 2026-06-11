import { ILicense } from '@services/security/interface';
import { reactive, computed } from 'vue';

const sharedState = reactive({
  type: null as 'student' | 'license' | null,
  license: null as ILicense | null,
});

const isStudentAccess = computed(() => sharedState.type === 'student');
const isProfessionalAccess = computed(() => sharedState.type === 'license');

export const useLicense = () => {
  const methods = {
    setLicense(license: ILicense) {
      sharedState.license = license;
      sharedState.type = 'license';
    },
    setStudentAccess() {
      sharedState.license = null;
      sharedState.type = 'student';
    },
    clearAccess() {
      sharedState.license = null;
      sharedState.type = null;
    },
  };

  return {
    sharedState,
    methods,
    isStudentAccess,
    isProfessionalAccess,
  };
};
