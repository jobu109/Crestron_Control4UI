// Decoder for the framed JSON transport already used by the Control4_Crestron
// gateway (wire version 1). The processor splits one JSON document into
// <=255-byte frames:
//   {"w":1,"r":<room>,"k":"<stream>","e":"<16 hex snapshot>","p":<page>,"n":<count>,"d":"<base64 part>"}
// The panel collects every page of one snapshot, joins the base64 parts and
// parses the result. A new snapshot id replaces the old one.

export interface WireFrame {
  w: number;
  r: number;
  k: string;
  e: string;
  p: number;
  n: number;
  d: string;
}

export type AcceptResult<T> =
  | { status: 'ignored' }
  | { status: 'partial'; requestPage: number | null }
  | { status: 'complete'; document: T };

const MAX_DOCUMENT_BYTES = 262144;
const MAX_FRAMES = 2200;

export class FrameCollector<T = unknown> {
  private epoch: string | null = null;
  private parts = new Map<number, string>();
  private count = 0;
  private pending: number | null = null;
  private complete = false;
  private retired = new Set<string>();

  constructor(readonly room: number, readonly stream: string) {}

  /** Feed one raw serial value. Throws on malformed or conflicting frames. */
  accept(raw: string | WireFrame): AcceptResult<T> {
    const frame = typeof raw === 'string' ? (JSON.parse(raw) as WireFrame) : raw;
    if (frame.r !== this.room || frame.k !== this.stream || this.retired.has(frame.e)) {
      return { status: 'ignored' };
    }
    validate(frame);
    if (frame.e !== this.epoch) {
      if (this.epoch) this.retire(this.epoch);
      this.reset();
      this.epoch = frame.e;
      this.count = frame.n;
    }
    if (frame.n !== this.count) throw new Error('Inconsistent frame count');
    if (this.complete) return { status: 'ignored' };
    const existing = this.parts.get(frame.p);
    if (existing !== undefined && existing !== frame.d) throw new Error('Conflicting frame');
    this.parts.set(frame.p, frame.d);
    if (this.pending === frame.p) this.pending = null;

    for (let i = 1; i <= this.count; i++) {
      if (!this.parts.has(i)) {
        const requestPage = this.pending === i ? null : i;
        this.pending = i;
        return { status: 'partial', requestPage };
      }
    }
    let text = '';
    for (let i = 1; i <= this.count; i++) text += this.parts.get(i);
    const bytes = base64ToBytes(text);
    if (bytes.length > MAX_DOCUMENT_BYTES) throw new Error('Document too large');
    const document = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as T;
    this.complete = true;
    return { status: 'complete', document };
  }

  private reset(): void {
    this.epoch = null;
    this.parts.clear();
    this.count = 0;
    this.pending = null;
    this.complete = false;
  }

  private retire(epoch: string): void {
    this.retired.add(epoch);
    if (this.retired.size > 32) {
      const oldest = this.retired.values().next().value;
      if (oldest !== undefined) this.retired.delete(oldest);
    }
  }
}

function validate(f: WireFrame): void {
  const ok =
    f.w === 1 &&
    Number.isInteger(f.p) && Number.isInteger(f.n) &&
    f.p >= 1 && f.n >= 1 && f.p <= f.n && f.n <= MAX_FRAMES &&
    typeof f.e === 'string' && /^[a-f0-9]{16}$/.test(f.e) &&
    typeof f.d === 'string' && f.d.length <= 160 && /^[A-Za-z0-9+/]*={0,2}$/.test(f.d);
  if (!ok) throw new Error('Invalid frame');
}

function base64ToBytes(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Encoder used by tests and the mock processor; mirrors the C# framing. */
export function encodeFrames(room: number, stream: string, epoch: string, document: unknown, partSize = 160): string[] {
  const bytes = new TextEncoder().encode(JSON.stringify(document));
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  const base64 = btoa(binary);
  const parts: string[] = [];
  for (let i = 0; i < base64.length; i += partSize) parts.push(base64.slice(i, i + partSize));
  if (parts.length === 0) parts.push('');
  return parts.map((d, index) =>
    JSON.stringify({ w: 1, r: room, k: stream, e: epoch, p: index + 1, n: parts.length, d })
  );
}
