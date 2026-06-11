import { createDialog } from '@lib-improba/utils/dialog.utils';
import { useLicense } from './use-license';
import securityService from '@services/security/index.service';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

export const useStartupLoading = () => {
  const license = useLicense();
  const router = useRouter();
  const { t } = useI18n();

  const methods = {
    processLoadingAtStartup: async () => {
      // We just started the application.
      // We need to check if there is an existing license on the pc
      // If there is, we need to use it to login with the correct user
      // If there is no license, we need to redirect to the choose-version page
      // and to create a new free license.

      const access = await securityService.electronDetermineAccessFirstStep();

      // Go to the choose-version page
      if (access.nextStep === 'choose-access-type') {
        router.push({
          name: 'gateway_choose-version',
        });
        return;
      }

      // A valid license is found
      else if (access.nextStep === 'use-license-access') {
        // Find current enabled license
        const licenseEntity = await securityService.findEnabledLicense();
        if (!licenseEntity) {
          await createDialog({
            title: t('startup.noEnabledLicenseTitle'),
            message: t('startup.noEnabledLicenseMessage'),
            persistent: true,
          });

          router.push({
            name: 'gateway_choose-version',
          });
          return;
        }

        license.methods.setLicense(licenseEntity);

        router.push({
          name: 'user',
        });
      }

      // A valid student access is found
      else if (access.nextStep === 'use-student-access') {
        license.methods.setStudentAccess();

        router.push({
          name: 'user',
        });
      } else if (access.nextStep === 'invalid-license') {
        await createDialog({
          title: t('startup.invalidLicenseTitle'),
          message: access.message,
          persistent: true,
        });

        router.push({
          name: 'gateway_choose-version',
        });
      }

      // No valid access is found
    },
  };

  return { methods };
};
