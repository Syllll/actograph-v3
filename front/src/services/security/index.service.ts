import { api } from 'src/../lib-improba/boot/axios';
import httpUtils from '../utils/http.utils';

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
  async getLocalUserName() {
    const response = await api().get(`${apiUrl}/security/local-user-name`);

    return response.data;
  },
  async activatePro(key: string) {
    const response = await api().post(`${apiUrl}/security/activate-license`, {
      key,
    });

    return response.data;
  },
}