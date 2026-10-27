/** FIFO queue backed by a singly linked list. All public operations are O(1). */
export class Queue {
  #head = null;
  #tail = null;
  #length = 0;

  enqueue(value) {
    const node = { value, next: null };
    if (this.#tail === null) {
      this.#head = node;
      this.#tail = node;
    } else {
      this.#tail.next = node;
      this.#tail = node;
    }
    this.#length += 1;
    return this.#length;
  }

  dequeue() {
    if (this.#head === null) return undefined;

    const value = this.#head.value;
    this.#head = this.#head.next;
    this.#length -= 1;
    if (this.#head === null) this.#tail = null;
    return value;
  }

  peek() {
    return this.#head === null ? undefined : this.#head.value;
  }

  get size() {
    return this.#length;
  }
}
