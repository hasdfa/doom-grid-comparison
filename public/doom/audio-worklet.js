
class DoomAudio extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.offset = 0;
    this.played = 0;
    this.calls = 0;
    this.link = null;
    this.port.onmessage = (event) => {
      this.link = event.data;
      this.link.onmessage = (message) => this.queue.push(message.data);
    };
  }
  process(_inputs, outputs) {
    const out = outputs[0];
    const length = out[0].length;
    let i = 0;
    while (i < length && this.queue.length > 0) {
      const chunk = this.queue[0];
      const size = chunk[0].length;
      const take = Math.min(length - i, size - this.offset);
      for (let c = 0; c < out.length; c++) {
        out[c].set((chunk[c] ?? chunk[0]).subarray(this.offset, this.offset + take), i);
      }
      i += take;
      this.offset += take;
      this.played += take;
      if (this.offset >= size) {
        this.queue.shift();
        this.offset = 0;
      }
    }
    if (this.link && ++this.calls % 4 === 0) {
      this.link.postMessage(this.played);
    }
    return true;
  }
}
registerProcessor("doom-audio", DoomAudio);
