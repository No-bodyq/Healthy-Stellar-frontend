declare global {
  interface Window {
    freighter?: {
      isConnected: () => Promise<boolean>;
      getPublicKey: () => Promise<string>;
      getNetwork: () => Promise<string>;
      signTransaction: (xdr: string, opts: object) => Promise<string>;
    };
    albedo?: {
      publicKey: (opts: object) => Promise<{ pubkey: string }>;
    };
  }
}

export {};
