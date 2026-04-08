declare module 'qz-tray' {
  interface ConnectOptions {
    host?: string | string[];
    port?: { secure: number | number[]; insecure: number | number[] };
    usingSecure?: boolean;
    retries?: number;
    delay?: number;
  }

  interface CertificateOptions {
    rejectOnFailure?: boolean;
  }

  interface PrintData {
    type: 'pixel' | 'raw';
    format?: 'image' | 'pdf' | 'html' | 'command';
    flavor?: 'base64' | 'file' | 'plain';
    data: string;
    options?: Record<string, unknown>;
  }

  interface PrintConfig {
    printer: string;
  }

  const websocket: {
    connect(options?: ConnectOptions): Promise<void>;
    disconnect(): Promise<void>;
    isActive(): boolean;
  };

  const printers: {
    getDefault(): Promise<string>;
    find(query?: string): Promise<string | string[]>;
  };

  const configs: {
    create(printer: string, options?: Record<string, unknown>): PrintConfig;
  };

  const security: {
    setCertificatePromise(
      promiseHandler:
        | Promise<string>
        | (() => Promise<string>)
        | ((resolve: (certificate: string) => void, reject: (error?: unknown) => void) => void),
      options?: CertificateOptions,
    ): void;
    setSignaturePromise(
      promiseFactory:
        | ((dataToSign: string) => Promise<string>)
        | ((dataToSign: string) => (resolve: (signature: string) => void, reject: (error?: unknown) => void) => void),
    ): void;
    setSignatureAlgorithm(algorithm: 'SHA1' | 'SHA256' | 'SHA512'): void;
  };

  function print(config: PrintConfig, data: PrintData[]): Promise<void>;

  export { websocket, printers, configs, security, print };
}
