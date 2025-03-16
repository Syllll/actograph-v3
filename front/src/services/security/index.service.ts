import { api } from 'src/../lib-improba/boot/axios';
import httpUtils from '../utils/http.utils';
import { Router } from 'vue-router';
import { createDialog } from '@lib-improba/utils/dialog.utils';

const apiUrl = httpUtils.apiUrl();

export default {
  /** Say hi, used for testing if the server is running */
  async sayHi() {
    const response = await api().get(`${apiUrl}/security/say-hi`);

    return response.data;
  },
  /**
   * Get the local user name
   * For electron mode only
   * @returns {Promise<string>}
   */
  async getLocalUserName(): Promise<string> {
    const response = await api().get(
      `${apiUrl}/security/electron/local-user-name`
    );

    return response.data;
  },
  async activatePro(key: string) {
    const response = await api().post(
      `${apiUrl}/security/electron/activate-license`,
      {
        key,
      }
    );

    return response.data;
  },
  async activateStudent() {
    const response = await api().post(
      `${apiUrl}/security/electron/activate-student`
    );

    return response.data;
  },
  async electronDetermineAccessFirstStep(): Promise<{
    nextStep:
      | 'choose-access-type'
      | 'use-student-access'
      | 'use-license-access'
      | 'invalid-license';
    message?: string;
    key?: string;
  }> {
    const response = await api().post(
      `${apiUrl}/security/electron/determine-access`
    );

    return response.data;
  },
  async findEnabledLicense() {
    const response = await api().get(`${apiUrl}/security/enabled-license`);

    return response.data;
  },
};
