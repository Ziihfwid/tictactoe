window.gameSocket = io();

window.gameSocket.on("connect_error", () => {
  window.dispatchEvent(new CustomEvent("socketError"));
});
