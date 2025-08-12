(() => {
  self.addEventListener("install", (evt) => {
    console.log("V1 installing…");
  });

  self.addEventListener("activate", (event) => {
    console.log("V1 now ready to handle fetches!");
  });
  self.addEventListener("fetch", (event) => {
    console.log("doing a fetch to ", event.request.url);
  });
})();
