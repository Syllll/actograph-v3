export default {
  apiUrl(): string {
    // If electron is running, the api url is localhost:serverPort
    // The server port is retrieved from the main process
    if (process.env.MODE === 'electron') {
      // Get the server port from the url usin the window object
      const url = new URL(window.location.href);

      const serverPort = url.searchParams.get('serverPort');
      if (serverPort) {
        return `http://localhost:${serverPort}`;
      }

      throw new Error('http.utils:Server port not found');
    }

    let apiUrl = `${process.env.API_URL}`;
    if (!apiUrl) {
      const w = window as any;
      const s = self as any;
      apiUrl = !s.__IS_WORKER ? w.__API_URL : s.__API_URL;
    }

    return apiUrl;
  },
};
