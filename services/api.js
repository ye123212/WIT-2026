(function attachApiHelpers(globalScope) {
  async function postRequest(endpoint, payload) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`POST ${endpoint} failed`);
    }

    return response.json();
  }

  globalScope.postRequest = postRequest;
})(window);
