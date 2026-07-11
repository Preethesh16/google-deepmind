/* Orbit demo workspace state, persisted in localStorage so the founder can
   leave and continue where they left off. Shared by workflow.html and demo.html.
   Shape:
     { founder: {name, email, brand, category, idea, mode, cost},
       progress: <index of next step to run, 0-based over the step list> } */
const OrbitStore = (() => {
  const KEY = "orbit.workspace";

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || null;
    } catch {
      return null;
    }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function reset() {
    localStorage.removeItem(KEY);
  }

  function maskEmail(email) {
    const [user, domain] = email.split("@");
    return user.slice(0, 3) + "•••@" + domain;
  }

  return { load, save, reset, maskEmail };
})();
