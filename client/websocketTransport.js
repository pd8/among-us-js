class WebsocketTransport {
  name;
  url;
  onOpen;
  onClose;
  onMessage;
  socket;
  timeout = 1000;

  constructor({
    name,
    url,
    onOpen = () => {},
    onClose = () => {},
    onMessage = () => {},
  }) {
    this.name = name;
    this.url = url;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onMessage = onMessage;
    this.openSocket = this.openSocket.bind(this);
    this.socketIsOpen = this.socketIsOpen.bind(this);
    this.errorHandler = this.errorHandler.bind(this);
    this.openSocket();
  }

  openSocket() {
    const socket = new WebSocket(this.url);
    socket.onerror = this.errorHandler;
    socket.onopen = () => {
      console.info(`${this.name} Websocket connection established`);
      this.onOpen();
    };
    socket.onclose = () => {
      console.warn(
        `${this.name} Websocket closed unexpectedly, attempting to reopen...`
      );
      this.onClose();
      clearTimeout(this.timeout);
      this.timeout = setTimeout(this.openSocket, 1000);
    };
    socket.onmessage = (event) => {
      // console.info(JSON.parse(event.data));
      this.onMessage(event);
    };
    this.socket = socket;
  }

  close() {
    console.info(`${this.name} Websocket closed by client`);
    // Prevents race condition where the socket reopens from being closed previously
    clearTimeout(this.timeout);
    this.socket.onclose = null;
    this.socket.close();
  }

  errorHandler(error) {
    console.warn(
      `${this.name} Websocket on ${this.url} error: ${JSON.stringify(error)}`
    );
  }

  socketIsOpen() {
    return this.socket && this.socket.readyState === this.socket.OPEN;
  }

  send(event) {
    if (this.socketIsOpen()) {
      this.socket.send(event);
    }
  }
}
